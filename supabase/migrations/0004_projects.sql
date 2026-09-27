-- 0004_projects.sql
-- Projects table with workspace-scoped RLS.

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  description text not null default '',
  status text not null default 'planning'
    check (status in ('planning','active','on_hold','completed')),
  priority text not null default 'medium'
    check (priority in ('low','medium','high','critical')),
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

create index if not exists projects_workspace_idx
  on public.projects(workspace_id);

drop trigger if exists projects_touch on public.projects;
create trigger projects_touch before update on public.projects
  for each row execute function public.touch_updated_at();

alter table public.projects enable row level security;

create policy "projects_member_all"
  on public.projects for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
