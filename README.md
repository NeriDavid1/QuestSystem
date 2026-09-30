# Quest System

Authoring workspace for English-learning Open World quests. Synced to Unity `QuestWorldCatalogSet_OpenWorld`.

## Start here

| Who | Open this |
|-----|-----------|
| **Quest creators (you)** | **[Creator catalog](https://neridavid1.github.io/QuestSystem/catalog.html)** — searchable Areas / NPCs / Interactables (with pictures), Items, Minigames, Step types |
| Creators (local) | Double-click [`presentation/OPEN_CATALOG.bat`](presentation/OPEN_CATALOG.bat) (serves over localhost — opening the HTML file directly stays empty) |
| Boss / stakeholders (עברית) | **[Quest map](https://neridavid1.github.io/QuestSystem/viewer.html)** · local [`presentation/viewer.html`](presentation/viewer.html) |
| Authenticated quest editors | **[QuestForge editor](https://neridavid1.github.io/QuestSystem/editor/)** · local `cd editor && npm install && npm run dev` |
| Guides reviewing voice-over | **[Voice Review](https://neridavid1.github.io/QuestSystem/editor/voice.html)** · how it syncs with Unity: [`docs/voice-review.md`](docs/voice-review.md) |
| Landing page | [`presentation/index.html`](presentation/index.html) |

After changing registry YAML or capturing new pictures, rebuild:

```bash
pip install -r requirements.txt
python scripts/build_catalog.py      # creator catalog + galleries
# or: python scripts/build_all.py   # catalog + Hebrew quest viewer
```

## How to write a quest

### Letter Ordering and Listen & Build

The minigame catalog includes **Letter Ordering** (`letter_ordering`) and
**Listen & Build** (`listening_letter_ordering`) with its own Unity screenshot.
Both use `LetterOrderingQuestConfigSO` / `LetterOrderingDataSO` and the same
ordering validation. The second catalog choice defaults to the listening visual.

In a `play_minigame` step, choose **Letter Ordering** or **Listen & Build**
from the minigame catalog, then create/attach an exercise. This selection sets
the visual automatically; there is no separate Game version control. For the
listening game, optionally assign **English word
recording** using an existing Unity AudioClip path, then choose **Audio only**
or **Text and audio**. Example parameters:

```json
{
  "targetWord": "bee",
  "prompt": "דבורה",
  "extraDistractorCount": 2,
  "promptAudio": "Assets/_OurAssets/Art/Audio/Museum sounds/SOUNDS FOR MUSEUM new/BEE.mp3",
  "hintMode": "AudioOnly"
}
```

The recording must already exist in the Unity project; this field does not
upload an audio file. The website preview shows the selected visual; playback
runs in Unity. No microphone is needed. Audio is optional: leave the field blank
to assign the recording manually in Unity later. Reimport of a listening exercise
with a blank audio field preserves a manually assigned recording. Old exercises
with no presentation fields stay Classic.
Legacy `visualVariant` params cannot override the selected minigame.

Save and publish the questline on the website, then import it through Unity's
**Tools > English Kingdom > Quests > Database Sync**. Quest Sync resolves the
recording, applies the selected visual/clue mode and preserves the world station
ID. Reimport updates the same assets; returning to Classic clears stale audio.

`currentMiniGameCatalog` also supplies this entry to older connected catalogs.
For database catalog clients outside the editor, apply the scoped migration
`supabase/migrations/20260928120000_listening_letter_ordering.sql`.

1. Browse the **[Creator catalog](presentation/catalog.html)** and copy exact IDs (prefer `live_used` over `catalog_stub`).
2. Prefer **[QuestForge](editor/)** — quest keys are auto-generated as `{lineKey}__qNN_slug` and must be **unique across the whole OpenWorld game**.
3. If editing YAML by hand: open the target questline folder under [`questlines/`](questlines/) and use a globally unique key (line-scoped form above). Do not reuse bare `q01_*` across lines.
4. Use only step types from [`_registry/systems.yaml`](_registry/systems.yaml).
5. Update that line’s `_index.yaml` and `_graph.mmd`.

### Current authoring pattern

```yaml
quest:
  # Other required identity/prerequisite fields omitted in this fragment.
  giver_npc: teacher_maya
  start_dialogue_id: line_q01_intro
  turn_in_dialogue_id: line_q01_finish
  wait_for_npc_turn_in: true
steps:
  - type: play_minigame
    minigame_id: letter_ordering
    instance_id: line_q01_spelling
    world_object_id: WoodenCart3_The_Oath_stone_Bridge
    difficulty: 1
    reward_item_id: oak_log
    reward_amount: 1
  - type: deliver_item
    npc_id: teacher_maya
    item_id: oak_log
    amount: 1
```

## World catalog (all knowledge)

Interactive: **[catalog.html](presentation/catalog.html)** · Markdown galleries (GitHub-friendly):

| Catalog | YAML (source) | Gallery |
|---------|---------------|---------|
| Areas | [`_registry/areas.yaml`](_registry/areas.yaml) | [`areas.md`](_registry/areas.md) |
| NPCs | [`_registry/npcs.yaml`](_registry/npcs.yaml) | [`npcs.md`](_registry/npcs.md) |
| Interactables | [`_registry/interactables.yaml`](_registry/interactables.yaml) | [`interactables.md`](_registry/interactables.md) |
| Items | [`_registry/items.yaml`](_registry/items.yaml) + [`softkitty_items.yaml`](_registry/softkitty_items.yaml) | [`items.md`](_registry/items.md) |
| Minigames | [`_registry/minigames.yaml`](_registry/minigames.yaml) | [`minigames.md`](_registry/minigames.md) |
| Step types | [`_registry/systems.yaml`](_registry/systems.yaml) | (see catalog → Step types) |
| Unity map | [`_registry/unity_mapping.yaml`](_registry/unity_mapping.yaml) | — |

Pictures live in `_registry/images/{areas,npcs,interactables,items,minigames}/` named by catalog **id** (SoftKitty **uid** for items).

### SoftKitty item icons

Full inventory icons are exported from the Unity project:

```bash
python scripts/export_softkitty_items.py
python scripts/build_catalog.py
```

Writes `_registry/softkitty_items.yaml` + `_registry/images/items/*.png` (shown in the Items tab).

### ID rules

- **Quest keys** must be unique across the entire OpenWorld game (Unity `QuestDefinitionSO.id` / Guider / QuestManager). Auto form: `{lineKey}__qNN_slug`.
- Step keys: `{questKey}_sNN` (auto in QuestForge).
- Dialogue / minigame instance keys: auto-suggested from line + quest + role; uniqueness enforced globally where the DB requires it.
- `npc_id`, `location_id`, `world_object_id` must be **exact** Unity catalog IDs (spaces allowed — copy them).
- Prefer `status: live_used` over `catalog_stub`.
- `play_minigame.world_object_id` = world station (chest/cart/camp/table), **not** a minigame type name.
- SoftKitty deliverables need `softkitty_id` in `items.yaml`.
- Never invent NPCs, areas, stations, or minigame types.

## Quest lines

| Folder | Giver NPC | Status |
|--------|-----------|--------|
| `adjective_crown` | `teacher_maya` | **Live in Unity** |
| `english_kingdom_maya` | `teacher_maya` | Authored here (no QuestDefinition SOs yet) |
| `blacksmith_will` | `Blacksmith` | Authored here (Slash unlock) |
| `kingdom_nouns` | `teacher_maya` | Authored here (nouns / SoftKitty loop) |

## Folder layout

```
_registry/          Shared definitions + picture galleries
  images/           PNGs by catalog id (areas, npcs, interactables, items)
  softkitty_items.yaml  Full SoftKitty inventory (uid + softkitty_id + icons)
questlines/         One folder per quest line
presentation/       Interactive HTML (catalog + Hebrew quest map)
  catalog.html      Creator knowledge browser
  viewer.html       Boss quest map (עברית)
scripts/            build_catalog.py · export_softkitty_items.py · build_presentation.py · build_all.py
```

## Refreshing catalog pictures

From the English Kingdom Unity project (OpenWorld scene open):

1. **Tools → English Kingdom → Quests → Capture Catalog Screenshots**
2. Set output folder to this repo’s `_registry/images`
3. Capture Selected / Capture All
4. Run `python scripts/build_catalog.py` to refresh galleries + `catalog-data.json`

## AI authoring

Start with the [three-role workflow](agents/README.md), [shared content rules](_registry/QUESTLINE_CONTENT_RULES.md), [teaching cards for all eight games](_registry/MINIGAME_TEACHING_GUIDE.md), and [brief template](agents/BRIEF_TEMPLATE.md).
Cursor reads [`.cursor/rules/quest-authoring.mdc`](.cursor/rules/quest-authoring.mdc) as a routing entry point. Prefer the Creator catalog / gallery markdown for visual context when choosing IDs.

### Prompt example

```
Using the three-role workflow, design and author a quest in adjective_crown:
Maya introduces a taught adjective contrast; practise at a verified nearby station;
finish through the quest-level completion dialogue. Update index and graph.
```

## File conventions

- New quest IDs: globally unique, line-scoped, e.g. `adjective_crown__q07_review`; preserve existing live IDs.
- Registry IDs: exact Unity catalog IDs (may include spaces)
- One quest = one YAML file
- Index files stay high-level — no step detail
- SoftKitty deliverables need `softkitty_id` in `items.yaml`

## Hebrew presentation rebuild

```bash
python scripts/build_presentation.py
```

Hebrew strings: `presentation/locale/he.yaml`, `_registry/locale/he-content.yaml`.

## Supabase quest editor

Supabase is the canonical source for editor data, drafts, published revisions, and
the future game-runtime API. The YAML files remain the auditable authoring/export
bridge until the game consumes the runtime contract directly.

For local editor development, copy [`editor/.env.example`](editor/.env.example)
to `editor/.env` and set the Supabase project URL and public client key:

```bash
cd editor
npm install
npm run dev
```

With Supabase variables configured, editors open
[`/editor/`](https://neridavid1.github.io/QuestSystem/editor/), create an account
or sign in, and start editing immediately. The first account becomes admin; later
accounts join as editors automatically. Without variables, the editor intentionally
runs in local demo mode.

The GitHub Pages workflow publishes the Hebrew viewer at the site root and the
editor at `/editor/`. Configure `QUEST_SUPABASE_URL` (repository variable or
secret) and `QUEST_SUPABASE_ANON_KEY` as a repository secret. Set the optional
`QUEST_EDITOR_BASE_PATH` variable only when the site uses a custom base path.
See [`supabase/RUNTIME_API.md`](supabase/RUNTIME_API.md) for the published snapshot
contract used by the viewer and future game runtime.
