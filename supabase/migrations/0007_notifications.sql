-- 0007_notifications.sql
-- Per-user notifications. RLS scoped to the owning user only.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('deadline','mention','assigned','completed','blocked')),
  title text not null,
  body text not null,
  link text not null default '/',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications(user_id, read, created_at desc);

alter table public.notifications enable row level security;

create policy "notifications_self_all"
  on public.notifications for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
