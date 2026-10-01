-- supabase/seed-users.sql
-- Stub auth.users rows with deterministic UUIDs so seed.sql's
-- profiles.id FK (0002_profiles.sql references auth.users) is satisfied
-- during the entrypoint wrapper's apply phase. seed-auth.js later upserts
-- the same rows via GoTrue's admin API (idempotent on conflict).
--
-- This file is written to /tmp/sunext-initdb/ by db-sync.js and applied
-- by scripts/docker-entrypoint-wrapper.sh AFTER 0013_realtime_publication.sql
-- and BEFORE seed.sql.
--
-- On a fresh volume the wrapper applies Cloud's bundled init scripts
-- (00000000000001-auth-schema.sql + GoTrue migrations). GoTrue's later
-- migrations add / rename / drop columns on auth.users (e.g.
-- `email_change_token` → `email_change_token_current` + `_new` in
-- 20221208132122; `confirmed_at` is added by 20230116144300). Pinning
-- the full column list makes this seed brittle to those migrations.
--
-- Pin only the columns guaranteed-stable across every Cloud image:
--   instance_id, id, aud, role, email, raw_user_meta_data,
--   is_super_admin, created_at, updated_at
-- These are present in 00000000000001-auth-schema.sql's CREATE TABLE
-- and are never renamed. The wrapper applies this BEFORE GoTrue
-- starts, so GoTrue's later migrations haven't run yet on first
-- startup — but on a re-apply (volume preserved) those migrations
-- HAVE run, and we still only need the original columns.
--
-- `on conflict (id) do nothing` makes this safe on the second start
-- (rows from the previous `db:reset` already exist; we don't overwrite
-- the password hash that GoTrue wrote). GoTrue's admin POST later
-- upserts via the JSON body (which GoTrue normalizes onto the
-- existing row), so the stub row is replaced atomically.

insert into auth.users (
  instance_id, id, aud, role, email,
  raw_user_meta_data, is_super_admin, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000000a', 'authenticated', 'authenticated', 'minhanh@sunext.io',
   jsonb_build_object('full_name','Nguyen Minh Anh','initials','MA'),
   false, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000000b', 'authenticated', 'authenticated', 'quocbao@sunext.io',
   jsonb_build_object('full_name','Tran Quoc Bao','initials','QB'),
   false, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000000c', 'authenticated', 'authenticated', 'phuong.le@sunext.io',
   jsonb_build_object('full_name','Le Hoang Phuong','initials','LP'),
   false, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000000d', 'authenticated', 'authenticated', 'thanhdat@sunext.io',
   jsonb_build_object('full_name','Pham Thanh Dat','initials','TD'),
   false, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000000e', 'authenticated', 'authenticated', 'kimtuyen@sunext.io',
   jsonb_build_object('full_name','Vu Kim Tuyen','initials','KT'),
   false, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000000f', 'authenticated', 'authenticated', 'bichngoc@sunext.io',
   jsonb_build_object('full_name','Dao Bich Ngoc','initials','BN'),
   false, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000010', 'authenticated', 'authenticated', 'giakhanh@sunext.io',
   jsonb_build_object('full_name','Hoang Gia Khanh','initials','GK'),
   false, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000011', 'authenticated', 'authenticated', 'mailinh@sunext.io',
   jsonb_build_object('full_name','Bui Thi Mai Linh','initials','ML'),
   false, now(), now())
on conflict (id) do nothing;

-- Note: auth.identities rows are created by GoTrue itself when
-- seed-auth.js provisions users via the admin API. Cloud's init
-- scripts do not pre-create auth.identities (only GoTrue's later
-- migrations do). The local stack goes:
--   1. wrapper applies this file  (creates auth.users stubs with
--      minimal columns so GoTrue's admin Scan doesn't crash on
--      missing optional columns)
--   2. seed.sql inserts profiles + workspace_members
--   3. gotrue container starts  (runs its own migrations, creates
--      auth.identities schema + factor_type, etc)
--   4. seed-auth.js calls /auth/v1/admin/users — GoTrue updates the
--      matching stub row (matching id) with the real password hash +
--      confirmation_token, and inserts the matching identities row.
--      handle_new_user() trigger updates the profile row's
--      full_name/initials from raw_user_meta_data.
