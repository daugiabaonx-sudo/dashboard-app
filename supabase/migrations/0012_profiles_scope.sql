-- 0012_profiles_scope.sql — Scope profiles_select_all to self + shared-workspace
-- members. Replaces the over-permissive policy from 0002_profiles.sql, which let
-- any authenticated user read every profile row globally.
--
-- Policy behavior (after this migration):
--   SELECT is allowed on a profile row when EITHER:
--     (a) id = auth.uid()                                 — the row is the caller's own profile
--     OR
--     (b) there exists at least one workspace where BOTH
--         auth.uid() AND profiles.id are members
--         (shared-workspace lookup via workspace_members)
--
--   When auth.uid() is NULL (dev stub in 0002_profiles.sql returns NULL because
--   the local Docker stack has no GoTrue), both clauses evaluate to false, so
--   the policy returns zero rows. That is the safe default and matches the
--   comment on the stub auth.uid() function ("no rows leak when there's no
--   auth context").
--
--   The lib/supabase/mock.ts adapter runs entirely in-memory against JS Maps
--   and never queries Postgres, so mock-mode profile reads are unaffected.
--
-- The existing helper public.is_workspace_member(ws uuid) only checks the
-- caller against auth.uid(), so it cannot compare two arbitrary user ids.
-- We inline the EXISTS subquery against workspace_members directly — this is
-- also what 0009_signup_membership.sql does for the signup flow.
--
-- Idempotent: drop-if-exists then recreate.

drop policy if exists "profiles_select_all" on public.profiles;

create policy "profiles_select_all"
  on public.profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.workspace_members wm_self
      join public.workspace_members wm_other
        on wm_other.workspace_id = wm_self.workspace_id
      where wm_self.user_id = auth.uid()
        and wm_other.user_id = profiles.id
    )
  );
