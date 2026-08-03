create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.has_any_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.workspace_members);
$$;

create or replace function private.is_quest_editor(check_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members
    where user_id = check_user
      and role in ('admin', 'editor')
  );
$$;

create or replace function private.is_quest_admin(check_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members
    where user_id = check_user
      and role = 'admin'
  );
$$;

create or replace function public.claim_first_admin(p_display_name text default null)
returns boolean
language plpgsql
security invoker
set search_path = public, private
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  if private.has_any_member() then
    return false;
  end if;

  insert into public.workspace_members (user_id, role, display_name)
  values (auth.uid(), 'admin', nullif(trim(p_display_name), ''));

  return true;
end;
$$;

revoke execute on function public.is_quest_editor(uuid) from public, anon, authenticated;
revoke execute on function public.is_quest_admin(uuid) from public, anon, authenticated;
revoke execute on function public.claim_first_admin(text) from anon;
grant execute on function public.claim_first_admin(text) to authenticated;

alter function public.set_updated_at() set search_path = public;

alter policy workspace_members_select
on public.workspace_members
using (user_id = auth.uid() or private.is_quest_admin());

alter policy workspace_members_bootstrap
on public.workspace_members
with check (user_id = auth.uid() and not private.has_any_member());

alter policy workspace_members_admin_insert
on public.workspace_members
with check (private.is_quest_admin());

alter policy workspace_members_admin_update
on public.workspace_members
using (private.is_quest_admin())
with check (private.is_quest_admin());

alter policy workspace_members_admin_delete
on public.workspace_members
using (private.is_quest_admin());

alter policy catalog_entries_editor_insert
on public.catalog_entries
with check (private.is_quest_editor());

alter policy catalog_entries_editor_update
on public.catalog_entries
using (private.is_quest_editor())
with check (private.is_quest_editor());

alter policy catalog_entries_editor_delete
on public.catalog_entries
using (private.is_quest_editor());

alter policy step_type_definitions_editor_insert
on public.step_type_definitions
with check (private.is_quest_editor());

alter policy step_type_definitions_editor_update
on public.step_type_definitions
using (private.is_quest_editor())
with check (private.is_quest_editor());

alter policy step_type_definitions_editor_delete
on public.step_type_definitions
using (private.is_quest_editor());

alter policy questlines_editor_select
on public.questlines
using (private.is_quest_editor());

alter policy questlines_editor_insert
on public.questlines
with check (private.is_quest_editor());

alter policy questlines_editor_update
on public.questlines
using (private.is_quest_editor())
with check (private.is_quest_editor());

alter policy questlines_editor_delete
on public.questlines
using (private.is_quest_editor());

alter policy quests_editor_select
on public.quests
using (private.is_quest_editor());

alter policy quests_editor_insert
on public.quests
with check (private.is_quest_editor());

alter policy quests_editor_update
on public.quests
using (private.is_quest_editor())
with check (private.is_quest_editor());

alter policy quests_editor_delete
on public.quests
using (private.is_quest_editor());

alter policy quest_prerequisites_editor_all
on public.quest_prerequisites
using (private.is_quest_editor())
with check (private.is_quest_editor());

alter policy quest_steps_editor_select
on public.quest_steps
using (private.is_quest_editor());

alter policy quest_steps_editor_insert
on public.quest_steps
with check (private.is_quest_editor());

alter policy quest_steps_editor_update
on public.quest_steps
using (private.is_quest_editor())
with check (private.is_quest_editor());

alter policy quest_steps_editor_delete
on public.quest_steps
using (private.is_quest_editor());

alter policy quest_rewards_editor_select
on public.quest_rewards
using (private.is_quest_editor());

alter policy quest_rewards_editor_insert
on public.quest_rewards
with check (private.is_quest_editor());

alter policy quest_rewards_editor_update
on public.quest_rewards
using (private.is_quest_editor())
with check (private.is_quest_editor());

alter policy quest_rewards_editor_delete
on public.quest_rewards
using (private.is_quest_editor());

alter policy dialogues_editor_select
on public.dialogues
using (private.is_quest_editor());

alter policy dialogues_editor_insert
on public.dialogues
with check (private.is_quest_editor());

alter policy dialogues_editor_update
on public.dialogues
using (private.is_quest_editor())
with check (private.is_quest_editor());

alter policy dialogues_editor_delete
on public.dialogues
using (private.is_quest_editor());

alter policy dialogue_lines_editor_select
on public.dialogue_lines
using (private.is_quest_editor());

alter policy dialogue_lines_editor_insert
on public.dialogue_lines
with check (private.is_quest_editor());

alter policy dialogue_lines_editor_update
on public.dialogue_lines
using (private.is_quest_editor())
with check (private.is_quest_editor());

alter policy dialogue_lines_editor_delete
on public.dialogue_lines
using (private.is_quest_editor());

alter policy minigame_instances_editor_select
on public.minigame_instances
using (private.is_quest_editor());

alter policy minigame_instances_editor_insert
on public.minigame_instances
with check (private.is_quest_editor());

alter policy minigame_instances_editor_update
on public.minigame_instances
using (private.is_quest_editor())
with check (private.is_quest_editor());

alter policy minigame_instances_editor_delete
on public.minigame_instances
using (private.is_quest_editor());

alter policy questline_revisions_editor_select
on public.questline_revisions
using (private.is_quest_editor());

alter policy questline_revisions_editor_insert
on public.questline_revisions
with check (private.is_quest_editor());

alter policy questline_revisions_editor_update
on public.questline_revisions
using (private.is_quest_editor())
with check (private.is_quest_editor());

alter policy questline_revisions_editor_delete
on public.questline_revisions
using (private.is_quest_editor());

alter policy audit_log_editor_select
on public.audit_log
using (private.is_quest_editor());

alter policy audit_log_editor_insert
on public.audit_log
with check (private.is_quest_editor() and user_id = auth.uid());

drop policy if exists dialogues_published_public_select on public.dialogues;
drop policy if exists dialogue_lines_published_public_select on public.dialogue_lines;
drop policy if exists minigame_instances_public_select on public.minigame_instances;

drop function public.is_quest_editor(uuid);
drop function public.is_quest_admin(uuid);
