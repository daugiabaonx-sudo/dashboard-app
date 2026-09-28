-- 0010_roles.sql — Provision the PostgREST and Storage-API roles that
-- supabase/postgrest, supabase/storage-api, and supabase/postgres-meta
-- expect to exist. The migrations up to 0007 only define schema and RLS
-- policies; they do not create the login roles because the original
-- `npx supabase start` flow provisions these from a separate file that
-- runs after the schema is in place.
--
-- Idempotent: each role is created with `if not exists` semantics via a
-- DO block so re-running the migration (e.g. db:reset) is safe.

do $do$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'supabase_storage_admin') then
    create role supabase_storage_admin nologin noinherit bypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'supabase_admin') then
    create role supabase_admin nologin noinherit bypassrls;
  end if;
end $do$;

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
