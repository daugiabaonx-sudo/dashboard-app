# SUNEXT Dashboard

Operations dashboard for project + task tracking. A Next.js 16 app router
project with Supabase (Postgres + PostgREST) on the back end and an
in-memory mock for offline development.

## Quick start

```bash
npm install
cp .env.example .env.local         # leave MOCK_SUPABASE=1 to run offline
npm run dev                        # http://127.0.0.1:3000
```

That's enough to click through the dashboard. Sign-in is auto-handled by
the mock-mode middleware (`proxy.ts`) — no real credentials required.

## Real Supabase mode

The default mocks Supabase in memory. To run against a real local
Postgres + PostgREST stack:

```bash
npm run db:reset                   # compose up + apply 0001-0012 migrations + seed
```

Then point the app at it:

```bash
# in .env.local
MOCK_SUPABASE=0
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
```

Auth, Realtime, Storage, and Meta are intentionally NOT bundled in
`docker-compose.yml` because their per-image env vars drift between
tags (`DATABASE_URL`, `API_EXTERNAL_URL`, `SECRET_KEY_BASE`, etc.).
For those, point the URL at Supabase Cloud or run the corresponding
images yourself.

## Scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` | `next dev` — Turbopack, mock mode |
| `npm run build` | Production build (`output: "standalone"`) |
| `npm run start` | Production server (offline mock mode) |
| `npm run test:unit` | Vitest unit tests |
| `npm run test:e2e` | Playwright across chromium + Pixel 7 |
| `npm run lint` | ESLint (some pre-existing warnings remain) |
| `npm run db:up` / `db:down` / `db:reset` | Compose lifecycle |
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
  (5/min auth, 120/min write). Swap to Redis / upstash/ratelimit for
  multi-instance deploys; the interface is the same.
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
supabase/migrations/    0001-0012 SQL files (apply order; idempotent)
tests/
  unit/                 Vitest (schemas, csrf, ratelimit, logger)
  e2e/                  Playwright (chromium + Pixel 7 projects)
docs/                   Phase E / Phase F progress notes
```

## CI

`.github/workflows/ci.yml` runs `typecheck + unit + build` then a
separate Playwright job against a Postgres service. Reports upload on
failure.
