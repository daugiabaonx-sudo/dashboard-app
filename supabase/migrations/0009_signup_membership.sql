-- 0009_signup_membership.sql — Extend handle_new_user() so fresh sign-ups also land in workspace_members against DEFAULT_WORKSPACE_ID. Overrides the version defined in 0002_profiles.sql; idempotent.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $fn$
declare v_default_workspace uuid := $uuid$00000000-0000-0000-0000-000000000001$uuid$;
begin
  insert into public.profiles (id, email, full_name, initials)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>$meta$full_name$meta$, $empty$$empty$),
    coalesce(new.raw_user_meta_data->>$meta$initials$meta$, $empty$$empty$)
  ) on conflict (id) do nothing;
  if exists (select 1 from public.workspaces where id = v_default_workspace) then
    insert into public.workspace_members(workspace_id, user_id, role)
    values (v_default_workspace, new.id, $role$viewer$role$)
    on conflict (workspace_id, user_id) do nothing;
  end if;
  return new;
end $fn$;

do $boot$
begin
  if exists (select 1 from pg_tables where schemaname=$ident$auth$ident$ and tablename=$ident$users$ident$) then
    execute $ddl$drop trigger if exists on_auth_user_created on auth.users$ddl$;
    execute $ddl$create trigger on_auth_user_created
             after insert on auth.users
             for each row execute function public.handle_new_user()$ddl$;
  end if;
end $boot$;
