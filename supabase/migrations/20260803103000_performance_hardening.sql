create index if not exists audit_log_user_id_idx
  on public.audit_log (user_id);

create index if not exists quest_prerequisites_prerequisite_quest_id_idx
  on public.quest_prerequisites (prerequisite_quest_id);

create index if not exists quest_rewards_quest_id_idx
  on public.quest_rewards (quest_id);

create index if not exists quest_rewards_step_id_idx
  on public.quest_rewards (step_id);

create index if not exists quest_steps_step_type_idx
  on public.quest_steps (step_type);

create index if not exists questline_revisions_created_by_idx
  on public.questline_revisions (created_by);

create index if not exists questlines_created_by_idx
  on public.questlines (created_by);

create index if not exists questlines_updated_by_idx
  on public.questlines (updated_by);

create index if not exists quests_created_by_idx
  on public.quests (created_by);

create index if not exists quests_updated_by_idx
  on public.quests (updated_by);

alter policy workspace_members_select
on public.workspace_members
using (
  user_id = (select auth.uid())
  or (select private.is_quest_admin())
);

alter policy workspace_members_bootstrap
on public.workspace_members
with check (
  user_id = (select auth.uid())
  and not (select private.has_any_member())
);

alter policy audit_log_editor_insert
on public.audit_log
with check (
  (select private.is_quest_editor())
  and user_id = (select auth.uid())
);
