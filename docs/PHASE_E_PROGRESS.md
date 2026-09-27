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
| Tests | `tests/e2e/**`, `tests/unit/**` | 32 Playwright specs + 16 vitest schema cases |

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
| E2E | Playwright | 32 | `tests/e2e/**.spec.ts` — chromium + pixel-7 projects |
| Unit | Vitest | 16 | `tests/unit/schemas.test.ts` — covers every Zod schema the API depends on |

Run with:

```bash
npm run test:unit          # vitest
npm run test:e2e           # playwright (auto-starts `next start`)
```

## How to switch off mock mode

The app defaults to mock Supabase for local development. To exercise the real backend:

1. Start the local Supabase stack: `npm run db:up` (Postgres + auth + storage via Docker).
2. Copy `.env.example` to `.env.local` and flip `MOCK_SUPABASE=0`, then set `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the values printed by `supabase status`.
3. Sign in via `/login` instead of relying on the mock auto-login — the dashboard layout's `requireUser()` guard will redirect anonymous requests.

To return to mock mode: set `MOCK_SUPABASE=1` (the default) and restart `next dev`.
