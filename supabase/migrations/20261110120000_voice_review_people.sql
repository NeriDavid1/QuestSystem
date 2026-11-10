-- Voice Review, part 2: who says each line, and which quest line it belongs to, so a guide sees faces and
-- Hebrew quest line names instead of file names. Also lets the page list every voiced line of the game
-- (speech bubbles, cutscenes, townsfolk, girl versions), not only dialogue nodes.
--
-- voice_review_items.source is now one of: dialogue, bubble, cutscene, ambient.
-- scripts/voice_review_sync.py fills all three tables. Nothing here touches the quest tables.

alter table public.voice_review_items
  add column if not exists variant text not null default '',        -- 'girl' = the take a girl player hears
  add column if not exists speaker_key text not null default '';    -- key in voice_cast.json (voice_review_speakers)

create index if not exists voice_review_items_speaker_idx
  on public.voice_review_items (speaker_key);

-- One row per character in voice_cast.json.
create table if not exists public.voice_review_speakers (
  speaker_key text primary key,
  display_name text not null default '',
  voice_name text not null default '',
  brief text not null default '',                 -- casting note, e.g. "60s male. Warm authority."
  image_path text,                                -- object in the voice-review bucket (portraits/…)
  updated_at timestamptz not null default now()
);

-- One row per group (quest line, townsfolk, legacy level), in the order the page lists them.
create table if not exists public.voice_review_groups (
  group_key text primary key,
  title text not null default '',
  sort_order integer not null default 0,
  speaker_key text not null default '',           -- whose face the group shows (the quest line's NPC)
  updated_at timestamptz not null default now()
);

create trigger voice_review_speakers_updated_at
before update on public.voice_review_speakers
for each row execute function public.set_updated_at();

create trigger voice_review_groups_updated_at
before update on public.voice_review_groups
for each row execute function public.set_updated_at();

alter table public.voice_review_speakers enable row level security;
alter table public.voice_review_groups enable row level security;

create policy voice_review_speakers_editor_select on public.voice_review_speakers
for select to authenticated using (private.is_quest_editor());
create policy voice_review_speakers_editor_insert on public.voice_review_speakers
for insert to authenticated with check (private.is_quest_editor());
create policy voice_review_speakers_editor_update on public.voice_review_speakers
for update to authenticated using (private.is_quest_editor()) with check (private.is_quest_editor());
create policy voice_review_speakers_editor_delete on public.voice_review_speakers
for delete to authenticated using (private.is_quest_editor());

create policy voice_review_groups_editor_select on public.voice_review_groups
for select to authenticated using (private.is_quest_editor());
create policy voice_review_groups_editor_insert on public.voice_review_groups
for insert to authenticated with check (private.is_quest_editor());
create policy voice_review_groups_editor_update on public.voice_review_groups
for update to authenticated using (private.is_quest_editor()) with check (private.is_quest_editor());
create policy voice_review_groups_editor_delete on public.voice_review_groups
for delete to authenticated using (private.is_quest_editor());
