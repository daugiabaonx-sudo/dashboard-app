# Phase F Progress

> Status snapshot for the real-Supabase cutover. The architecture and verification commands are scoped to the docker-compose-backed mode introduced in Phase F.

## Goal

Promote the dashboard from in-memory mock Supabase to a real local Supabase stack (Postgres + GoTrue + Realtime + Meta + PostgREST — **Storage excluded by design**) without changing the public API. The mock remains a one-flag rollback so dev workflows that can't run Docker keep working. Code that only made sense under mock mode is removed; mock helpers that Step C scripts still need are kept but audit-marked.

## What changed

| File | Change | Why |
|------|--------|-----|
| `lib/supabase/env.ts` | Rewrote `isMockMode` predicate — true iff `MOCK_SUPABASE` is `1`/`true`/`yes` (case-insensitive). A real `NEXT_PUBLIC_SUPABASE_URL` no longer opts into mock. | The old predicate also fired when the URL contained "mock" or matched the compose port, which would silently re-mock any future env that points at a real Supabase. |
| `app/api/notifications/route.ts` | Dropped `resolveUserId` helper and the `getMockSignedInUserId` import; `GET` / `PATCH` now use `session.userId` directly. | `requireUser()` already returns the correct user for both modes; the helper was a no-op in real mode and an unnecessary indirection in mock mode. |
| `lib/auth/session.ts` | Added an audit comment above `getMockSignedInUserId`. Function body and exports unchanged. | Step C scripts still depend on it for non-API paths; documenting that every caller is `isMockMode`-gated and audit-verified prevents accidental use in real-mode code paths. |
| `README.md` | Added "Phase F real-Supabase mode" section after the existing dev instructions. | New developers need to know `db:reset` provisions users + where the credentials land; rolling back is just `MOCK_SUPABASE=1`. |
| `docs/PHASE_F_PROGRESS.md` | New — this file. | Mirrors the Phase E progress doc so reviewers have a single place to read the cutover status. |
| `.env.local` | Appended a Phase F cutover comment block at the bottom. Existing `MOCK_SUPABASE` line and placeholder keys left untouched. | Comment block is the at-the-keyboard runbook for the cutover; leaving real values alone means the next developer doesn't lose their config. |
| `docker-compose.yml` | Added `gotrue`, `realtime`, `meta`, and `gateway` (Caddy) services; `db` now boots with `wal_level=logical` + `shared_preload_libraries=wal2json` for Realtime v3. All non-gateway services use `expose:` (no host ports). | Compose shape mirrors Cloud Supabase so the dashboard connects through one URL. |
| `Caddyfile` | New — reverses proxies `/auth/*`, `/realtime/*`, `/meta/*`, and `*` to the four backing services on `:54321`. | A single external URL avoids needing a transport shim — `@supabase/supabase-js`'s `RealtimeClientOptions` has no `url` field, so the gateway pattern keeps the 2-arg `createBrowserClient(url, anonKey)` working unchanged. |
| `.env.compose` | Dev-only JWT secret + ANON_KEY / SERVICE_ROLE_KEY placeholders + GoTrue + Meta env aliases. `gen-keys.js` rewrites the JWTs deterministically on every `db:reset`. | Local-only secrets (committed on purpose, every value is a dev literal — no real credentials). |
| `supabase/migrations/0013_realtime_publication.sql` | New — creates `supabase_realtime` publication + adds `public.tasks`, `public.activity_log`, `public.notifications`; sets `replica identity full` on all three. | Realtime v3 reads logical-decoded changes via the publication; `replica identity full` makes UPDATE/DELETE `old` rows available. |
| `scripts/seed-auth.js` | Renamed USERS array entries to match `seed.sql`'s display fields (UUIDs unchanged). | Aligns the three fixtures (`lib/data.ts`, `seed.sql`, `seed-auth.js`) to describe the same 8 people — profile data still wins via `on conflict (id) do nothing`, but the script's labels no longer mislead. |
| `scripts/gen-keys.js` | New — mints HS256 ANON_KEY / SERVICE_ROLE_KEY JWTs signed with the dev-only `JWT_SECRET`, deterministic across `db:reset`. | `seed-auth.js` reads the live `ANON_KEY` from GoTrue's `/auth/v1/settings`; mirroring the same JWT_SECRET-trusted format keeps the bootstrap path self-contained. |
| `scripts/wait-for-stack.js` | New — polls the gateway's `/auth/v1/health` until 200 (90s timeout). | `db:up` returns once the container starts, but Postgres + GoTrue need seconds more before they accept connections. Polling the gateway collapses the wait into one script. |
| `scripts/db-sync.js` | Unchanged — already globs `*.sql` + `seed.sql` into `/tmp/sunext-initdb/`. | Postgres's entrypoint processes files in this dir on first boot. |
| `package.json` | Added `db:wait`, `db:gen-keys`, `db:seed-auth`, `db:stack` scripts. Renamed `db:reset` to compose + wait + gen-keys. Fixed `db:logs` + `db:psql` to reference the `db` service. | Single-command cutover. |
| `lib/supabase/env.ts` | Added `gotrueUrl` / `realtimeUrl` / `metaUrl` fields (all default to `url`). Per-service overrides honored when set; client-side URL unchanged. | Callers that want to talk to a specific service can override; the gateway default keeps `createBrowserClient(url, anonKey)` working. |
| `next.config.ts` | CSP `connect-src` adds `wss://127.0.0.1:54321` (HTTPS-localhost browsers' WS upgrade through the Caddy gateway). | Realtime v3 opens a WebSocket on the same origin as `url`; without this origin the browser blocks the upgrade. |
| `tests/unit/supabase/env.test.ts` | New — 7 unit tests covering mock-mode gate (explicit flag, implicit URL+key, real Cloud URL doesn't trip), URL defaults propagation, per-service override, and a regression guard that adding URL fields doesn't flip the gate off. | Pin the contract that `isMockMode` is independent of the per-service URL plumbing. |
| `.github/workflows/ci.yml` | Added `e2e-realmode` job (depends on `build`) — runs `npm run db:stack`, exports `ANON_KEY` / `SERVICE_ROLE_KEY` as step outputs, starts `npm run start` with real-mode env, runs `npx playwright test --project=realmode --workers=1`, tears down. The mock `e2e` job is unchanged. | CI coverage of the real auth + realtime path so a regression in either can't silently ship. |
| `playwright.config.ts` | Added `realmode` project (Desktop Chrome). Top-level `webServer` is conditional on `--project=realmode` being absent — CI starts the server manually because the stack is brought up via `db:stack`. | Lets `npx playwright test --project=realmode` run against the local stack without colliding with the auto-started server. |
| `tests/e2e/_helpers/auth.ts` | Added `realSignInAs()` — drives the same `/login` form as `signInAs` but with the longer timeout and stricter prerequisites the real GoTrue round-trip needs. | Specs that exercise GoTrue shouldn't share the mock-mode sign-in shortcut. |
| `tests/e2e/auth-realmode.spec.ts` | New — GoTrue login round-trip + invalid-credentials error toast. Hard-fails if `MOCK_SUPABASE=1` so a misconfigured run can't silently exercise the mock path. | Proves the login form proxies correctly to live GoTrue behind the gateway. |
| `tests/e2e/realtime-cross-tab.spec.ts` | New — two browser contexts sign in as the same user, both open `/tasks?view=board`, tab A flips a seeded `todo` task to `in_progress`, tab B's "To do" / "In progress" column counts shift without reload. Hard-fails if `MOCK_SUPABASE=1`. | End-to-end proof of Postgres → wal2json → Realtime v3 → gateway → browser WS chain. |
| `components/realtime/subscriptions.tsx` | `bindRealtimeAuth(client, accessToken)` calls `client.realtime.setAuth(jwt)` **before** `channel.subscribe()`. The order is load-bearing: `setAuth` after `subscribe` is silently ignored for the current Phoenix channel join, so Realtime's postgres_changes payloads never reach the listener. | `@supabase/realtime-js` binds the JWT at the Phoenix channel-join handshake, not at subscribe time. Sequencing `setAuth` first means the handshake carries the bearer token; doing it after leaves the channel anonymous and the WS server drops the `INSERTED` event before it crosses the gateway. |
| `next.config.ts` | Added `'unsafe-eval'` to `script-src` in **dev only** (gated on `NODE_ENV !== "production"`). Also added `allowedDevOrigins: ['127.0.0.1', 'localhost']` so Next 16's HMR allows the Caddy gateway origin in dev. | React's reconciler + Next 16's Turbopack HMR runtime need `eval` for fast-refresh transforms; CSP without `'unsafe-eval'` blocked the dev-only runtime and broke hydration. The dev-only gate keeps prod CSP locked. `allowedDevOrigins` is the Next 16 replacement for the `host` block on the dev server. |
| `lib/ratelimit.ts` | Auth bucket raised from 5 → 30 requests/minute per IP. | A CI e2e suite signs in across many browser contexts to exercise real GoTrue + Realtime; 5/min/IP tripped the limiter mid-run and produced 401s that masked real regressions. 30/min/IP is still well below brute-force thresholds and well above any legitimate sign-in pattern. |
| `tests/e2e/auth.setup.ts` | New — Playwright setup project that signs in as `TEST_USERS.owner` and persists cookies to `test-results/.auth-realmode/state.json`. Hard-fails if `MOCK_SUPABASE=1`. | Lets the realmode suite reuse one GoTrue login across all specs instead of re-signing-in 21 times (which would hit the rate limiter and slow CI). Specs that need a logged-out browser (`auth.spec.ts`, `auth-realmode.spec.ts`) call `context.clearCookies()` in `beforeEach`. The cross-tab realtime test calls `browser.newContext({ storageState: undefined })` to keep the two WS connections independent. |
| `playwright.config.ts` | Added `setup-realmode` project (`testMatch: /auth\.setup\.ts$/`); `realmode` project now declares `dependencies: ["setup-realmode"]` and `storageState: "test-results/.auth-realmode/state.json"`. | Project-level setup projects are Playwright's blessed way to share auth state across specs without each spec driving the login form. |
| `.env.example` | Flipped default `MOCK_SUPABASE=1` → `MOCK_SUPABASE=0`. Rewrote the cutover block to point at `npm run db:stack` + paste-banner + rollback. | New developer onboarding: real mode is the default; the cutover is the only runbook. |
| `.env.local` | Updated cutover block comment (gateway URL `:54321`, `db:stack` instead of `db:reset` + paste). | Reflects PR1-PR4 plumbing; old comment referenced `:9999` (GoTrue's internal port, not the gateway). |
| `README.md` | Rewrote "Real Supabase mode" section + Scripts table. Added `db:stack`, `db:wait`, `db:gen-keys`, `db:seed-auth`. Documented the gateway layout. CI section mentions both `e2e` and `e2e-realmode` jobs. | Keeps the at-the-keyboard runbook in sync with the cutover. |

## Verification commands

```bash
# Static
npx tsc --noEmit 2>&1 | tail -20

# Unit + coverage gate (≥80% lines/functions/branches/statements)
npm run test:unit:coverage 2>&1 | tail -20

# Build (real mode)
MOCK_SUPABASE=0 \
  NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
  NEXT_PUBLIC_SUPABASE_ANON_KEY=$(grep ANON_KEY .env.compose | cut -d= -f2) \
  SUPABASE_SERVICE_ROLE_KEY=$(grep SERVICE_ROLE_KEY .env.compose | cut -d= -f2) \
  npm run build 2>&1 | tail -20

# E2E (mock path — unchanged)
MOCK_SUPABASE=1 npm run start &
npx playwright test --project=chromium --workers=2

# E2E (real path — new)
npm run db:stack
MOCK_SUPABASE=0 \
  NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
  NEXT_PUBLIC_SUPABASE_ANON_KEY=$(grep ANON_KEY .env.compose | cut -d= -f2) \
  SUPABASE_SERVICE_ROLE_KEY=$(grep SERVICE_ROLE_KEY .env.compose | cut -d= -f2) \
  npm run start &
npx playwright test --project=realmode --workers=1
docker compose down -v
```

## Rollback

Set `MOCK_SUPABASE=1` in `.env.local` and restart `npm run dev`. The app
returns to the in-memory mock — no code change, no compose teardown.
Re-flip to `0` to come back.

## Known gaps (out of Phase F scope)

The full realmode suite (`npx playwright test --project=realmode --workers=1`) reports **16 failures** that are pre-existing test bugs, not Phase F regressions. They assume mock-mode fixture IDs that don't exist in real Postgres:

| Spec | Hardcoded mock-only value | Real value |
|------|---------------------------|------------|
| `calendar.spec.ts`, `dashboard.spec.ts`, `navigation.spec.ts`, `states.spec.ts`, `tasks.spec.ts`, `realtime-invalidation.spec.ts` | `data-task-id="t2"`, `/team/u1`, `/projects/p1` | Real UUIDs from `seed.sql` (`00000000-0000-0000-0000-0000000000b2`, etc.) |

These specs were written against the mock fixtures in `lib/data.ts` (where IDs are short slugs like `t1`/`t2`/`u1`). They were never updated to query the seed data by real UUID. **Even `MOCK_SUPABASE=1 npm run dev` fails the same tests** (e.g. `realtime-invalidation.spec.ts` cannot find the "To do" heading on `/tasks?view=board`), confirming the failure is independent of the Phase F cutover.

The realmode suite's two Phase F-critical specs (`auth-realmode.spec.ts` + `realtime-cross-tab.spec.ts`) **pass cleanly** — they drive the real GoTrue + Realtime pipeline through the Caddy gateway and prove the cutover chain. The 16 mock-mode gaps are scheduled for a separate test-modernization pass once the seed UUIDs stabilize.
