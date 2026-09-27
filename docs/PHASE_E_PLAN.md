# Phase E — Real API / Database (Supabase)

> Authored by the planner agent on 2026-09-27. Approved scope: Supabase (Postgres + Auth + Realtime), email + password auth, full project + task CRUD, local Supabase via Docker + mock keys for dev, multi-workspace with memberships, realtime subscriptions for tasks + activity.

## 1. Tech choices

| Concern | Package | Version | Why |
|---|---|---|---|
| Supabase JS client | `@supabase/supabase-js` | `^2.45.0` | Stable, React-19-compatible. Pairs with `@supabase/ssr` for cookie-based sessions. |
| Next.js SSR auth helper | `@supabase/ssr` | `^0.5.0` | Required for `middleware.ts` session refresh + per-request server client. Do **not** use the deprecated `auth-helpers-nextjs`. |
| Server cache / mutations | `@tanstack/react-query` | `^5.59.0` | React 19 supported, no breaking change vs. v4. Devtools: `@tanstack/react-query-devtools ^5.59.0`. |
| Form library | `react-hook-form` `^7.53.0` + `@hookform/resolvers` `^3.9.0` | — | Resolver wires Zod 4 schemas. |
| Toasts | `sonner` | `^1.7.0` | Headless, theme-aware, single `<Toaster />` mount, no Radix dependency. |
| Date pickers | `@radix-ui/react-popover` (already installed) + `<input type="date">` for MVP | — | No new dep. |
| Workspace switcher dropdown | `@radix-ui/react-dropdown-menu` (already installed `^2.1.24`) | — | No new dep. |
| DB driver | Supabase JS — no separate `pg` driver | — | Postgres accessed only via Supabase. |

No conflicts with `next-themes`, Radix, Recharts, Tailwind v4. `sonner` is theme-via-CSS-variable compatible with our `--background`/`--foreground` tokens.

**Stay-out decisions:**
- No new `next.config.ts` rewrites.
- No React Compiler opt-in — already off.
- Do **not** add `swr`; TanStack Query only.

## 2. File layout (additions only)

```
dashboard-app/
├── supabase/
│   ├── config.toml
│   ├── seed.sql
│   └── migrations/
│       ├── 0001_extensions.sql
│       ├── 0002_profiles.sql
│       ├── 0003_workspaces.sql
│       ├── 0004_projects.sql
│       ├── 0005_tasks.sql
│       ├── 0006_activity_log.sql
│       └── 0007_notifications.sql
├── docker-compose.yml
├── .env.example
├── .gitignore                       # add .env, supabase/.branches, supabase/.temp
├── middleware.ts                    # auth guard + session refresh via @supabase/ssr
├── lib/
│   ├── supabase/
│   │   ├── server.ts                # createServerClient with next/headers cookies()
│   │   ├── client.ts                # createBrowserClient for Client Components
│   │   └── service.ts               # service-role client (server-only)
│   ├── auth/
│   │   ├── session.ts               # getSession(), requireUser(), getCurrentWorkspaceId()
│   │   └── workspace.ts             # listMyWorkspaces(), switchWorkspace()
│   ├── db/
│   │   ├── profiles.ts
│   │   ├── workspaces.ts
│   │   ├── projects.ts
│   │   ├── tasks.ts
│   │   ├── activity.ts
│   │   ├── notifications.ts
│   │   └── stats.ts                 # getKpis, getTeamWorkload as Postgres RPCs
│   ├── schemas/                     # Zod input schemas
│   │   ├── project.ts
│   │   ├── task.ts
│   │   └── auth.ts
│   ├── data.ts                      # KEEP as thin adapter over lib/db/* until Phase F cleanup
│   └── realtime/
│       └── channels.ts
├── hooks/
│   ├── query-client.ts              # QueryClient + Provider
│   ├── use-session.ts
│   ├── use-projects.ts
│   ├── use-tasks.ts
│   ├── use-activity.ts
│   ├── use-notifications.ts
│   └── use-workspace.ts
├── app/
│   ├── layout.tsx                   # wraps <html> with QueryClientProvider
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx               # requireUser() guard + <WorkspaceProvider>
│   │   ├── page.tsx                 # Server Component — reads via lib/db/*
│   │   ├── projects/page.tsx
│   │   ├── projects/[id]/page.tsx
│   │   ├── projects/[id]/edit/page.tsx    # NEW — edit form
│   │   ├── tasks/page.tsx
│   │   ├── tasks/new/page.tsx             # NEW — task form
│   │   ├── team/page.tsx
│   │   ├── team/[id]/page.tsx
│   │   ├── calendar/page.tsx
│   │   ├── reports/page.tsx
│   │   └── settings/page.tsx
└── components/
    ├── workspace-provider.tsx
    ├── workspace-switcher.tsx
    ├── tasks/
    │   ├── kanban-board.tsx         # CONVERT — useTasksByStatus + channel
    │   ├── tasks-list.tsx           # NEW — extracted list view
    │   └── task-form.tsx            # NEW — RHF + Zod
    ├── projects/
    │   └── project-form.tsx         # NEW — RHF + Zod
    ├── ui/
    │   └── toaster.tsx              # NEW — <Toaster /> from sonner
    └── shell/
        └── user-menu.tsx            # NEW — avatar + logout
```

Existing components keep paths; bodies change to consume hooks/data wrappers.

## 3. Postgres schema (DDL)

> Conventions: `gen_random_uuid()` from `pgcrypto`; `created_at`/`updated_at` maintained by triggers; status fields use `text` + `CHECK` constraints (Zod is the real source of truth; CHECK is a safety net).

### `0001_extensions.sql`
```sql
create extension if not exists "pgcrypto";
```

### `0002_profiles.sql`
```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  initials text not null default '',
  avatar_color text not null default '#6366f1',
  department text not null default 'General',
  role text not null default 'member' check (role in ('owner','admin','manager','member','viewer')),
  capacity_hours integer not null default 40,
  joined_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_self_select"
  on public.profiles for select using ( true );
create policy "profiles_self_update"
  on public.profiles for update
  using ( id = auth.uid() ) with check ( id = auth.uid() );

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name',''));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
```

### `0003_workspaces.sql`
```sql
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger workspaces_touch before update on public.workspaces
  for each row execute function public.touch_updated_at();

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','manager','member','viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index workspace_members_user_idx on public.workspace_members(user_id);

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;

create or replace function public.is_workspace_member(ws uuid)
returns boolean language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws and user_id = auth.uid()
  );
$$;

create policy "workspaces_select_member"
  on public.workspaces for select using ( public.is_workspace_member(id) );
create policy "workspaces_update_owner"
  on public.workspaces for update using (
    exists (select 1 from public.workspace_members
            where workspace_id = id and user_id = auth.uid() and role = 'owner')
  );
create policy "workspaces_insert_owner"
  on public.workspaces for insert with check ( auth.uid() is not null );

create policy "wm_select_self"
  on public.workspace_members for select
  using ( user_id = auth.uid() or public.is_workspace_member(workspace_id) );
create policy "wm_insert_owner"
  on public.workspace_members for insert with check (
    exists (select 1 from public.workspace_members
            where workspace_id = workspace_members.workspace_id and user_id = auth.uid() and role = 'owner')
  );
```

### `0004_projects.sql`
```sql
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  description text not null default '',
  status text not null default 'planning' check (status in ('planning','active','on_hold','completed')),
  priority text not null default 'medium' check (priority in ('low','medium','high','critical')),
  owner_id uuid not null references public.profiles(id),
  member_ids uuid[] not null default '{}',
  start_date date not null,
  due_date date not null,
  progress integer not null default 0 check (progress between 0 and 100),
  budget integer not null default 0,
  spent integer not null default 0,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_workspace_idx on public.projects(workspace_id);
create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();

alter table public.projects enable row level security;
create policy "projects_member_all"
  on public.projects for all
  using ( public.is_workspace_member(workspace_id) )
  with check ( public.is_workspace_member(workspace_id) );
```

### `0005_tasks.sql`
```sql
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text not null default '',
  status text not null default 'backlog' check (status in ('backlog','todo','in_progress','in_review','done')),
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  assignee_id uuid references public.profiles(id),
  reporter_id uuid not null references public.profiles(id),
  due_date date not null,
  estimated_hours integer not null default 0,
  logged_hours integer not null default 0,
  progress integer not null default 0 check (progress between 0 and 100),
  blocked boolean not null default false,
  blocker_note text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_workspace_idx on public.tasks(workspace_id);
create index tasks_project_idx on public.tasks(project_id);
create index tasks_status_idx on public.tasks(workspace_id, status);
create index tasks_assignee_idx on public.tasks(assignee_id);
create trigger tasks_touch before update on public.tasks
  for each row execute function public.touch_updated_at();

alter table public.tasks enable row level security;
create policy "tasks_member_all"
  on public.tasks for all
  using ( public.is_workspace_member(workspace_id) )
  with check ( public.is_workspace_member(workspace_id) );

create or replace function public.log_task_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_type text; v_title text;
begin
  if (tg_op = 'INSERT') then
    v_type := 'task_created'; v_title := new.title;
  elsif (tg_op = 'UPDATE') then
    if new.status = 'done' and old.status <> 'done' then v_type := 'task_completed';
    elsif new.status <> old.status then v_type := 'status_changed';
    elsif new.assignee_id is distinct from old.assignee_id then v_type := 'task_assigned';
    else return new; end if;
    v_title := new.title;
  end if;
  insert into public.activity_log(workspace_id, actor_id, type, target_type, target_id, target_title, message)
  values (new.workspace_id, coalesce(auth.uid(), new.reporter_id), v_type, 'task', new.id, v_title,
          case v_type
            when 'task_completed' then 'marked complete'
            when 'status_changed' then 'changed status'
            when 'task_assigned'  then 'reassigned'
            else 'created a new task' end);
  return new;
end $$;

create trigger tasks_log_change
  after insert or update on public.tasks
  for each row execute function public.log_task_change();
```

### `0006_activity_log.sql`
```sql
create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  type text not null,
  target_type text not null check (target_type in ('task','project')),
  target_id uuid not null,
  target_title text not null,
  message text not null,
  created_at timestamptz not null default now()
);
create index activity_workspace_idx on public.activity_log(workspace_id, created_at desc);

alter table public.activity_log enable row level security;
create policy "activity_member_select"
  on public.activity_log for select using ( public.is_workspace_member(workspace_id) );
create policy "activity_member_insert"
  on public.activity_log for insert with check ( public.is_workspace_member(workspace_id) );
-- append-only: no update / delete policies
```

### `0007_notifications.sql`
```sql
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('deadline','mention','assigned','completed','blocked')),
  title text not null,
  body text not null,
  link text not null default '/',
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, read, created_at desc);

alter table public.notifications enable row level security;
create policy "notifications_self_all"
  on public.notifications for all
  using ( user_id = auth.uid() ) with check ( user_id = auth.uid() );
```

### `seed.sql` (shape)
- One workspace `"SUNEXT Operations"` (slug `operations`).
- 8 fake auth users via `auth.users` insert + matching `profiles` rows (deterministic UUIDs `00000000-0000-0000-0000-00000000000u1..u8`).
- `workspace_members` rows for each (owner = `u1`).
- 5 projects from `lib/data.ts` (UUIDs `00000000-0000-0000-0000-0000000000p1..p5`).
- ~30 tasks (UUIDs `t1..t30`).
- 4 notifications owned by `u1`.
- A couple of seeded activity rows.

**Decision rationale (text + CHECK over enum types):** Postgres `enum` types are painful to evolve. `text` + CHECK keeps the schema aligned with Zod's string-literal unions.

**Soft vs hard delete:** all tables hard-delete (`on delete cascade`). A future `archived_at` column can be added later without breaking Phase E RLS.

## 4. Migration path from mock data

Commit-per-step, green-Playwright-after-each:

1. **Infra only (no app code).** `docker-compose.yml`, `supabase/config.toml`, `.env.example`, `.gitignore`, `npm run db:up`/`db:reset`/`db:seed` scripts.
2. **Supabase clients.** `lib/supabase/{server,client,service}.ts`, `lib/realtime/channels.ts`, root `middleware.ts` (passthrough session refresh).
3. **Schema layer.** `lib/db/*`, `lib/schemas/*`, `lib/stats.ts`. Add temporary `app/_debug/db/page.tsx` to render JSON; doesn't replace any page yet.
4. **Switch pages read-only, one at a time.** After each switch, run `npm run test:e2e` and confirm 32/32.
   - **4a.** `app/(dashboard)/page.tsx` (Dashboard).
   - **4b.** `app/(dashboard)/projects/page.tsx` + `projects/[id]/page.tsx`.
   - **4c.** `app/(dashboard)/tasks/page.tsx`. `KanbanBoard` and `TaskRow` stay Server Components (now read from DB). Switch view via URL param.
   - **4d.** `app/(dashboard)/team/page.tsx` + `team/[id]/page.tsx`.
   - **4e.** `app/(dashboard)/calendar/page.tsx`, `reports/page.tsx`, `settings/page.tsx`.
   - **4f.** `components/layout/header.tsx` notifications → `useNotifications()` hook (now Client, SSR-hydrated).
5. **Auth wiring.** `app/(auth)/login/page.tsx`, `signup/page.tsx`. `lib/auth/session.ts` (`requireUser`, `getCurrentWorkspaceId`). `app/(dashboard)/layout.tsx` guard. `middleware.ts` refreshes cookies. Playwright global setup seeds default workspace + auth user.
6. **Mutations + optimistic UI.** `app/(dashboard)/projects/[id]/edit/page.tsx` (Server Action + RHF). `app/(dashboard)/tasks/new/page.tsx`. `KanbanBoard` / `TaskRow` status mutation via dropdown (TanStack Query optimistic). "Mark all read" mutation. Write `tests/e2e/mutations.spec.ts`.
7. **Realtime.** Channels for `tasks`, `activity_log`, `notifications`. Hooks call `queryClient.invalidateQueries` only. Two-context Playwright test.
8. **Cleanup.** Delete mock arrays from `lib/data.ts`. `supabase/seed.sql` is canonical.

**Risky switches (in order of risk):**
- `getKpis` / `getTeamWorkload` use `Date.now()` — fixed anchor needed for deterministic Playwright. Resolve by computing on server with `new Date()` once per request; seeded dates are stable.
- `findUser` / `findProject` called from Client Components (`task-row.tsx`). Refactor `TaskRow` to accept `assignee?: User | null` and `project?: Project | null` props.
- `Header` notifications `"use client"` with module-load `unread`. Split into `HeaderShell` (Server) + `HeaderBell` (Client); server passes `initialNotifications` / `initialUnread`.

## 5. Realtime strategy

| Table | Channel | Subscribe where | On event |
|---|---|---|---|
| `tasks` | `tasks:${workspaceId}` | `KanbanBoard`, `tasks-list`, Dashboard activity card | `invalidateQueries(['tasks', workspaceId])` + narrow variants |
| `activity_log` | `activity:${workspaceId}` | `ActivityFeed` (Dashboard) | `invalidateQueries(['activity', workspaceId])` |
| `notifications` | `notifications:${userId}` | `Header` | `invalidateQueries(['notifications', userId])` |

**Subscribe / cleanup pattern:**
- `useEffect` opens `supabase.channel(name).on('postgres_changes', { event: '*', schema: 'public', table, filter: \`workspace_id=eq.${id}\` }, handler).subscribe()`.
- Cleanup: `() => { supabase.removeChannel(channel) }`.
- Guard against double-subscribe via `useRef`; unsubscribe before resubscribing.

**Backpressure / debounce:**
- Wrap invalidation in a 150ms `debounce` keyed by query key. Implementation in `lib/realtime/channels.ts`.

**RLS gap that would silently leak data:**
- Realtime only delivers rows the connected client can read. If a policy is `using (true)` instead of `is_workspace_member(workspace_id)`, workspace B's mutations would leak to workspace A.
- **Mitigation:** every Realtime-subscribed table MUST have a workspace-scoped RLS policy; verify with integration test.

**No double-fetch:**
- Realtime callbacks MUST only invalidate; never re-issue the same query the channel was subscribed through.

## 6. Auth flows

- **Login:** RHF form `{ email, password }`. `signInWithPassword` on submit. `router.push('/')`. Errors via `sonner.error`.
- **Signup:** `{ email, password, fullName }`. `signUp` → trigger creates `profiles` row → grants membership to default workspace.
- **Logout:** `Header` avatar dropdown → `signOut()` → `router.push('/login')`.
- **Session refresh:** `middleware.ts` calls `supabase.auth.getUser()` per request, writes cookies back.
- **Workspace switcher (`components/workspace-switcher.tsx`):**
  - Lists `listMyWorkspaces()`.
  - Click → Server Action `setActiveWorkspace(id)` stores `active_workspace_id` in httpOnly cookie `sunext.active_workspace`.
  - `getCurrentWorkspaceId()` reads the cookie; falls back to most recent membership.
  - Switching triggers `router.refresh()` so all Server Component trees refetch scoped to the new workspace.

## 7. CRUD UX

> **Server Actions vs Client mutations.** Decision rule:
> - **Server Actions** when the form submit completes a full navigation.
> - **TanStack Query mutations** when the change is inline.

### Projects
| Mutation | UI entry | Mode | Optimistic | Rollback | Toast |
|---|---|---|---|---|---|
| Create | "New project" button → `/projects/new` | Server Action | n/a | n/a | `Project created` |
| Update | `/projects/[id]/edit` | Server Action | n/a | n/a | `Project saved` |
| Status change | status badge dropdown on project row | TanStack mutation | set new; revert on error | `setQueryData(['projects', id], ...)` | `Status updated` |
| Delete | inside edit page | Server Action | n/a | n/a | `Project removed` |

### Tasks
| Mutation | UI entry | Mode | Optimistic | Rollback | Toast |
|---|---|---|---|---|---|
| Create | "New task" → `/tasks/new` | Server Action | n/a | n/a | `Task created` |
| Update | inline edit drawer (title + desc) | TanStack mutation | patch query; revert | `setQueryData(['tasks', id], ...)` | `Saved` |
| Status change | Kanban card status menu / list dropdown | TanStack mutation | patch query | restore old status | `Moved to {status}` |
| Toggle complete | checkbox on `TaskRow` | TanStack mutation | patch query | restore old status | `Marked done` / `Reopened` |
| Assign | avatar dropdown | TanStack mutation | patch query | restore old assignee | `Assigned to {name}` |
| Delete | row overflow menu | TanStack mutation | remove from list cache | re-insert from snapshot | `Task deleted` + Undo (5s) |

### Notifications
- "Mark all read" header action — TanStack mutation.

## 8. Test plan

### Existing Playwright suite (32 tests)
- Add `tests/e2e/global-setup.ts` that calls `supabase db reset`, creates fixture user `e2e@sunext.test`, grants membership.
- `playwright.config.ts` env vars loaded from `.env.test`.
- `tests/e2e/auth.setup.ts` signs in once and stores cookies on the `browserContext`.
- Add `/login` + `/signup` to route list in `states.spec.ts`.

### New unit tests
- `lib/db/projects.test.ts` — mocks `supabase-js`; asserts call signatures.
- `lib/db/tasks.test.ts` — same for tasks; covers `listTasksByStatus`, `getTask`, `updateTask`.
- `lib/stats.test.ts` — workload clamping to 100.
- `hooks/use-tasks.test.ts` — optimistic update + rollback path.

### New integration tests (require Docker Supabase)
- `tests/integration/rls.test.ts` — two users in two workspaces; assert cross-workspace isolation.
- `tests/integration/realtime.test.ts` — two clients, different JWTs; assert channel delivery scoped to membership.

### New mutation tests (Playwright)
- `tests/e2e/mutations.spec.ts` — sign in, create a task, assert it appears.
- `tests/e2e/mutations-status.spec.ts` — toggle status; activity feed grows by 1.
- `tests/e2e/auth.spec.ts` — `/login` rejects bad creds; `/signup` creates user; logout.

### Coverage target
- 80% on `lib/db/*`, `lib/schemas/*`, `hooks/use-*.ts`. Server Components stay untested at unit level — E2E covers them.

## 9. Risks + sequencing

1. **`lib/data.ts` exports that don't map cleanly.** `findUser` / `findProject` called from Client Components. Mitigation: refactor `TaskRow` to accept `assignee` and `project` as props (§4 step 4c).
2. **KanbanBoard / PriorityChart / StatusChart use filter-by-status patterns.** Each becomes a Postgres filter; KanbanBoard would mean 5 round-trips. Mitigation: `listTasksByStatus(workspaceId)` RPC returns `{ backlog: [...], todo: [...], ... }` in one query.
3. **Server-Component `Date.now()` in `getKpis` / `getTeamWorkload`.** KPIs depend on "today". Playwright assumes deterministic output. Mitigation: server-side compute once per request; seeded dates stable.
4. **Header notifications are `"use client"`.** `unread` is a top-level constant. Split into `HeaderShell` (Server) + `HeaderBell` (Client).
5. **32 existing Playwright tests must stay green.** `seed.sql` must produce exactly the same visible text as mock fixtures (`Design billing summary`, etc.). Keep title strings byte-identical.
6. **Realtime + TanStack Query double-fetching.** Realtime callbacks MUST only `invalidateQueries`, never re-subscribe. One hook owns both the query and subscription.
7. **Next.js 16 + `@supabase/ssr` edge runtime caveat.** `@supabase/ssr` works in Node runtime. **Decision: keep middleware on Node runtime; do NOT export `export const runtime = 'edge'`.**
8. **Workspace switcher cookie lifetime.** Active-workspace cookie must be httpOnly + SameSite=Lax. Use httpOnly cookie only, never localStorage.

## 10. Concrete next steps (ordered, committable, each with a verification step)

1. **Step 1 — Infra bootstrap** (`chore(infra): add local Supabase docker stack`). Add `docker-compose.yml`, `supabase/config.toml`, `.env.example`, `.gitignore`, scripts. Verify: `npm run db:up && npm run db:status` prints URL + anon key.
2. **Step 2 — Schema + seed** (`feat(db): initial schema, RLS, and seed`). Seven migrations + `seed.sql`. Verify: `supabase db reset` succeeds; `select count(*) from projects` returns 5; RLS integration test green.
3. **Step 3 — Supabase clients + middleware** (`feat(supabase): wire clients and middleware`). `lib/supabase/*`, `lib/realtime/channels.ts`, root `middleware.ts`. Verify: `next build` passes.
4. **Step 4 — Data layer + schemas** (`feat(db): typed query wrappers and Zod schemas`). `lib/db/*`, `lib/schemas/*`, `lib/stats.ts`. Verify: unit tests green.
5. **Step 5 — Read-only page switch** (`feat(api): replace mock data with DB reads`). Convert all six pages + read-only components to call `lib/db/*`. Verify: **32/32 Playwright still green**.
6. **Step 6 — Auth pages + middleware guard** (`feat(auth): login, signup, middleware route guard`). `app/(auth)/*`, layout guard, `lib/auth/*`, Playwright global setup. Verify: auth.spec.ts green; existing 32 tests still green.
7. **Step 7 — Mutations + optimistic UI** (`feat(crud): project and task mutations`). Server Actions in `app/_actions/*`. Client mutations via TanStack Query. New pages `/projects/new`, `/projects/[id]/edit`, `/tasks/new`. Verify: `mutations.spec.ts` green.
8. **Step 8 — Realtime** (`feat(realtime): channels for tasks, activity, notifications`). Wire `useRealtimeInvalidator` into `KanbanBoard`, `ActivityFeed`, `Header`. Verify: realtime integration test green; no double-fetch in DevTools.

---

## Architectural summary

Phase E swaps the in-memory fixture layer for Supabase (Postgres + Auth + Realtime) without changing the Editorial Luxury UI surface. Server Components for initial renders (DB reads via `@supabase/ssr`'s cookie-aware server client + `middleware.ts` for session refresh); TanStack Query on Client Components for mutations, optimistic UI, and realtime-driven cache invalidation. Zod schemas in `lib/schemas/*` are the single source of truth, mirroring Postgres `text + CHECK` columns. RLS is workspace-scoped via `is_workspace_member(workspace_id)` SECURITY DEFINER — this makes multi-workspace safe and lets Realtime deliver only authorized rows. The migration proceeds in eight small, independently verifiable commits with Playwright running against a freshly-seeded local Supabase on every CI build.

## Top 3 risks

1. **32 Playwright tests could break during the read-only page switch** if seed dates drift or visible strings change. Mitigation: keep `seed.sql` byte-identical with `lib/data.ts` for any text currently asserted by E2E; run E2E after each page switch.
2. **Client Components currently import from `lib/data.ts`** (`task-row.tsx`, `kanban-board.tsx`, `header.tsx`) and cannot import server-only modules. Refactoring these to receive typed props from Server Component parents is the main "page switch" work item.
3. **Realtime + TanStack Query double-fetching** if a developer wires a channel that also calls `refetch()` or rewrites the cache. Mandate invalidation-only and a single hook owns both query and subscription.

## Confidence

**Medium-high** that 32/32 Playwright can stay green through the migration, **conditional on** (a) `seed.sql` being byte-identical to existing fixture text, (b) `TaskRow` / `Header` / `KanbanBoard` prop-refactor being completed before the read-only switch, and (c) `@supabase/ssr` running on Node runtime (not Edge) in `middleware.ts`.
