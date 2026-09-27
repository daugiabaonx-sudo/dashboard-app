-- 0005_tasks.sql
-- Tasks table with workspace-scoped RLS and activity_log trigger.

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text not null default '',
  status text not null default 'backlog'
    check (status in ('backlog','todo','in_progress','in_review','done')),
  priority text not null default 'medium'
    check (priority in ('low','medium','high','urgent')),
  assignee_id uuid references public.profiles(id),
  reporter_id uuid not null references public.profiles(id),
  due_date date not null,
  estimated_hours integer not null default 0,
  logged_hours integer not null default 0,
  progress integer not null default 0 check (progress between 0 and 100),
  blocked boolean not null default false,
  blocker_note text,
  tags text[] not null default '{}',
  comments integer not null default 0,
  attachments integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_workspace_idx on public.tasks(workspace_id);
create index if not exists tasks_project_idx on public.tasks(project_id);
create index if not exists tasks_status_idx on public.tasks(workspace_id, status);
create index if not exists tasks_assignee_idx on public.tasks(assignee_id);

drop trigger if exists tasks_touch on public.tasks;
create trigger tasks_touch before update on public.tasks
  for each row execute function public.touch_updated_at();

alter table public.tasks enable row level security;

create policy "tasks_member_all"
  on public.tasks for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- Activity logging trigger: writes one activity_log row on INSERT or on
-- meaningful UPDATE (status change, assignment). Minor edits are skipped.
create or replace function public.log_task_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type text;
  v_title text;
  v_message text;
begin
  if (tg_op = 'INSERT') then
    v_type := 'task_created';
    v_title := new.title;
    v_message := 'created a new task';
  elsif (tg_op = 'UPDATE') then
    if new.status = 'done' and old.status is distinct from 'done' then
      v_type := 'task_completed';
      v_message := 'marked complete';
    elsif new.status is distinct from old.status then
      v_type := 'status_changed';
      v_message := 'changed status';
    elsif new.assignee_id is distinct from old.assignee_id then
      v_type := 'task_assigned';
      v_message := 'reassigned';
    else
      return new;
    end if;
    v_title := new.title;
  end if;

  insert into public.activity_log(
    workspace_id, actor_id, type, target_type, target_id, target_title, message
  ) values (
    new.workspace_id,
    coalesce(auth.uid(), new.reporter_id),
    v_type,
    'task',
    new.id,
    v_title,
    v_message
  );
  return new;
end $$;

drop trigger if exists tasks_log_change on public.tasks;
create trigger tasks_log_change
  after insert or update on public.tasks
  for each row execute function public.log_task_change();
