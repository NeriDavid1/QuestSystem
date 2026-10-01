# Voice Review for guides

A web page where a guide listens to each voice-over line of the English Kingdom quests and marks it
**good** or **not good** (with reasons and a note), the same review that Unity's *Audio Review* window does.
The guide needs nothing but a browser and a QuestForge account.

**Page:** [neridavid1.github.io/QuestSystem/editor/voice.html](https://neridavid1.github.io/QuestSystem/editor/voice.html)
(also linked from the editor sidebar, *Voice review*). Locally: `cd editor && npm run dev`, then open `/voice.html`
(without Supabase keys it runs in demo mode with sample lines).

## How it fits together

```
Unity project (Tools/voice)                 Supabase                           Guide
voice_script.csv + generated.lock.json ──►  voice_review_items + audio bucket ──►  voice.html
voice_review.json  ◄───────────────────►   voice_review_decisions           ◄──  ✔ / ✘ + reasons + note
                   scripts/voice_review_sync.py (both directions)
```

- A decision counts only on the take it was made on (`take_hash`), exactly like Unity. When a line is
  regenerated, the next sync uploads the new take and the page shows it as *new recording* again.
- Reject reasons are saved with the same English tags as Unity's Dialogue tab (`Pronunciation`, `Too fast`, …),
  so the generators (`--rejected`) and the voice-over skill treat guide reviews like their own.
- When the same line was reviewed in both places, the newer decision wins.

## Setup (once)

1. Apply `supabase/migrations/20260930120000_voice_review.sql` to the QuestForge Supabase project
   (tables, row-level security, and the private `voice-review` storage bucket). It does not touch the
   quest tables that Unity's Database Sync reads.
2. The guide opens the page and creates an account (or signs in with their editor account).

## Sync (whenever there are new takes or you want the guide's reviews in Unity)

From a machine with the Unity project checked out:

```bash
# PowerShell: $env:QUEST_SUPABASE_URL = "..."; bash: export QUEST_SUPABASE_URL=...
QUEST_SUPABASE_URL=https://xxxx.supabase.co
QUEST_SUPABASE_ANON_KEY=...              # same values as the web editor
QUEST_EDITOR_EMAIL=you@example.com       # your QuestForge login; the password is asked for
python scripts/voice_review_sync.py --project "<path>/English-Kingdom/English Kingdom" --dry-run
python scripts/voice_review_sync.py --project "<path>/English-Kingdom/English Kingdom"
```

It uploads new takes (only the ones that changed), lists the lines in listening order (dialogue chains,
quest lines first, legacy groups last, with the legacy recording for A/B), and merges decisions both ways
into `Tools/voice/voice_review.json`. The file keeps the exact format Unity writes, so the diff shows only
the changed decisions; Unity's Audio Review window picks them up on its next reload. `--skip-audio` syncs
decisions only. Standard library only, no `pip install` needed.

## Whisper hints

When `faster-whisper` is installed (`pip install faster-whisper`), the sync also transcribes every new take
and compares it with the text it was generated from. The page then shows the guide a ⚠ on lines worth a
careful listen, a *⚠ לשים לב* filter, and a note such as "instead of 'להבחן' it heard 'לאבחן'". The note also
says when no speech was heard, or when the speech sounds unusually fast or slow. Each take is checked once,
and its result is kept until a new take replaces it. The hints never decide anything, and they don't reach
`voice_review.json`.

- The model is `large-v3-turbo` by default. It downloads once, about 1.6 GB. Use `--whisper-model` to pick
  another model, such as a Hebrew-tuned one, and `--no-whisper` to skip the check.
- The check compares Hebrew words only. English words inside a Hebrew line are left for the guide to judge by
  ear, because Whisper writes them in either alphabet.
- Apply `supabase/migrations/20260930190000_voice_review_whisper.sql` first. Until then the page works
  without hints.

Only dialogue lines are synced for now. SFX and word clips could be added as more `source` values.
