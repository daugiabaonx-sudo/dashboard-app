# SUNEXT Dashboard

Operations dashboard for project + task tracking. A Next.js 16 app router
project with Supabase (Postgres + PostgREST) on the back end and an
in-memory mock for offline development.

## Quick start

```bash
npm install
cp .env.example .env.local
npm run db:stack                       # docker-compose up + migrate + seed + seed-auth
# paste the banner's ANON_KEY + SERVICE_ROLE_KEY into .env.local
# (NEXT_PUBLIC_SUPABASE_URL is already http://127.0.0.1:54321)
npm run dev                            # http://127.0.0.1:3000
```

That's the real-mode flow: the app talks to the local Supabase stack
through the Caddy gateway, sign-in hits GoTrue, and the kanban board
streams postgres_changes via Realtime v3.

No Docker? Set `MOCK_SUPABASE=1` in `.env.local` to fall back to the
in-memory adapter. Sign-in is auto-handled by `proxy.ts` — no
credentials required.

## Real Supabase mode

The docker-compose stack ships **Postgres + PostgREST + GoTrue +
Realtime v3 + Meta** behind a Caddy gateway on `:54321` with the same
path layout Cloud Supabase uses:

```
http://127.0.0.1:54321  ──► /auth/*     → gotrue:9999
                          /realtime/* → realtime:4000  (WS upgrade)
                          /meta/*     → meta:8080
                          /*          → rest:3001      (PostgREST)
```

`createBrowserClient(url, anonKey)` connects through the gateway
unchanged — the dashboard's per-service URL plumbing lives in
`lib/supabase/env.ts` and defaults to the gateway URL.

**Storage is intentionally excluded** — there's no `storage` service in
`docker-compose.yml`, no `STORAGE_*` env references in client code,
and no Storage role in the realtime publication migration. Production
still talks to Supabase Cloud for Storage (the gateway URL is
local-only); the dashboard's image-upload surface area is unchanged.

### Daily workflow

```bash
npm run db:stack    # full cutover: db-sync + gen-keys + compose + wait + seed-auth
npm run dev         # http://127.0.0.1:3000 (real mode)

npm run db:reset    # wipe compose volume + reapply migrations + re-seed + re-gen keys
npm run db:down     # stop the stack (data preserved)
npm run db:logs     # tail db logs
npm run db:psql     # psql into the postgres container
```

### Rollback

Set `MOCK_SUPABASE=1` in `.env.local` and restart `npm run dev`. The app
returns to the in-memory mock — no code change, no compose teardown.
Re-flip to `0` to come back.

### Real-mode e2e coverage

`npx playwright test --project=realmode --workers=1` exercises the full
real-mode pipeline. Two specs are Phase F-critical and pass cleanly:

- `tests/e2e/auth-realmode.spec.ts` — GoTrue login round-trip + invalid-credentials toast through the Caddy gateway.
- `tests/e2e/realtime-cross-tab.spec.ts` — two browser contexts both signed in as the same user; tab A flips a seeded `todo` task to `in_progress`, tab B's kanban column counts shift without reload. End-to-end proof of Postgres → wal2json → Realtime v3 → gateway → browser WS.

The remaining realmode specs (`calendar`, `dashboard`, `navigation`, `states`, `tasks`, `realtime-invalidation`) inherit the setup project's owner session but assert against mock-mode fixture IDs (`data-task-id="t2"`, `/team/u1`, `/projects/p1`) that don't exist in real Postgres. They fail in **both** mock and real mode for the same reason — pre-existing test design that pre-dates Phase F. See `docs/PHASE_F_PROGRESS.md` for the gap table.

## Scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` | `next dev` — Turbopack (real mode by default) |
| `npm run build` | Production build (`output: "standalone"`) |
| `npm run start` | Production server |
| `npm run test:unit` | Vitest unit tests |
| `npm run test:unit:coverage` | Vitest + v8 coverage (80% gate) |
| `npm run test:e2e` | Playwright across chromium + Pixel 7 (mock path) |
| `npm run test:e2e -- --project=realmode` | Playwright against the local stack (real path) |
| `npm run lint` | ESLint (some pre-existing warnings remain) |
| `npm run db:sync` | Flatten `supabase/migrations/*.sql` + `seed.sql` into `/tmp/sunext-initdb/` |
| `npm run db:gen-keys` | Mint deterministic HS256 ANON_KEY + SERVICE_ROLE_KEY into `.env.compose` |
| `npm run db:wait` | Poll `GATEWAY_URL/auth/v1/health` until 200 (90s timeout) |
| `npm run db:seed-auth` | Provision 8 deterministic users via GoTrue admin API |
| `npm run db:stack` | `db:reset` + `db:seed-auth` — the full cutover |
| `npm run db:reset` | `db:sync` + `db:gen-keys` + `compose down -v` + `compose up -d` + `db:wait` |
| `npm run db:up` / `db:down` | Compose lifecycle (data preserved on down) |
| `npm run db:logs` / `db:psql` | Postgres inspection |

## Architecture

- **`proxy.ts`** (Next 16's renamed `middleware.ts`) — single middleware
  entrypoint. Responsibilities, in order: rate-limit state-changing API
  calls per IP, mint + verify double-submit CSRF cookies, refresh the
  Supabase session, and gate `(dashboard)/*` behind `requireUser()`.
- **API routes** live under `app/api/**/route.ts`. Inputs are validated
  with Zod schemas from `lib/schemas/`; mutations flow through Postgres
  RPCs that enforce RLS.
- **CSRF** — every non-auth API write requires an `x-sunext-csrf`
  header matching the `sunext_csrf_token` httpOnly cookie. Browser
  code uses `csrfFetch()` from `lib/csrf-client.ts` which attaches the
  header automatically.
- **Rate-limit** — `lib/ratelimit.ts` ships an in-memory token bucket
  (30/min auth, 120/min write). The auth bucket is sized so a CI e2e
  suite signing in across many browser contexts doesn't trip the
  limiter mid-run. **Single-process only** — the current
  `output: "standalone"` deploy runs as one process, so the bucket is
  authoritative. Containerized multi-instance deploys (ECS, Cloud Run,
  Vercel serverless) MUST swap to Redis (`INCR` + `EXPIRE`) or
  `@upstash/ratelimit` before scaling beyond one replica, otherwise the
  effective limit becomes N× per IP. The `consume(bucketKey, clientIp)`
  interface is stable; see the module header for the swap pattern.
- **Logging** — `lib/logger.ts` emits JSON lines; server-side warning
  on rate-limit exceed uses it.

## Security headers

Configured in `next.config.ts`. Every response carries:

- `Content-Security-Policy` (default-src 'self', no framing)
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` (camera/mic/geo denied)
- `X-DNS-Prefetch-Control: off`

`tests/e2e/security-headers.spec.ts` asserts these on every protected
route so a regression in the headers config gets caught at e2e time.

## Project layout

```
app/                    Next.js app router — pages, layouts, API routes
components/             Shared UI components (organized by feature)
lib/                    Pure helpers (schemas, csrf, ratelimit, logger)
hooks/                  React Query hooks keyed by domain
supabase/migrations/    0001-0013 SQL files (apply order; idempotent)
tests/
  unit/                 Vitest (schemas, csrf, ratelimit, env)
  e2e/                  Playwright (chromium + mobile + realmode projects)
docs/                   Phase E / Phase F progress notes
docker-compose.yml      Local Postgres + GoTrue + Realtime + Meta + gateway
```

## CI

`.github/workflows/ci.yml` runs `typecheck → unit → coverage → build`
then two Playwright jobs:

- **`e2e`** — Postgres service + mock-supabase app; runs the chromium
  project against the existing 32 specs.
- **`e2e-realmode`** — `npm run db:stack` to bring up the full stack,
  then `npx playwright test --project=realmode --workers=1`. Exercises
  GoTrue login, cross-tab realtime invalidation, and the gateway in
  real mode.

Reports upload on failure.
