-- Public extras for the Hebrew viewer: dialogues + minigame instances
-- referenced by published revision documents (anon cannot read draft tables).

create or replace function public.get_published_viewer_extras()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  dialogue_keys text[] := array[]::text[];
  minigame_keys text[] := array[]::text[];
  dialogues_json jsonb := '{}'::jsonb;
  minigames_json jsonb := '{}'::jsonb;
begin
  select
    coalesce(array_agg(distinct key) filter (where key is not null and key <> ''), array[]::text[]),
    coalesce(array_agg(distinct mg) filter (where mg is not null and mg <> ''), array[]::text[])
  into dialogue_keys, minigame_keys
  from (
    select
      nullif(trim(both from quest->>'start_dialogue_id'), '') as key,
      null::text as mg
    from public.questline_revisions qr
    cross join lateral jsonb_array_elements(coalesce(qr.document->'quests', '[]'::jsonb)) quest
    where qr.status = 'published'

    union all

    select
      nullif(trim(both from quest->>'turn_in_dialogue_id'), ''),
      null
    from public.questline_revisions qr
    cross join lateral jsonb_array_elements(coalesce(qr.document->'quests', '[]'::jsonb)) quest
    where qr.status = 'published'

    union all

    select
      nullif(trim(both from step->'payload'->>'dialogue_id'), ''),
      coalesce(
        nullif(trim(both from step->'payload'->>'instance_id'), ''),
        nullif(trim(both from step->'payload'->>'instance_key'), '')
      )
    from public.questline_revisions qr
    cross join lateral jsonb_array_elements(coalesce(qr.document->'quests', '[]'::jsonb)) quest
    cross join lateral jsonb_array_elements(coalesce(quest->'steps', '[]'::jsonb)) step
    where qr.status = 'published'
  ) refs;

  select coalesce(jsonb_object_agg(d.key, jsonb_build_object(
    'speaker', d.speaker_external_id,
    'lines', coalesce((
      select jsonb_agg(dl.content order by dl.line_order, dl.locale)
      from public.dialogue_lines dl
      where dl.dialogue_id = d.id
    ), '[]'::jsonb)
  )), '{}'::jsonb)
  into dialogues_json
  from public.dialogues d
  where d.key = any(dialogue_keys);

  select coalesce(jsonb_object_agg(m.key, jsonb_build_object(
    'minigame_id', m.minigame_id,
    'instruction', m.instruction,
    'tasks', coalesce(m.tasks, '[]'::jsonb),
    'target', m.target,
    'variant', m.variant,
    'success', m.success,
    'params', coalesce(m.params, '{}'::jsonb)
  )), '{}'::jsonb)
  into minigames_json
  from public.minigame_instances m
  where m.key = any(minigame_keys);

  return jsonb_build_object(
    'dialogues', dialogues_json,
    'minigames', minigames_json
  );
end;
$$;

revoke all on function public.get_published_viewer_extras() from public;
grant execute on function public.get_published_viewer_extras() to anon, authenticated;
