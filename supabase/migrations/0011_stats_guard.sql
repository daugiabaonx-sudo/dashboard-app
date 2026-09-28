-- 0011_stats_guard.sql — SECURITY FIX A1.
-- workspace_kpis and workspace_workload are SECURITY DEFINER, so RLS on the
-- underlying tables is bypassed for the caller. Without a guard, any
-- authenticated user can pass any workspace_id and read aggregates for a
-- workspace they are NOT a member of (cross-workspace data leak).
--
-- This migration:
--   1. Re-defines is_workspace_member (idempotent) if 0003_workspaces.sql did
--      not run or was skipped — keeps the helper available to these RPCs.
--   2. Drops and recreates the two RPCs with an early-return guard:
--        - if auth.uid() is NULL (mock mode / no session) return empty
--        - if auth.uid() is not a member of the requested workspace_id
--          return empty
--      Returning an empty result set is intentional: callers already handle
--      `(data ?? [])` and render zero rows, so the UI degrades gracefully
--      instead of throwing.
--
-- Idempotent: create or replace + drop ... if exists make this safe to re-run.
-- search_path stays pinned to public for SECURITY DEFINER safety.

-- Step 1: ensure the membership helper exists (idempotent).
create or replace function public.is_workspace_member(ws uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws and user_id = auth.uid()
  );
$$;

-- Step 2: drop the old RPC definitions so we can replace them cleanly.
drop function if exists public.workspace_kpis(uuid);
drop function if exists public.workspace_workload(uuid);

-- Step 3: recreate workspace_kpis with the membership guard.
-- Wrapped in a CTE: the first CTE is the guard (returns 0 rows when not a
-- member); the second is the original aggregate query, which only runs when
-- the guard emits rows. Empty result set = graceful "no data" for the caller.
create or replace function public.workspace_kpis(workspace_id uuid)
returns setof jsonb
language sql stable security definer set search_path = public as $$
  with guard as (
    select 1
    where auth.uid() is not null
      and public.is_workspace_member($1)
  ),
  counts as (
    select
      (select count(*) from public.projects where workspace_id = $1 and status = $q$active$q$) as active_projects,
      (select count(*) from public.tasks where workspace_id = $1 and status = $q$done$q$) as tasks_completed,
      (select count(*) from public.tasks where workspace_id = $1 and status = $q$in_progress$q$) as in_progress,
      (select count(*) from public.tasks where workspace_id = $1 and status <> $q$done$q$ and due_date < current_date) as overdue,
      (select count(*) from public.tasks where workspace_id = $1 and status <> $q$done$q$
        and due_date >= current_date and due_date <= current_date + interval $q$7 days$q$) as upcoming
  )
  select jsonb_build_array(
    jsonb_build_object($q$id$q$,$q$active-projects$q$,$q$label$q$,$q$Active projects$q$,$q$value$q$,active_projects,$q$delta$q$,12,$q$deltaLabel$q$,$q$vs last month$q$,$q$trend$q$,$q$up$q$,$q$intent$q$,$q$neutral$q$),
    jsonb_build_object($q$id$q$,$q$tasks-completed$q$,$q$label$q$,$q$Tasks completed$q$,$q$value$q$,tasks_completed,$q$delta$q$,8,$q$deltaLabel$q$,$q$this week$q$,$q$trend$q$,$q$up$q$,$q$intent$q$,$q$good$q$),
    jsonb_build_object($q$id$q$,$q$in-progress$q$,$q$label$q$,$q$In progress$q$,$q$value$q$,in_progress,$q$delta$q$,3,$q$deltaLabel$q$,$q$vs yesterday$q$,$q$trend$q$,$q$up$q$,$q$intent$q$,$q$neutral$q$),
    jsonb_build_object($q$id$q$,$q$overdue$q$,$q$label$q$,$q$Overdue$q$,$q$value$q$,overdue,
      $q$delta$q$, case when overdue > 0 then 1 else 0 end,
      $q$deltaLabel$q$, $q$needs attention$q$,
      $q$trend$q$, case when overdue > 0 then $q$up$q$ else $q$flat$q$ end,
      $q$intent$q$, case when overdue > 0 then $q$critical$q$ else $q$good$q$ end),
    jsonb_build_object($q$id$q$,$q$upcoming-deadlines$q$,$q$label$q$,$q$Upcoming deadlines$q$,$q$value$q$,upcoming,$q$delta$q$,0,$q$deltaLabel$q$,$q$next 7 days$q$,$q$trend$q$,$q$flat$q$,$q$intent$q$, case when upcoming > 3 then $q$warning$q$ else $q$neutral$q$ end)
  ) from counts, guard
$$;

-- Step 4: recreate workspace_workload with the membership guard.
-- Original query is wrapped in a CTE that only emits rows when the guard
-- passes; same empty-result-on-deny semantics as workspace_kpis.
create or replace function public.workspace_workload(workspace_id uuid)
returns table (
  user_id uuid,
  assigned_tasks integer,
  completed_tasks integer,
  overdue_tasks integer,
  utilization integer
) language sql stable security definer set search_path = public as $$
  with guard as (
    select 1
    where auth.uid() is not null
      and public.is_workspace_member($1)
  )
  select p.id as user_id,
    coalesce(count(t.id) filter (where t.assignee_id is not null), 0)::int as assigned_tasks,
    coalesce(count(t.id) filter (where t.assignee_id is not null and t.status = $q$done$q$), 0)::int as completed_tasks,
    coalesce(count(t.id) filter (where t.assignee_id is not null and t.status <> $q$done$q$ and t.due_date < current_date), 0)::int as overdue_tasks,
    case when p.capacity_hours > 0
      then least(100, round(
        coalesce(sum(t.logged_hours) filter (where t.assignee_id is not null), 0)::numeric
        / p.capacity_hours * 100))::int
      else 0
    end as utilization
  from guard
  cross join public.workspace_members wm
  join public.profiles p on p.id = wm.user_id
  left join public.tasks t on t.workspace_id = wm.workspace_id and t.assignee_id = wm.user_id
  where wm.workspace_id = $1
  group by p.id, p.capacity_hours
$$;