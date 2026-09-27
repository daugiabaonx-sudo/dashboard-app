-- 0009_signup_membership.sql — Extend handle_new_user() so fresh sign-ups also land in workspace_members against DEFAULT_WORKSPACE_ID. Overrides the version defined in 0002_profiles.sql; idempotent.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare v_default_workspace uuid := $q$00000000-0000-0000-0000-000000000001$q$;
begin
  insert into public.profiles (id, email, full_name, initials)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>$q$full_name$q$, $q$$q$),
    coalesce(new.raw_user_meta_data->>$q$initials$q$, $q$$q$)
  ) on conflict (id) do nothing;
  if exists (select 1 from public.workspaces where id = v_default_workspace) then
    insert into public.workspace_members(workspace_id, user_id, role)
    values (v_default_workspace, new.id, $q$viewer$q$)
    on conflict (workspace_id, user_id) do nothing;
  end if;
  return new;
end $$;
do $$
begin
  if exists (select 1 from pg_tables where schemaname=$q$auth$q$ and tablename=$q$users$q$) then
    execute $q$drop trigger if exists on_auth_user_created on auth.users$q$;
    execute $q$create trigger on_auth_user_created
             after insert on auth.users
             for each row execute function public.handle_new_user()$q$;
  end if;
end $$;