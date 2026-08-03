create extension if not exists pgcrypto;

create table if not exists public.workspace_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('admin', 'editor')),
  display_name text,
  created_at timestamptz not null default now()
);

create or replace function public.is_quest_editor(check_user uuid default auth.uid())
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

create or replace function public.is_quest_admin(check_user uuid default auth.uid())
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
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  if exists (select 1 from public.workspace_members) then
    return false;
  end if;

  insert into public.workspace_members (user_id, role, display_name)
  values (auth.uid(), 'admin', nullif(trim(p_display_name), ''));

  return true;
end;
$$;

grant execute on function public.claim_first_admin(text) to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.catalog_entries (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('area', 'npc', 'interactable', 'item', 'minigame')),
  external_id text not null,
  name text not null,
  description text,
  status text,
  image_path text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, external_id)
);

create table if not exists public.step_type_definitions (
  id text primary key,
  unity_objective text,
  description text,
  fields jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.questlines (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  display_name text not null,
  theme text,
  default_giver_external_id text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  level_min integer,
  level_max integer,
  source_path text,
  source_metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (level_min is null or level_min >= 0),
  check (level_max is null or level_max >= 0),
  check (level_min is null or level_max is null or level_min <= level_max)
);

create table if not exists public.quests (
  id uuid primary key default gen_random_uuid(),
  questline_id uuid not null references public.questlines(id) on delete cascade,
  key text not null,
  position integer not null default 0 check (position >= 0),
  name text not null,
  level_required integer not null default 1 check (level_required >= 0),
  giver_external_id text,
  summary text,
  status text not null default 'draft' check (status in ('draft', 'complete', 'published', 'archived')),
  source_path text,
  source_metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (questline_id, key)
);

create table if not exists public.quest_prerequisites (
  quest_id uuid not null references public.quests(id) on delete cascade,
  prerequisite_quest_id uuid not null references public.quests(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (quest_id, prerequisite_quest_id),
  check (quest_id <> prerequisite_quest_id)
);

create table if not exists public.quest_steps (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references public.quests(id) on delete cascade,
  key text not null,
  position integer not null default 0 check (position >= 0),
  step_type text not null references public.step_type_definitions(id),
  payload jsonb not null default '{}'::jsonb,
  source_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (quest_id, key),
  unique (quest_id, position)
);

create table if not exists public.quest_rewards (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('quest', 'step')),
  quest_id uuid references public.quests(id) on delete cascade,
  step_id uuid references public.quest_steps(id) on delete cascade,
  reward_type text not null check (reward_type in ('xp', 'item')),
  xp_amount integer,
  item_external_id text,
  amount integer,
  source_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (
    (scope = 'quest' and quest_id is not null and step_id is null)
    or
    (scope = 'step' and quest_id is null and step_id is not null)
  ),
  check (
    (reward_type = 'xp' and xp_amount is not null and xp_amount >= 0 and item_external_id is null and amount is null)
    or
    (reward_type = 'item' and xp_amount is null and item_external_id is not null and amount is not null and amount > 0)
  )
);

create table if not exists public.dialogues (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  speaker_external_id text,
  source_path text,
  source_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dialogue_lines (
  id uuid primary key default gen_random_uuid(),
  dialogue_id uuid not null references public.dialogues(id) on delete cascade,
  locale text not null default 'en',
  line_order integer not null check (line_order >= 0),
  content text not null,
  line_format text not null default 'plain_text' check (line_format in ('plain_text', 'safe_rich_text')),
  created_at timestamptz not null default now(),
  unique (dialogue_id, locale, line_order)
);

create table if not exists public.minigame_instances (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  locale text not null default 'en',
  instruction text,
  tasks jsonb not null default '[]'::jsonb,
  target text,
  variant text,
  success text,
  source_path text,
  source_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (key, locale)
);

create table if not exists public.questline_revisions (
  id uuid primary key default gen_random_uuid(),
  questline_id uuid not null references public.questlines(id) on delete cascade,
  version integer not null check (version > 0),
  schema_version integer not null default 1,
  status text not null check (status in ('draft', 'published', 'archived')),
  document jsonb not null,
  validation_summary jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique (questline_id, version)
);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists quests_questline_position_idx
  on public.quests (questline_id, position);

create index if not exists quest_steps_quest_position_idx
  on public.quest_steps (quest_id, position);

create index if not exists questline_revisions_published_idx
  on public.questline_revisions (questline_id, status, version desc);

create index if not exists catalog_entries_kind_name_idx
  on public.catalog_entries (kind, lower(name));

create trigger catalog_entries_updated_at
before update on public.catalog_entries
for each row execute function public.set_updated_at();

create trigger step_type_definitions_updated_at
before update on public.step_type_definitions
for each row execute function public.set_updated_at();

create trigger questlines_updated_at
before update on public.questlines
for each row execute function public.set_updated_at();

create trigger quests_updated_at
before update on public.quests
for each row execute function public.set_updated_at();

create trigger quest_steps_updated_at
before update on public.quest_steps
for each row execute function public.set_updated_at();

create trigger dialogues_updated_at
before update on public.dialogues
for each row execute function public.set_updated_at();

create trigger minigame_instances_updated_at
before update on public.minigame_instances
for each row execute function public.set_updated_at();

insert into public.step_type_definitions (id, unity_objective, description, fields)
values
  (
    'talk_to_npc',
    'TalkToNpc',
    'Player initiates dialogue with an NPC',
    $json$[
      {"name":"npc_id","type":"string","required":true,"ref":"npcs.yaml"},
      {"name":"dialogue_id","type":"string","required":true,"ref":"_registry/dialogues/"},
      {"name":"optional_flag","type":"string","required":false,"description":"Sets a story flag after dialogue"}
    ]$json$::jsonb
  ),
  (
    'return_to_npc',
    'TalkToNpc',
    'Player returns to an NPC to turn in or continue',
    $json$[
      {"name":"npc_id","type":"string","required":true,"ref":"npcs.yaml"},
      {"name":"dialogue_id","type":"string","required":true,"ref":"_registry/dialogues/"}
    ]$json$::jsonb
  ),
  (
    'play_minigame',
    'CompleteMiniGame',
    'Start and complete a minigame on a world station',
    $json$[
      {"name":"minigame_id","type":"string","required":true,"ref":"minigames.yaml"},
      {"name":"world_object_id","type":"string","required":true,"ref":"interactables.yaml"},
      {"name":"difficulty","type":"integer","required":true,"min":1,"max":10},
      {"name":"success_required","type":"boolean","required":false,"default":true},
      {"name":"instance_id","type":"string","required":false,"ref":"_registry/minigame_instances/"},
      {"name":"reward_item_id","type":"string","required":false,"ref":"items.yaml"},
      {"name":"reward_amount","type":"integer","required":false,"min":1,"default":1}
    ]$json$::jsonb
  ),
  (
    'collect_item',
    'Collect',
    'Gather items from the world or drops',
    $json$[
      {"name":"item_id","type":"string","required":true,"ref":"items.yaml"},
      {"name":"amount","type":"integer","required":true,"min":1}
    ]$json$::jsonb
  ),
  (
    'deliver_item',
    'DeliverItem',
    'Bring items to an NPC',
    $json$[
      {"name":"npc_id","type":"string","required":true,"ref":"npcs.yaml"},
      {"name":"item_id","type":"string","required":true,"ref":"items.yaml"},
      {"name":"amount","type":"integer","required":true,"min":1},
      {"name":"dialogue_id","type":"string","required":false,"ref":"_registry/dialogues/"}
    ]$json$::jsonb
  ),
  (
    'reach_location',
    'EnterArea',
    'Player must enter a trigger zone',
    $json$[
      {"name":"location_id","type":"string","required":true,"ref":"areas.yaml"},
      {"name":"radius","type":"number","required":false,"default":5.0}
    ]$json$::jsonb
  )
on conflict (id) do update set
  unity_objective = excluded.unity_objective,
  description = excluded.description,
  fields = excluded.fields,
  updated_at = now();

alter table public.workspace_members enable row level security;
alter table public.catalog_entries enable row level security;
alter table public.step_type_definitions enable row level security;
alter table public.questlines enable row level security;
alter table public.quests enable row level security;
alter table public.quest_prerequisites enable row level security;
alter table public.quest_steps enable row level security;
alter table public.quest_rewards enable row level security;
alter table public.dialogues enable row level security;
alter table public.dialogue_lines enable row level security;
alter table public.minigame_instances enable row level security;
alter table public.questline_revisions enable row level security;
alter table public.audit_log enable row level security;

create policy workspace_members_select
on public.workspace_members for select
using (user_id = auth.uid() or public.is_quest_admin());

create policy workspace_members_bootstrap
on public.workspace_members for insert
to authenticated
with check (
  user_id = auth.uid()
  and not exists (select 1 from public.workspace_members)
);

create policy workspace_members_admin_insert
on public.workspace_members for insert
to authenticated
with check (public.is_quest_admin());

create policy workspace_members_admin_update
on public.workspace_members for update
to authenticated
using (public.is_quest_admin())
with check (public.is_quest_admin());

create policy workspace_members_admin_delete
on public.workspace_members for delete
to authenticated
using (public.is_quest_admin());

create policy catalog_entries_public_select
on public.catalog_entries for select
using (true);

create policy catalog_entries_editor_insert
on public.catalog_entries for insert
to authenticated
with check (public.is_quest_editor());

create policy catalog_entries_editor_update
on public.catalog_entries for update
to authenticated
using (public.is_quest_editor())
with check (public.is_quest_editor());

create policy catalog_entries_editor_delete
on public.catalog_entries for delete
to authenticated
using (public.is_quest_editor());

create policy step_type_definitions_public_select
on public.step_type_definitions for select
using (true);

create policy step_type_definitions_editor_insert
on public.step_type_definitions for insert
to authenticated
with check (public.is_quest_editor());

create policy step_type_definitions_editor_update
on public.step_type_definitions for update
to authenticated
using (public.is_quest_editor())
with check (public.is_quest_editor());

create policy step_type_definitions_editor_delete
on public.step_type_definitions for delete
to authenticated
using (public.is_quest_editor());

create policy questlines_editor_select
on public.questlines for select
to authenticated
using (public.is_quest_editor());

create policy questlines_published_public_select
on public.questlines for select
using (status = 'published');

create policy questlines_editor_insert
on public.questlines for insert
to authenticated
with check (public.is_quest_editor());

create policy questlines_editor_update
on public.questlines for update
to authenticated
using (public.is_quest_editor())
with check (public.is_quest_editor());

create policy questlines_editor_delete
on public.questlines for delete
to authenticated
using (public.is_quest_editor());

create policy quests_editor_select
on public.quests for select
to authenticated
using (public.is_quest_editor());

create policy quests_published_public_select
on public.quests for select
using (
  exists (
    select 1
    from public.questlines
    where questlines.id = quests.questline_id
      and questlines.status = 'published'
  )
);

create policy quests_editor_insert
on public.quests for insert
to authenticated
with check (public.is_quest_editor());

create policy quests_editor_update
on public.quests for update
to authenticated
using (public.is_quest_editor())
with check (public.is_quest_editor());

create policy quests_editor_delete
on public.quests for delete
to authenticated
using (public.is_quest_editor());

create policy quest_prerequisites_editor_all
on public.quest_prerequisites for all
to authenticated
using (public.is_quest_editor())
with check (public.is_quest_editor());

create policy quest_steps_editor_select
on public.quest_steps for select
to authenticated
using (public.is_quest_editor());

create policy quest_steps_published_public_select
on public.quest_steps for select
using (
  exists (
    select 1
    from public.quests
    join public.questlines on questlines.id = quests.questline_id
    where quests.id = quest_steps.quest_id
      and questlines.status = 'published'
  )
);

create policy quest_steps_editor_insert
on public.quest_steps for insert
to authenticated
with check (public.is_quest_editor());

create policy quest_steps_editor_update
on public.quest_steps for update
to authenticated
using (public.is_quest_editor())
with check (public.is_quest_editor());

create policy quest_steps_editor_delete
on public.quest_steps for delete
to authenticated
using (public.is_quest_editor());

create policy quest_rewards_editor_select
on public.quest_rewards for select
to authenticated
using (public.is_quest_editor());

create policy quest_rewards_published_public_select
on public.quest_rewards for select
using (
  (scope = 'quest' and exists (
    select 1 from public.quests
    join public.questlines on questlines.id = quests.questline_id
    where quests.id = quest_rewards.quest_id and questlines.status = 'published'
  ))
  or
  (scope = 'step' and exists (
    select 1 from public.quest_steps
    join public.quests on quests.id = quest_steps.quest_id
    join public.questlines on questlines.id = quests.questline_id
    where quest_steps.id = quest_rewards.step_id and questlines.status = 'published'
  ))
);

create policy quest_rewards_editor_insert
on public.quest_rewards for insert
to authenticated
with check (public.is_quest_editor());

create policy quest_rewards_editor_update
on public.quest_rewards for update
to authenticated
using (public.is_quest_editor())
with check (public.is_quest_editor());

create policy quest_rewards_editor_delete
on public.quest_rewards for delete
to authenticated
using (public.is_quest_editor());

create policy dialogues_editor_select
on public.dialogues for select
to authenticated
using (public.is_quest_editor());

create policy dialogues_published_public_select
on public.dialogues for select
using (true);

create policy dialogues_editor_insert
on public.dialogues for insert
to authenticated
with check (public.is_quest_editor());

create policy dialogues_editor_update
on public.dialogues for update
to authenticated
using (public.is_quest_editor())
with check (public.is_quest_editor());

create policy dialogues_editor_delete
on public.dialogues for delete
to authenticated
using (public.is_quest_editor());

create policy dialogue_lines_editor_select
on public.dialogue_lines for select
to authenticated
using (public.is_quest_editor());

create policy dialogue_lines_published_public_select
on public.dialogue_lines for select
using (true);

create policy dialogue_lines_editor_insert
on public.dialogue_lines for insert
to authenticated
with check (public.is_quest_editor());

create policy dialogue_lines_editor_update
on public.dialogue_lines for update
to authenticated
using (public.is_quest_editor())
with check (public.is_quest_editor());

create policy dialogue_lines_editor_delete
on public.dialogue_lines for delete
to authenticated
using (public.is_quest_editor());

create policy minigame_instances_editor_select
on public.minigame_instances for select
to authenticated
using (public.is_quest_editor());

create policy minigame_instances_public_select
on public.minigame_instances for select
using (true);

create policy minigame_instances_editor_insert
on public.minigame_instances for insert
to authenticated
with check (public.is_quest_editor());

create policy minigame_instances_editor_update
on public.minigame_instances for update
to authenticated
using (public.is_quest_editor())
with check (public.is_quest_editor());

create policy minigame_instances_editor_delete
on public.minigame_instances for delete
to authenticated
using (public.is_quest_editor());

create policy questline_revisions_editor_select
on public.questline_revisions for select
to authenticated
using (public.is_quest_editor());

create policy questline_revisions_published_public_select
on public.questline_revisions for select
using (status = 'published');

create policy questline_revisions_editor_insert
on public.questline_revisions for insert
to authenticated
with check (public.is_quest_editor());

create policy questline_revisions_editor_update
on public.questline_revisions for update
to authenticated
using (public.is_quest_editor())
with check (public.is_quest_editor());

create policy questline_revisions_editor_delete
on public.questline_revisions for delete
to authenticated
using (public.is_quest_editor());

create policy audit_log_editor_select
on public.audit_log for select
to authenticated
using (public.is_quest_editor());

create policy audit_log_editor_insert
on public.audit_log for insert
to authenticated
with check (public.is_quest_editor() and user_id = auth.uid());
