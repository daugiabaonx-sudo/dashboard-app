-- 0014_decision_requests.sql
-- Human-raised Blocker & Decision requests (F1 Giơ tay, F3 Đang chờ ai, F6 Khép vòng).
-- Scoped to workspace membership via RLS, with a SECURITY DEFINER trigger to
-- notify the unblocker on INSERT and the raiser on resolution.

create table if not exists public.decision_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  planner_task_id text not null,
  task_title text not null,
  project_name text not null default '',
  type text not null
    check (type in ('decision','waiting_on','missing_info','missing_resource','technical')),
  need text not null check (char_length(need) between 1 and 500),
  raised_by uuid not null references public.profiles(id) on delete cascade,
  unblocker_id uuid not null references public.profiles(id) on delete cascade,
  needed_by date null,
  status text not null default 'open'
    check (status in ('open','resolved','cancelled')),
  resolution text null check (resolution is null or char_length(resolution) <= 500),
  resolved_by uuid null references public.profiles(id) on delete set null,
  resolved_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists decision_requests_open_task_uidx
  on public.decision_requests(workspace_id, planner_task_id)
  where status = 'open';

create index if not exists decision_requests_workspace_status_idx
  on public.decision_requests(workspace_id, status, created_at desc);

create index if not exists decision_requests_unblocker_idx
  on public.decision_requests(unblocker_id, status);

drop trigger if exists decision_requests_touch on public.decision_requests;
create trigger decision_requests_touch before update on public.decision_requests
  for each row execute function public.touch_updated_at();

alter table public.decision_requests enable row level security;

drop policy if exists "decision_requests_select_member" on public.decision_requests;
create policy "decision_requests_select_member"
  on public.decision_requests for select
  using (public.is_workspace_member(workspace_id));

drop policy if exists "decision_requests_insert_member" on public.decision_requests;
create policy "decision_requests_insert_member"
  on public.decision_requests for insert
  with check (
    public.is_workspace_member(workspace_id)
    and raised_by = auth.uid()
    and exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = decision_requests.workspace_id
        and wm.user_id = auth.uid()
        and wm.role in ('owner','admin','manager','member')
    )
  );

drop policy if exists "decision_requests_update_actor" on public.decision_requests;
create policy "decision_requests_update_actor"
  on public.decision_requests for update
  using (
    public.is_workspace_member(workspace_id)
    and (
      unblocker_id = auth.uid()
      or raised_by = auth.uid()
      or exists (
        select 1 from public.workspace_members wm
        where wm.workspace_id = decision_requests.workspace_id
          and wm.user_id = auth.uid()
          and wm.role in ('owner','admin','manager')
      )
    )
  )
  with check (
    public.is_workspace_member(workspace_id)
  );

-- Notify unblocker on new request and notify raiser on resolution.
-- SECURITY DEFINER so it can insert into public.notifications for another user
-- despite notifications_self_all RLS.
create or replace function public.notify_decision_request_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.notifications (user_id, type, title, body, link)
    values (
      new.unblocker_id,
      'blocked',
      'Cần gỡ vướng: ' || new.task_title,
      new.need,
      '/?focus=' || new.planner_task_id
    );
  elsif (tg_op = 'UPDATE' and old.status = 'open' and new.status = 'resolved') then
    insert into public.notifications (user_id, type, title, body, link)
    values (
      new.raised_by,
      'blocked',
      'Đã gỡ vướng: ' || new.task_title,
      coalesce(nullif(trim(new.resolution), ''), 'Yêu cầu gỡ vướng đã được xử lý.'),
      '/?focus=' || new.planner_task_id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists decision_requests_notify on public.decision_requests;
create trigger decision_requests_notify
  after insert or update on public.decision_requests
  for each row execute function public.notify_decision_request_change();

do $do$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select, insert, update on public.decision_requests to anon, authenticated, service_role;
  end if;
end $do$;
