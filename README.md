# Quest System

Authoring workspace for English-learning Open World quests. Synced to Unity `QuestWorldCatalogSet_OpenWorld`.

## Start here

| Who | Open this |
|-----|-----------|
| **Quest creators (you)** | **[Creator catalog](https://neridavid1.github.io/QuestSystem/catalog.html)** — searchable Areas / NPCs / Interactables (with pictures), Items, Minigames, Step types |
| Creators (local) | Double-click [`presentation/OPEN_CATALOG.bat`](presentation/OPEN_CATALOG.bat) (serves over localhost — opening the HTML file directly stays empty) |
| Boss / stakeholders (עברית) | **[Quest map](https://neridavid1.github.io/QuestSystem/viewer.html)** · local [`presentation/viewer.html`](presentation/viewer.html) |
| Authenticated quest editors | **[QuestForge editor](https://neridavid1.github.io/QuestSystem/editor/)** · local `cd editor && npm install && npm run dev` |
| Landing page | [`presentation/index.html`](presentation/index.html) |

After changing registry YAML or capturing new pictures, rebuild:

```bash
pip install -r requirements.txt
python scripts/build_catalog.py      # creator catalog + galleries
# or: python scripts/build_all.py   # catalog + Hebrew quest viewer
```

## How to write a quest

1. Browse the **[Creator catalog](presentation/catalog.html)** and copy exact IDs (prefer `live_used` over `catalog_stub`).
2. Prefer **[QuestForge](editor/)** — quest keys are auto-generated as `{lineKey}__qNN_slug` and must be **unique across the whole OpenWorld game**.
3. If editing YAML by hand: open the target questline folder under [`questlines/`](questlines/) and use a globally unique key (line-scoped form above). Do not reuse bare `q01_*` across lines.
4. Use only step types from [`_registry/systems.yaml`](_registry/systems.yaml).
5. Update that line’s `_index.yaml` and `_graph.mmd`.

### Canonical live pattern (Adjective Crown)

```yaml
- type: talk_to_npc
  npc_id: teacher_maya
  dialogue_id: ...
- type: reach_location
  location_id: The Oathstone Bridge
- type: play_minigame
  minigame_id: letter_ordering
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

Cursor reads [`.cursor/rules/quest-authoring.mdc`](.cursor/rules/quest-authoring.mdc) automatically. Prefer the Creator catalog / gallery markdown for visual context when choosing IDs.

### Prompt example

```
Using _registry/systems.yaml and unity_mapping.yaml, add quest q07 to adjective_crown:
talk to teacher_maya → reach The Last Roar → letter_ordering on Lost_Chest6_The_Last_Roar
→ deliver softkitty item to Maya. Update _index.yaml and _graph.mmd.
```

## File conventions

- Quest IDs: `q01`, `q02`, … (zero-padded)
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
