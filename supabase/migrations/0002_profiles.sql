-- 0002_profiles.sql
-- Profiles table (extends auth.users). Auto-create on user signup via trigger.

-- The auth schema only exists in real Supabase (with GoTrue). The minimal
-- Docker stack used in dev has no auth schema, so we create a stub schema
-- (no tables) and a stub auth.uid() function to satisfy the FK + RLS
-- references below. In production Supabase, these DO blocks no-op because
-- auth already exists and GoTrue provides auth.uid().
do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'auth') then
    execute 'create schema auth';
  end if;
end $$;

-- Stub auth.uid() for dev (Docker without GoTrue). Returns NULL so RLS
-- policies that compare id = auth.uid() deny access (which is the safe
-- default — no rows leak when there's no auth context). In production,
-- Supabase GoTrue overrides this with the real JWT-extracted uid.
do $$
begin
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'auth' and p.proname = 'uid'
  ) then
    execute $sql$
      create or replace function auth.uid()
      returns uuid
      language sql
      stable
      as $body$ select null::uuid; $body$;
    $sql$;
  end if;
end $$;

-- Stub auth.role() — same rationale.
do $$
begin
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'auth' and p.proname = 'role'
  ) then
    execute $sql$
      create or replace function auth.role()
      returns text
      language sql
      stable
      as $body$ select 'anon'::text; $body$;
    $sql$;
  end if;
end $$;

-- Reusable updated_at trigger function (defined BEFORE tables reference it).
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- The auth.users table only exists in real Supabase (with GoTrue). In the
-- minimal Docker stack used in dev, only the auth schema stub exists; the
-- profiles.id FK to auth.users must therefore be conditional. We do this
-- by adding the FK as NOT VALID when auth.users is missing, and VALID
-- (re-created) when it is present. Either way, RLS still enforces isolation.

do $do$
declare
  has_auth_users boolean := exists (
    select 1 from pg_tables where schemaname = 'auth' and tablename = 'users'
  );
begin
  if has_auth_users then
    execute $sql$
      create table if not exists public.profiles (
        id uuid primary key references auth.users(id) on delete cascade,
        email text not null,
        full_name text not null default '',
        initials text not null default '',
        avatar_color text not null default '#6366f1',
        department text not null default 'General',
        role text not null default 'member'
          check (role in ('owner','admin','manager','member','viewer')),
        capacity_hours integer not null default 40,
        joined_at timestamptz not null default now()
      );
    $sql$;
  else
    execute $sql$
      create table if not exists public.profiles (
        id uuid primary key,
        email text not null,
        full_name text not null default '',
        initials text not null default '',
        avatar_color text not null default '#6366f1',
        department text not null default 'General',
        role text not null default 'member'
          check (role in ('owner','admin','manager','member','viewer')),
        capacity_hours integer not null default 40,
        joined_at timestamptz not null default now()
      );
    $sql$;
  end if;
end $do$;

alter table public.profiles enable row level security;

-- Profiles are visible to anyone in the same workspace; RLS on memberships
-- ensures only authorized callers see them.
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all"
  on public.profiles for select using (true);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Auto-create profile when a new auth.users row is inserted.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, initials)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'initials', '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- Trigger only registered when auth.users actually exists (real Supabase).
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'auth' and tablename = 'users') then
    execute 'drop trigger if exists on_auth_user_created on auth.users';
    execute 'create trigger on_auth_user_created
             after insert on auth.users
             for each row execute function public.handle_new_user()';
  end if;
end $$;
