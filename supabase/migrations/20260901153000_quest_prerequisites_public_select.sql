-- Allow Unity Database Sync (anon key) to read prerequisite edges for published questlines,
-- matching quest_steps / quest_rewards public SELECT policies.
-- Idempotent: safe to re-run.

drop policy if exists quest_prerequisites_published_public_select on public.quest_prerequisites;

create policy quest_prerequisites_published_public_select
on public.quest_prerequisites for select
using (
  exists (
    select 1
    from public.quests
    join public.questlines on questlines.id = quests.questline_id
    where quests.id = quest_prerequisites.quest_id
      and questlines.status = 'published'
  )
);
