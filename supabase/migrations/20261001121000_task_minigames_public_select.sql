-- Custom (task set) steps keep one minigame per task in payload.tasks[].instance_key.
-- Unity's Database Sync reads with the anon key, so the published-content policy must
-- also expose instances referenced from a task, not only payload.instance_id / instance_key.
alter policy minigame_instances_published_public_select
on public.minigame_instances
using (
  exists (
    select 1
    from public.quest_steps qs
    join public.quests q on q.id = qs.quest_id
    join public.questlines ql on ql.id = q.questline_id
    where ql.status = 'published'
      and (
        coalesce(qs.payload ->> 'instance_id', '') = minigame_instances.key
        or coalesce(qs.payload ->> 'instance_key', '') = minigame_instances.key
        or coalesce(qs.payload -> 'tasks', '[]'::jsonb) @> jsonb_build_array(jsonb_build_object('instance_key', minigame_instances.key))
      )
  )
);
