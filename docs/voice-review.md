# Voice Review for guides

A web page where a guide listens to every voiced line of English Kingdom and marks it
**good** or **not good** (with reasons and a note), the same review that Unity's *Audio Review* window does.
The guide needs nothing but a browser and a QuestForge account.

Every line shows **who says it** (the character's picture, Hebrew name and casting note) and where it is
heard. The side list switches between **by quest line** (Hebrew quest line titles, in the order the player
meets the lines) and **by character** (all of one NPC's lines, quest line by quest line), so a guide can
listen to one character from start to end.

What is listed:

| Kind | From (Unity `Tools/voice/`) | Label on the page |
|---|---|---|
| Dialogue node | `voice_script.csv` | — |
| Girl version of a line, heard right after it | `girl_script.csv`, `<id>_girl.mp3` | גרסה לבת |
| Speech bubble (ABC valley, farm) | `bubble_lines.json`, `farm_bubble_lines.json`, `farm_answer_lines.json` | בועת דיבור |
| Cutscene subtitle | `cutscene_lines.json` | סרטון |
| Townsfolk in the street | `ambient_lines.json` (group *אנשי העיר*) | משפט ברחוב |

Pictures come from QuestSystem's NPC registry (`_registry/npcs.yaml`, cropped to a square) and Unity's
rendered NPC portraits (`Resources/UI/NpcPortraitCatalog.asset`); a character without either shows a
coloured letter. A Hebrew alias in `voice_cast.json` is the same character; a Latin alias (Bobby, Coco,
Pixie) is another character who borrows the voice, so it is listed on its own.

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

## New takes for lines that are not good

On a line marked **not good**, the card shows *הקלטה חדשה בקול של …*: the guide presses one button and
gets a new take in that character's own ElevenLabs voice. Nobody picks a voice: every line knows it
(`voice_review_items.voice_key`, the voice `generated.lock.json` recorded), and every voice is sent exactly
as Unity's generators send it (`voice_review_voices`, built with `generate_dialogue_voices.resolve_request`
from `voice_cast.json`). The guide may fix the text first (niqqud, a word written as it sounds), make as many
attempts as needed, and press **זו טובה** on the good one. The header counts the chosen takes waiting for Unity.

- **The key.** Someone pastes the ElevenLabs key once (*🔑 מפתח ElevenLabs*). It is kept encrypted in Supabase
  Vault and shared by every guide; browsers can only replace it and see its last four characters and the
  credits left. Only the `voice-review-tts` edge function reads it.
- **Into the game.** The next sync brings every chosen take into the Unity project: the raw take goes to
  `Tools/voice/raw/`, the clip is written through the generator's own `normalize` (loudness and the speaker's
  `fx`, e.g. Boo's echo, which web takes are heard without), `generated.lock.json` gets the request hash (so
  the generators see it as up to date) and `web_take`, the review file marks it accepted, and an edited text
  is written back to the line's script (`voice_script.csv`, `girl_script.csv` or `*_lines.json`). `--no-import`
  skips this. A legacy line still needs *Use new take in game* in Unity's Dialogue tab.
- Web takes cost credits like any generation; the edge function allows 10 takes a minute per guide.

Deploy: `supabase/migrations/20261111120000_voice_review_regenerate.sql` and the edge function
`supabase/functions/voice-review-tts` (JWT required).

## Setup (once)

1. Apply `supabase/migrations/20260930120000_voice_review.sql` and
   `supabase/migrations/20261110120000_voice_review_people.sql` to the QuestForge Supabase project
   (tables, row-level security, and the private `voice-review` storage bucket). They do not touch the
   quest tables that Unity's Database Sync reads.
2. The guide opens the page and creates an account (or signs in with their editor account).

## Sync (whenever there are new takes or you want the guide's reviews in Unity)

From a machine with the Unity project checked out. On Windows the easiest way is the launcher, which takes the
Supabase URL and key from `editor/.env` and then asks for your QuestForge email and password:

```bash
powershell -ExecutionPolicy Bypass -File scriptsoice_review_sync.ps1 -Project "C:/Users/123ne/source/repos/Animal-English-World/English Kingdom"
```

(`-DryRun` shows what would change, `-SkipAudio` syncs decisions only.) Or set the variables yourself:

```bash
# PowerShell: $env:QUEST_SUPABASE_URL = "..."; bash: export QUEST_SUPABASE_URL=...
QUEST_SUPABASE_URL=https://xxxx.supabase.co
QUEST_SUPABASE_ANON_KEY=...              # same values as the web editor
QUEST_EDITOR_EMAIL=you@example.com       # your QuestForge login; the password is asked for
python scripts/voice_review_sync.py --project "<path>/English-Kingdom/English Kingdom" --dry-run
python scripts/voice_review_sync.py --project "<path>/English-Kingdom/English Kingdom"
```

It uploads new takes (only the ones that changed, six at a time; the first full sync is ~2,200 clips,
~200 MB) and the characters' pictures (Pillow makes them small squares; without it the originals are sent),
lists the lines in listening order (dialogue chains, quest lines first, legacy groups last, with the legacy
recording for A/B), and merges decisions both ways
into `Tools/voice/voice_review.json`. The file keeps the exact format Unity writes, so the diff shows only
the changed decisions; Unity's Audio Review window picks them up on its next reload. `--skip-audio` syncs
decisions only. Standard library only, no `pip install` needed.

Decisions on bubbles, cutscenes, townsfolk and girl versions are saved in the same `voice_review.json`
(Unity keeps entries it does not list). Unity's Dialogue tab shows only `voice_script.csv` lines, and
`generate_dialogue_voices.py --rejected` redoes only those; redo the others with their generator's `--id`.
SFX and word clips could be added as more `source` values.
