#!/bin/sh
# scripts/docker-entrypoint-wrapper.sh
# Runs INSIDE the sunext-db container as the docker entrypoint.
#
# Cloud Supabase's postgres image (supabase/postgres:15.6.1.142) has its
# own docker-entrypoint.sh which runs /docker-entrypoint-initdb.d/migrate.sh
# on first start. migrate.sh assumes POSTGRES_USER=supabase_admin (the
# bootstrap superuser) and creates the `postgres` role + runs the
# init-scripts/*.sql + migrations/*.sql that ship with the image.
#
# Our 13 SQL files (supabase/migrations/0001-0013.sql + seed-users.sql +
# seed.sql) must run AFTER Cloud's init so they see the Cloud-loaded
# state (auth schema, pre-created roles, supabase_realtime publication,
# etc).
#
# Flow:
#   1. Start Cloud's docker-entrypoint.sh in the BACKGROUND so postgres
#      boots (migrate.sh runs once during first start, then postgres
#      listens normally).
#   2. Wait until postgres accepts connections as supabase_admin.
#   3. Apply each of our SQL files in lex order via psql (as
#      supabase_admin — superuser, BYPASSRLS, owns the schemas).
#   4. Set passwords on supabase_auth_admin + authenticator (Cloud's
#      migrate.sh only sets supabase_admin).
#   5. Append `listen_addresses = '*'` to the data dir's postgresql.conf
#      and RESTART postgres (SIGHUP / pg_reload_conf doesn't apply to
#      listen_addresses — it requires a full restart).
#   6. Wait on the postgres background process so the container stays up.
#
# On second+ starts (volume already initialized), Cloud's entrypoint
# skips the init phase ("Database directory appears to contain a
# database; Skipping initialization") and step 3 is the only work. Our
# migrations use CREATE ... IF NOT EXISTS / DO $$ guard blocks /
# `on conflict (id) do nothing` / drop-policy-then-create so re-runs
# are safe.

set -eu

# Cloud's pg_hba.conf uses scram-sha-256 for supabase_admin on local
# connections. migrate.sh sets the password to $POSTGRES_PASSWORD. Our
# compose passes POSTGRES_PASSWORD=postgres, so we set PGPASSWORD here.
export PGPASSWORD="${POSTGRES_PASSWORD:-postgres}"

CLOUD_ENTRYPOINT="/usr/local/bin/docker-entrypoint.sh"
INIT_DIR="/tmp/sunext-initdb"

if [ ! -x "${CLOUD_ENTRYPOINT}" ]; then
    echo "[entrypointwrapper] FATAL: ${CLOUD_ENTRYPOINT} not found — image is not supabase/postgres"
    exit 1
fi

if [ ! -d "${INIT_DIR}" ]; then
    echo "[entrypointwrapper] FATAL: ${INIT_DIR} not mounted — db-sync.js must populate it"
    exit 1
fi

# Start postgres in the background so we can apply migrations after init.
echo "[entrypointwrapper] starting postgres via ${CLOUD_ENTRYPOINT} $*"
"${CLOUD_ENTRYPOINT}" "$@" &
PG_PID=$!

# Wait for postgres to accept connections (max 90s).
echo "[entrypointwrapper] waiting for postgres to accept connections"
for i in $(seq 1 90); do
    if pg_isready -U supabase_admin -d postgres >/dev/null 2>&1; then
        echo "[entrypointwrapper] postgres ready after ${i}s"
        break
    fi
    sleep 1
done

if ! pg_isready -U supabase_admin -d postgres >/dev/null 2>&1; then
    echo "[entrypointwrapper] FATAL: postgres did not become ready in 90s"
    kill "${PG_PID}" 2>/dev/null || true
    exit 1
fi

# Apply our migrations in lex order (db-sync.js writes 0001-0013.sql
# + seed-users.sql + seed.sql to /tmp/sunext-initdb). Use
# supabase_admin (the bootstrap superuser) so we can create roles,
# schemas, and bypass RLS during init.
echo "[entrypointwrapper] applying our migrations from ${INIT_DIR}"
for f in "${INIT_DIR}"/*.sql; do
    if [ -f "${f}" ]; then
        echo "[entrypointwrapper] psql -f ${f}"
        if ! psql -v ON_ERROR_STOP=1 -U supabase_admin -d postgres -f "${f}"; then
            echo "[entrypointwrapper] FATAL: ${f} failed"
            kill "${PG_PID}" 2>/dev/null || true
            exit 1
        fi
    fi
done
echo "[entrypointwrapper] all migrations applied"

# Cloud's migrate.sh only sets a password on `supabase_admin`; the
# roles used by GoTrue (supabase_auth_admin), PostgREST (authenticator),
# and Realtime's per-tenant CDC (postgres) have no password by default.
# Set them here so they can authenticate via scram-sha-256.
#
# `postgres` is the user the postgres_cdc_rls extension's `db_user`
# setting in public.extensions connects as. Realtime's per-tenant CDC
# fails repeatedly with "UnableToConnectToProject" until that password
# matches PGPASSWORD — without this ALTER, the CDC replication slot
# never gets a working connection and postgres_changes broadcasts are
# silently dropped.
echo "[entrypointwrapper] setting supabase_auth_admin + authenticator + postgres passwords"
psql -v ON_ERROR_STOP=1 -U supabase_admin -d postgres <<EOSQL || { echo "[entrypointwrapper] FATAL: role password set failed"; kill "${PG_PID}" 2>/dev/null || true; exit 1; }
ALTER USER supabase_auth_admin WITH PASSWORD '${PGPASSWORD}';
ALTER USER authenticator       WITH PASSWORD '${PGPASSWORD}';
ALTER USER postgres            WITH PASSWORD '${PGPASSWORD}';
EOSQL

# Cloud's image starts postgres with `listen_addresses` defaulting to
# 'localhost' (the initdb-generated /var/lib/postgresql/data/postgresql.conf
# has it commented out, and Cloud's /etc/postgresql/postgresql.conf is
# not loaded by the running postgres — it lives in /etc for tooling
# reference but isn't on the include path). That means cross-container
# clients (gotrue, realtime, meta, rest) can't reach the DB over the
# docker network — they get "connection refused" on db:5432.
#
# Fix: append `listen_addresses = '*'` to the data dir's
# postgresql.conf then RESTART postgres. listen_addresses requires a
# full restart (pg_reload_conf reports "cannot be changed without
# restarting the server"). Use pg_ctl via su postgres (pg_ctl refuses
# to run as root, and Cloud's docker-entrypoint.sh drops privileges
# via gosu before starting postgres).
PG_CONF="/var/lib/postgresql/data/postgresql.conf"
if ! grep -qE "^[[:space:]]*listen_addresses[[:space:]]*=" "${PG_CONF}"; then
    echo "listen_addresses = '*'" >> "${PG_CONF}"
    echo "[entrypointwrapper] appended listen_addresses='*' to ${PG_CONF}"
else
    sed -i.bak -E "s|^[[:space:]]*#?[[:space:]]*listen_addresses[[:space:]]*=.*|listen_addresses = '*'|" "${PG_CONF}"
    echo "[entrypointwrapper] updated listen_addresses='*' in ${PG_CONF}"
fi
chown postgres:postgres "${PG_CONF}"

echo "[entrypointwrapper] restarting postgres with listen_addresses='*'"
su postgres -c "pg_ctl -D /var/lib/postgresql/data -m fast restart -w" || {
    echo "[entrypointwrapper] FATAL: pg_ctl restart failed"
    kill "${PG_PID}" 2>/dev/null || true
    exit 1
}

# After pg_ctl restart, the original PG_PID is gone — pg_ctl forked a
# new postgres process that's now an orphan (its parent is init). The
# `wait` below would return immediately because the original PID is no
# longer a child of this script, so we instead sleep forever to keep
# PID 1 alive. Docker keeps the container running as long as PID 1 is
# alive; postgres continues serving in the background.
echo "[entrypointwrapper] all setup complete — sleeping to keep container alive"
exec sleep infinity