-- 0006_activity_log.sql
-- Append-only activity log scoped to workspace membership.

create table if not exists public.activity_log (
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

create index if not exists activity_workspace_idx
  on public.activity_log(workspace_id, created_at desc);

alter table public.activity_log enable row level security;

drop policy if exists "activity_member_select" on public.activity_log;
create policy "activity_member_select"
  on public.activity_log for select
  using (public.is_workspace_member(workspace_id));

drop policy if exists "activity_member_insert" on public.activity_log;
create policy "activity_member_insert"
  on public.activity_log for insert
  with check (public.is_workspace_member(workspace_id));

-- No update / delete policies → append-only at the RLS layer.
