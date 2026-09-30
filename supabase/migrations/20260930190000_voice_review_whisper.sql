-- Whisper pre-check for Voice Review: scripts/voice_review_sync.py transcribes each new take and stores
-- what it heard next to the line, so the guide page can point at lines that need attention.
alter table public.voice_review_items
  add column if not exists asr_take_hash text,             -- the take these results belong to
  add column if not exists asr_text text,                  -- what Whisper heard
  add column if not exists asr_score real,                 -- 0..1 similarity to the script text
  add column if not exists asr_level text check (asr_level in ('ok', 'check', 'problem')),
  add column if not exists asr_flags text[] not null default '{}',   -- mismatch, no_speech, fast, slow
  add column if not exists asr_missing text[] not null default '{}', -- script words not heard
  add column if not exists asr_extra text[] not null default '{}';   -- heard words not in the script
