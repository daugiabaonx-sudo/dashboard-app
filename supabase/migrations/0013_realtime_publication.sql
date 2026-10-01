-- 0013_realtime_publication.sql
-- Realtime v3 (supabase/realtime:v2.30.34) reads logical-decoded changes via
-- the supabase_realtime publication. Create the publication; add the three
-- tables the dashboard subscribes to (subscriptions.tsx):
--   public.tasks          — kanban + activity invalidation
--   public.activity_log   — recent activity feed
--   public.notifications  — bell badge
--
-- Profiles are NOT in the publication — we don't stream profile changes.
-- Storage tables are NOT created (Storage is excluded from this stack).
--
-- Idempotent: do blocks guard pg_publication + pg_publication_tables so
-- the migration is safe to re-run on every db:reset.
--
-- REPLICA IDENTITY FULL on the three tables ensures the OLD row is included
-- in UPDATE/DELETE change events. Without it, Realtime v3's `old` field is
-- NULL and DELETE-based filters (e.g. user_id=eq.<id> on notifications) cannot
-- match.

do $do$
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime;
  end if;
end $do$;

do $do$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tasks'
  ) then
    alter publication supabase_realtime add table public.tasks;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'activity_log'
  ) then
    alter publication supabase_realtime add table public.activity_log;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $do$;

alter table public.tasks replica identity full;
alter table public.activity_log replica identity full;
alter table public.notifications replica identity full;
