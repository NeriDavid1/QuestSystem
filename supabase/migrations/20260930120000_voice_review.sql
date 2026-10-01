-- Voice Review for guides: the web page at editor/voice.html plays each voice-over take and records
-- accept / reject decisions. scripts/voice_review_sync.py fills voice_review_items and the audio bucket
-- from the Unity project, and merges voice_review_decisions into Tools/voice/voice_review.json, the
-- same file Unity's Audio Review window and the voice generators use.
--
-- Nothing here touches the quest tables that Unity's Database Sync reads.

-- One row per voice line that has a take to listen to.
create table if not exists public.voice_review_items (
  clip_path text primary key,                 -- Unity asset path, the key of voice_review.json
  source text not null default 'dialogue',
  group_key text not null,                    -- quest line (voice_script.csv "group")
  section text not null default '',           -- e.g. "Quest 1 · start"
  position integer not null default 0,        -- listening order inside the group
  speaker text not null default '',
  voice_name text not null default '',
  on_screen_text text not null default '',
  tts_text text not null default '',          -- what the take was generated from ("text" in the review file)
  take_hash text not null,                    -- current take; a decision counts only on this take
  audio_path text not null,                   -- object in the voice-review bucket
  alternate_audio_path text,                  -- legacy recording to compare with, when there is one
  node_path text,
  updated_at timestamptz not null default now()
);

create index if not exists voice_review_items_group_idx
  on public.voice_review_items (source, group_key, position);

-- The latest decision per clip, in the same shape as a voice_review.json entry.
create table if not exists public.voice_review_decisions (
  clip_path text primary key,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  tags text[] not null default '{}',
  note text not null default '',
  take_hash text not null default '',
  speaker text not null default '',
  text text not null default '',
  reviewed_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewer_name text not null default '',
  updated_at timestamptz not null default now()
);

create index if not exists voice_review_decisions_reviewed_by_idx
  on public.voice_review_decisions (reviewed_by);

create trigger voice_review_items_updated_at
before update on public.voice_review_items
for each row execute function public.set_updated_at();

create trigger voice_review_decisions_updated_at
before update on public.voice_review_decisions
for each row execute function public.set_updated_at();

alter table public.voice_review_items enable row level security;
alter table public.voice_review_decisions enable row level security;

-- Any workspace member (guides join as editors when they create an account) can review.
create policy voice_review_items_editor_select on public.voice_review_items
for select to authenticated using (private.is_quest_editor());
create policy voice_review_items_editor_insert on public.voice_review_items
for insert to authenticated with check (private.is_quest_editor());
create policy voice_review_items_editor_update on public.voice_review_items
for update to authenticated using (private.is_quest_editor()) with check (private.is_quest_editor());
create policy voice_review_items_editor_delete on public.voice_review_items
for delete to authenticated using (private.is_quest_editor());

create policy voice_review_decisions_editor_select on public.voice_review_decisions
for select to authenticated using (private.is_quest_editor());
create policy voice_review_decisions_editor_insert on public.voice_review_decisions
for insert to authenticated with check (private.is_quest_editor());
create policy voice_review_decisions_editor_update on public.voice_review_decisions
for update to authenticated using (private.is_quest_editor()) with check (private.is_quest_editor());

-- Audio takes. Private: the page asks for short-lived signed URLs.
insert into storage.buckets (id, name, public)
values ('voice-review', 'voice-review', false)
on conflict (id) do nothing;

create policy voice_review_audio_editor_select on storage.objects
for select to authenticated using (bucket_id = 'voice-review' and private.is_quest_editor());
create policy voice_review_audio_editor_insert on storage.objects
for insert to authenticated with check (bucket_id = 'voice-review' and private.is_quest_editor());
create policy voice_review_audio_editor_update on storage.objects
for update to authenticated using (bucket_id = 'voice-review' and private.is_quest_editor())
with check (bucket_id = 'voice-review' and private.is_quest_editor());
create policy voice_review_audio_editor_delete on storage.objects
for delete to authenticated using (bucket_id = 'voice-review' and private.is_quest_editor());
