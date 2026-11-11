-- Voice Review, part 3: a guide regenerates a line that was not good, with the character's own voice.
--
-- * voice_review_voices: each cast voice exactly as Unity's generators send it to ElevenLabs
--   (voice id, model, settings, language; filled by scripts/voice_review_sync.py from voice_cast.json).
-- * voice_review_items.voice_key: which of those voices says the line, so nobody has to pick one.
-- * voice_review_takes: every take made on the page. The guide picks one ("chosen"); the next sync
--   brings it into the Unity project (normalised like the generators do) and sets imported_at.
-- * The ElevenLabs key is pasted once on the page and kept encrypted in Supabase Vault. Browsers can
--   only save it and see its last four characters; only the voice-review-tts edge function reads it.

alter table public.voice_review_items
  add column if not exists voice_key text not null default '';

create table if not exists public.voice_review_voices (
  voice_key text primary key,                     -- key in voice_cast.json "speakers"
  voice_name text not null default '',
  request jsonb not null,                         -- resolve_request() without the text
  fx text,                                        -- ffmpeg effect Unity adds after generation (not on web takes)
  approved boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.voice_review_takes (
  id uuid primary key default gen_random_uuid(),
  clip_path text not null,
  voice_key text not null,
  text text not null,                             -- what was spoken
  request jsonb not null,                         -- exactly what was sent, text included
  audio_path text not null,                       -- raw ElevenLabs mp3 in the voice-review bucket
  characters integer not null default 0,
  status text not null default 'new' check (status in ('new', 'chosen', 'discarded')),
  created_by uuid references auth.users(id) on delete set null,
  creator_name text not null default '',
  created_at timestamptz not null default now(),
  chosen_at timestamptz,
  chosen_by_name text not null default '',
  imported_at timestamptz,                        -- set by the sync once the take is in the Unity project
  updated_at timestamptz not null default now()
);

create index if not exists voice_review_takes_clip_idx on public.voice_review_takes (clip_path, created_at desc);
create index if not exists voice_review_takes_created_by_idx on public.voice_review_takes (created_by);
create index if not exists voice_review_takes_waiting_idx on public.voice_review_takes (status) where imported_at is null;

create table if not exists public.voice_review_settings (
  id boolean primary key default true check (id),
  api_key_hint text not null default '',          -- "…abcd"
  api_key_set_by text not null default '',
  api_key_set_at timestamptz
);

create trigger voice_review_voices_updated_at
before update on public.voice_review_voices
for each row execute function public.set_updated_at();

create trigger voice_review_takes_updated_at
before update on public.voice_review_takes
for each row execute function public.set_updated_at();

alter table public.voice_review_voices enable row level security;
alter table public.voice_review_takes enable row level security;
alter table public.voice_review_settings enable row level security;

create policy voice_review_voices_editor_select on public.voice_review_voices
for select to authenticated using (private.is_quest_editor());
create policy voice_review_voices_editor_insert on public.voice_review_voices
for insert to authenticated with check (private.is_quest_editor());
create policy voice_review_voices_editor_update on public.voice_review_voices
for update to authenticated using (private.is_quest_editor()) with check (private.is_quest_editor());
create policy voice_review_voices_editor_delete on public.voice_review_voices
for delete to authenticated using (private.is_quest_editor());

-- Takes are written by the edge function (service role) and changed through the functions below.
create policy voice_review_takes_editor_select on public.voice_review_takes
for select to authenticated using (private.is_quest_editor());

create policy voice_review_settings_editor_select on public.voice_review_settings
for select to authenticated using (private.is_quest_editor());

-- Save (or replace) the ElevenLabs key. Any editor may; nobody can read it back.
create or replace function public.voice_review_set_api_key(p_key text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text := btrim(coalesce(p_key, ''));
  v_id uuid;
begin
  if not private.is_quest_editor() then
    raise exception 'Only editors can save the key.' using errcode = '42501';
  end if;
  if length(v_key) < 20 or v_key ~ '\s' then
    raise exception 'This does not look like an ElevenLabs key.' using errcode = '22023';
  end if;

  select id into v_id from vault.secrets where name = 'voice_review_elevenlabs_key';
  if v_id is null then
    perform vault.create_secret(v_key, 'voice_review_elevenlabs_key', 'ElevenLabs key for the Voice Review page');
  else
    perform vault.update_secret(v_id, v_key);
  end if;

  insert into public.voice_review_settings (id, api_key_hint, api_key_set_by, api_key_set_at)
  values (true, '…' || right(v_key, 4), coalesce((select email from auth.users where id = auth.uid()), ''), now())
  on conflict (id) do update
    set api_key_hint = excluded.api_key_hint, api_key_set_by = excluded.api_key_set_by, api_key_set_at = excluded.api_key_set_at;
end;
$$;

revoke execute on function public.voice_review_set_api_key(text) from public, anon;
grant execute on function public.voice_review_set_api_key(text) to authenticated;

-- Only the edge function (service role) reads the key.
create or replace function public.voice_review_api_key()
returns text
language sql
security definer
set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'voice_review_elevenlabs_key' limit 1;
$$;

revoke execute on function public.voice_review_api_key() from public, anon, authenticated;
grant execute on function public.voice_review_api_key() to service_role;

-- Pick the good take of a line (one per line), or put a take back / discard it.
create or replace function public.voice_review_set_take_status(p_take uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clip text;
  v_name text := coalesce((select email from auth.users where id = auth.uid()), '');
begin
  if not private.is_quest_editor() then
    raise exception 'Only editors can choose takes.' using errcode = '42501';
  end if;
  if p_status not in ('new', 'chosen', 'discarded') then
    raise exception 'Unknown status %', p_status using errcode = '22023';
  end if;
  select clip_path into v_clip from public.voice_review_takes where id = p_take and imported_at is null;
  if v_clip is null then
    raise exception 'This take is not there, or it is already in the game.' using errcode = 'P0002';
  end if;

  if p_status = 'chosen' then
    update public.voice_review_takes set status = 'new', chosen_at = null, chosen_by_name = ''
    where clip_path = v_clip and status = 'chosen' and imported_at is null and id <> p_take;
    update public.voice_review_takes set status = 'chosen', chosen_at = now(), chosen_by_name = v_name where id = p_take;
  else
    update public.voice_review_takes set status = p_status, chosen_at = null, chosen_by_name = '' where id = p_take;
  end if;
end;
$$;

revoke execute on function public.voice_review_set_take_status(uuid, text) from public, anon;
grant execute on function public.voice_review_set_take_status(uuid, text) to authenticated;

-- The sync marks the takes it brought into the Unity project.
create or replace function public.voice_review_mark_imported(p_takes uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_quest_editor() then
    raise exception 'Only editors can import takes.' using errcode = '42501';
  end if;
  update public.voice_review_takes set imported_at = now() where id = any(p_takes) and imported_at is null;
end;
$$;

revoke execute on function public.voice_review_mark_imported(uuid[]) from public, anon;
grant execute on function public.voice_review_mark_imported(uuid[]) to authenticated;
