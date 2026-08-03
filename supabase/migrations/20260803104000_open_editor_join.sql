-- Let any authenticated user enter the editor immediately:
-- first account becomes admin, later accounts join as editors.
create or replace function public.ensure_workspace_member(p_display_name text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_role text;
  assigned_role text;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  select role
  into existing_role
  from public.workspace_members
  where user_id = auth.uid();

  if existing_role is not null then
    return existing_role;
  end if;

  if not exists (select 1 from public.workspace_members) then
    assigned_role := 'admin';
  else
    assigned_role := 'editor';
  end if;

  insert into public.workspace_members (user_id, role, display_name)
  values (auth.uid(), assigned_role, nullif(trim(p_display_name), ''));

  return assigned_role;
end;
$$;

revoke execute on function public.ensure_workspace_member(text) from public, anon;
grant execute on function public.ensure_workspace_member(text) to authenticated;
