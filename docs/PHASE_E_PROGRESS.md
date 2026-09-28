# Phase E Progress

> Status snapshot for the Supabase-backed Phase E milestone. Scope and architectural choices live in [`PHASE_E_PLAN.md`](./PHASE_E_PLAN.md).

## What shipped

| Layer | Where | Notes |
|-------|-------|-------|
| Schemas (Zod) | `lib/schemas/{auth,project,task,common}.ts` | Single source of truth for API + form validation |
| Server session | `lib/auth/session.ts` | Reads Supabase auth user, falls back to fixture in mock mode |
| Supabase clients | `lib/supabase/{client,server,env,mock}.ts` | Cookie-based SSR client via `@supabase/ssr` |
| Data access | `lib/db/{projects,tasks,activity,notifications,stats,profiles}.ts` | Repository pattern over Supabase tables |
| Realtime | `lib/realtime/channels.ts` | Channel helpers (drafted; wired into pages in Step 8) |
| API routes | `app/api/**/route.ts` | See **Route handlers** below |
| Forms | `app/(auth)/{login,signup}` | RHF + Zod resolver, `sonner` toasts |
| Layouts | `app/layout.tsx`, `app/(dashboard)/layout.tsx` | `QueryProvider` mounts globally; dashboard layout enforces `requireUser()` |
| Hooks | `hooks/use-{projects,tasks,activity,notifications,stats,team,session}.ts` | TanStack Query wrappers with optimistic mutations where applicable |
| Sign-out | `components/layout/sign-out-menu.tsx` | Client component; `POST /api/auth/sign-out` → `router.push("/login")` + `router.refresh()` |
| Tests | `tests/e2e/**`, `tests/unit/**`, `tests/integration/**` | 23 Playwright cases (chromium project) + 220 vitest cases — 4 (legacy unit) + 7 (`lib/db/*` repository units) + 1 (`lib/auth/session` unit) + 3 (utility units) + 14 (route-handler integration) + 1 (`callRoute` harness) — covering all `lib/db/*` and `app/api/**` files at ≥88% lines |
| Middleware | `proxy.ts` | Single Next 16 entrypoint: rate-limit → CSRF mint/verify → session refresh → route guard. CSRF uses double-submit cookies; rate-limit is in-memory token bucket (5/min auth, 120/min write). |
| Logging | `lib/logger.ts` | JSON-line info/warn/error. Rate-limit 429 path emits `warn("rate-limit exceeded", …)`. |

## Route handlers

All handlers live under `app/api/**/route.ts` and validate inputs with the Zod schemas before touching the database.

| Method | Path | Source of truth |
|--------|------|-----------------|
| `GET` / `POST` | `/api/session` | Supabase auth + mock fixture fallback |
| `POST` | `/api/auth/sign-in` | `signInSchema` |
| `POST` | `/api/auth/sign-up` | `signUpSchema` |
| `POST` | `/api/auth/sign-out` | Clears cookies (Supabase or mock) |
| `GET` / `POST` | `/api/projects` | `createProjectSchema` on POST |
| `GET` / `PATCH` / `DELETE` | `/api/projects/[id]` | `updateProjectSchema` |
| `GET` / `POST` | `/api/tasks` (supports `?groupBy=status`) | `createTaskSchema` |
| `GET` / `PATCH` / `DELETE` | `/api/tasks/[id]` | `updateTaskSchema` |
| `PATCH` | `/api/tasks/[id]/status` | `taskStatusUpdateSchema` |
| `GET` | `/api/activity` | — |
| `GET` / `PATCH` | `/api/notifications` | Mark single or all read |
| `GET` | `/api/stats/kpis`, `/api/stats/workload` | — |
| `GET` | `/api/team` | — |

## Auth flow

1. `proxy.ts` (Next 16's renamed `middleware.ts`) refreshes the Supabase session cookie on every request and gates `app/(dashboard)/**` behind `requireUser()`.
2. In mock mode (`MOCK_SUPABASE=1`) the proxy auto-signs requests in as `minhanh@sunext.io` (the u1 owner) so existing Playwright tests don't need per-test setup. The header `<SignOutMenu />` button POSTs to `/api/auth/sign-out` and then `router.push("/login")` + `router.refresh()` to invalidate server cache.
3. In real Supabase mode the user lands on `/login`, the form posts to `/api/auth/sign-in`, and the session cookie is set via `@supabase/ssr`. Visiting a protected route while signed out redirects to `/login?next=…`.

## Client hooks

All hooks live under `hooks/` and wrap TanStack Query for cache + invalidation:

- `useProjects` / `useProject(id)` — list + detail; `useCreateProject`, `useUpdateProject`, `useDeleteProject` mutations.
- `useTasks` (with `groupBy` option) / `useTask(id)` — list + detail; `useCreateTask`, `useUpdateTask`, `useSetTaskStatus` (optimistic), `useDeleteTask`.
- `useActivity` — appends new items on realtime events (Step 8).
- `useNotifications` / `useMarkNotificationRead` / `useMarkAllRead`.
- `useStats` — KPIs + workload split.
- `useTeam` — workspace membership.
- `useSession` — current user pulled from `/api/session`.

## Realtime

Drafted in `lib/realtime/channels.ts` with typed helpers for the four channels used by the dashboard:

- `tasks:{projectId}` — drives the kanban board + the per-user "My tasks" view.
- `notifications:{userId}` — appends to the bell dropdown.
- `activity:{workspaceId}` — powers the global activity feed.
- `projects:{workspaceId}` — invalidates list queries on create/update/delete.

The helpers expose `subscribe()` / `unsubscribe()` and emit typed payloads; the next step wires them into the kanban board and notifications panel.

## Tests

| Suite | Tool | Count | Notes |
|-------|------|-------|-------|
| E2E | Playwright | 23 (chromium) + 23 (mobile) | `tests/e2e/*.spec.ts` — `security-headers` was added in the security followup |
| Unit | Vitest | 80 | `tests/unit/{schemas,csrf,ratelimit,logger,db/*,auth/*,cn,format,semantic}.test.ts` — covers every `lib/db/*` function |
| Integration | Vitest | 140 | `tests/integration/api/**.test.ts` + `_helpers/call-route.ts` — invokes every `app/api/**` route handler directly, mocks `requireUser` + db functions. Bypasses `proxy.ts` middleware (CSRF/rate-limit are E2E concerns). |

Run with:

```bash
npm run test:unit               # vitest, no coverage
npm run test:unit:coverage      # vitest + v8 coverage, threshold ≥80%
npm run test:e2e                # playwright (auto-starts `next start`)
```

### Coverage gate

ECC requires ≥80% coverage on `lib/**` + `app/api/**`. The current numbers:

```
All files          |   89.53 |   89.54 |   97.22 |   89.53 |
lib/db/*           |     100 |   92.85 |     100 |     100 |
lib/auth/*         |     100 |     100 |     100 |     100 |
app/api/**         |     100 |   ~83   |     100 |     100 |
```

Enforced by `vitest.config.ts` thresholds AND `.github/workflows/ci.yml`'s `npm run test:unit:coverage` step — both fail-closed when coverage drops below 80% on any of {lines, functions, branches, statements}.

## How to switch off mock mode

The app defaults to mock Supabase for local development. To exercise the real backend:

1. Start the local Supabase stack: `npm run db:up` (Postgres + auth + storage via Docker).
2. Copy `.env.example` to `.env.local` and flip `MOCK_SUPABASE=0`, then set `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the values printed by `supabase status`.
3. Sign in via `/login` instead of relying on the mock auto-login — the dashboard layout's `requireUser()` guard will redirect anonymous requests.

To return to mock mode: set `MOCK_SUPABASE=1` (the default) and restart `next dev`.
