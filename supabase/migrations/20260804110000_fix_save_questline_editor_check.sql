-- Fix save_questline: call private.is_quest_editor (public helper was dropped in security hardening).

create or replace function public.save_questline(
  p_questline jsonb,
  p_quests jsonb default '[]'::jsonb,
  p_steps jsonb default '[]'::jsonb,
  p_prerequisites jsonb default '[]'::jsonb,
  p_rewards jsonb default '[]'::jsonb,
  p_dialogues jsonb default '[]'::jsonb,
  p_dialogue_lines jsonb default '[]'::jsonb,
  p_minigames jsonb default '[]'::jsonb,
  p_deleted_quest_ids uuid[] default '{}',
  p_deleted_step_ids uuid[] default '{}',
  p_deleted_dialogue_ids uuid[] default '{}',
  p_deleted_minigame_ids uuid[] default '{}',
  p_expected_updated_at timestamptz default null,
  p_force boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_line_id uuid;
  v_current_updated_at timestamptz;
  v_updated_at timestamptz;
  v_quest_ids uuid[];
  v_step_ids uuid[];
begin
  if not private.is_quest_editor() then
    raise exception 'Editor access required';
  end if;

  v_line_id := (p_questline->>'id')::uuid;

  select updated_at into v_current_updated_at
  from public.questlines
  where id = v_line_id;

  if not p_force
     and p_expected_updated_at is not null
     and v_current_updated_at is not null
     and v_current_updated_at <> p_expected_updated_at then
    raise exception 'CONFLICT';
  end if;

  insert into public.questlines (
    id, key, display_name, theme, default_giver_external_id, status,
    level_min, level_max, source_path, source_metadata, created_by, updated_by
  )
  values (
    v_line_id,
    p_questline->>'key',
    p_questline->>'display_name',
    p_questline->>'theme',
    p_questline->>'default_giver_external_id',
    'draft',
    nullif(p_questline->>'level_min', '')::integer,
    nullif(p_questline->>'level_max', '')::integer,
    p_questline->>'source_path',
    coalesce(p_questline->'source_metadata', '{}'::jsonb),
    auth.uid(),
    auth.uid()
  )
  on conflict (id) do update set
    key = excluded.key,
    display_name = excluded.display_name,
    theme = excluded.theme,
    default_giver_external_id = excluded.default_giver_external_id,
    status = excluded.status,
    level_min = excluded.level_min,
    level_max = excluded.level_max,
    source_path = excluded.source_path,
    source_metadata = excluded.source_metadata,
    updated_by = excluded.updated_by;

  insert into public.quests (
    id, questline_id, key, position, name, level_required, giver_external_id,
    summary, wait_for_npc_turn_in, status, source_path, source_metadata, created_by, updated_by
  )
  select
    (q->>'id')::uuid,
    v_line_id,
    q->>'key',
    (q->>'position')::integer,
    q->>'name',
    (q->>'level_required')::integer,
    q->>'giver_external_id',
    q->>'summary',
    coalesce((q->>'wait_for_npc_turn_in')::boolean, false),
    case when q->>'status' = 'published' then 'draft' else coalesce(q->>'status', 'draft') end,
    q->>'source_path',
    coalesce(q->'source_metadata', '{}'::jsonb),
    auth.uid(),
    auth.uid()
  from jsonb_array_elements(p_quests) q
  on conflict (id) do update set
    questline_id = excluded.questline_id,
    key = excluded.key,
    position = excluded.position,
    name = excluded.name,
    level_required = excluded.level_required,
    giver_external_id = excluded.giver_external_id,
    summary = excluded.summary,
    wait_for_npc_turn_in = excluded.wait_for_npc_turn_in,
    status = excluded.status,
    source_path = excluded.source_path,
    source_metadata = excluded.source_metadata,
    updated_by = excluded.updated_by;

  insert into public.quest_steps (
    id, quest_id, key, position, step_type, payload, source_metadata
  )
  select
    (s->>'id')::uuid,
    (s->>'quest_id')::uuid,
    s->>'key',
    (s->>'position')::integer,
    s->>'step_type',
    coalesce(s->'payload', '{}'::jsonb),
    coalesce(s->'source_metadata', '{}'::jsonb)
  from jsonb_array_elements(p_steps) s
  on conflict (id) do update set
    quest_id = excluded.quest_id,
    key = excluded.key,
    position = excluded.position,
    step_type = excluded.step_type,
    payload = excluded.payload,
    source_metadata = excluded.source_metadata;

  -- Prerequisites: replace only edges touching this line's quests.
  select array_agg(id) into v_quest_ids
  from public.quests
  where questline_id = v_line_id;

  if v_quest_ids is not null then
    delete from public.quest_prerequisites
    where quest_id = any(v_quest_ids)
       or prerequisite_quest_id = any(v_quest_ids);
  end if;

  insert into public.quest_prerequisites (quest_id, prerequisite_quest_id)
  select (e->>'quest_id')::uuid, (e->>'prerequisite_quest_id')::uuid
  from jsonb_array_elements(p_prerequisites) e;

  -- Rewards: replace only rewards of this line's quests and steps.
  if v_quest_ids is not null then
    delete from public.quest_rewards where quest_id = any(v_quest_ids);
    select array_agg(id) into v_step_ids
    from public.quest_steps
    where quest_id = any(v_quest_ids);
    if v_step_ids is not null then
      delete from public.quest_rewards where step_id = any(v_step_ids);
    end if;
  end if;

  insert into public.quest_rewards (
    id, scope, quest_id, step_id, reward_type, xp_amount, item_external_id,
    amount, source_metadata
  )
  select
    (r->>'id')::uuid,
    r->>'scope',
    nullif(r->>'quest_id', '')::uuid,
    nullif(r->>'step_id', '')::uuid,
    r->>'reward_type',
    (r->>'xp_amount')::integer,
    r->>'item_external_id',
    (r->>'amount')::integer,
    coalesce(r->'source_metadata', '{}'::jsonb)
  from jsonb_array_elements(p_rewards) r;

  -- Dialogues: upsert only the ones explicitly touched by the editor.
  insert into public.dialogues (
    id, key, speaker_external_id, source_path, source_metadata
  )
  select
    (d->>'id')::uuid,
    d->>'key',
    d->>'speaker_external_id',
    d->>'source_path',
    coalesce(d->'source_metadata', '{}'::jsonb)
  from jsonb_array_elements(p_dialogues) d
  on conflict (id) do update set
    key = excluded.key,
    speaker_external_id = excluded.speaker_external_id,
    source_path = excluded.source_path,
    source_metadata = excluded.source_metadata;

  -- Dialogue lines: replace lines only for the touched dialogues.
  delete from public.dialogue_lines
  where dialogue_id in (
    select (d->>'id')::uuid
    from jsonb_array_elements(p_dialogues) d
  );

  insert into public.dialogue_lines (id, dialogue_id, locale, line_order, content, line_format)
  select
    (l->>'id')::uuid,
    (l->>'dialogue_id')::uuid,
    coalesce(l->>'locale', 'he'),
    (l->>'line_order')::integer,
    l->>'content',
    coalesce(l->>'line_format', 'plain_text')
  from jsonb_array_elements(p_dialogue_lines) l;

  -- Minigames: upsert only the ones explicitly touched by the editor.
  insert into public.minigame_instances (
    id, key, locale, instruction, tasks, target, variant, success,
    minigame_id, params, source_path, source_metadata
  )
  select
    (m->>'id')::uuid,
    m->>'key',
    coalesce(m->>'locale', 'en'),
    m->>'instruction',
    coalesce(m->'tasks', '[]'::jsonb),
    m->>'target',
    m->>'variant',
    m->>'success',
    nullif(m->>'minigame_id', ''),
    coalesce(m->'params', '{}'::jsonb),
    m->>'source_path',
    coalesce(m->'source_metadata', '{}'::jsonb)
  from jsonb_array_elements(p_minigames) m
  on conflict (id) do update set
    key = excluded.key,
    locale = excluded.locale,
    instruction = excluded.instruction,
    tasks = excluded.tasks,
    target = excluded.target,
    variant = excluded.variant,
    success = excluded.success,
    minigame_id = excluded.minigame_id,
    params = excluded.params,
    source_path = excluded.source_path,
    source_metadata = excluded.source_metadata;

  -- Explicit deletions (cascade handles owned children).
  if array_length(p_deleted_quest_ids, 1) > 0 then
    delete from public.quests where id = any(p_deleted_quest_ids);
  end if;
  if array_length(p_deleted_step_ids, 1) > 0 then
    delete from public.quest_steps where id = any(p_deleted_step_ids);
  end if;
  if array_length(p_deleted_dialogue_ids, 1) > 0 then
    delete from public.dialogues where id = any(p_deleted_dialogue_ids);
  end if;
  if array_length(p_deleted_minigame_ids, 1) > 0 then
    delete from public.minigame_instances where id = any(p_deleted_minigame_ids);
  end if;

  select updated_at into v_updated_at
  from public.questlines
  where id = v_line_id;

  return jsonb_build_object('questline_id', v_line_id, 'updated_at', v_updated_at);
end;
$$;

revoke execute on function public.save_questline(jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, uuid[], uuid[], uuid[], uuid[], timestamptz, boolean) from public, anon;
grant execute on function public.save_questline(jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, uuid[], uuid[], uuid[], uuid[], timestamptz, boolean) to authenticated;
