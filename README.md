# Quest System

Authoring workspace for English-learning Open World quests. Synced to Unity `QuestWorldCatalogSet_OpenWorld`.

## Quick start

| Audience | Start here |
|----------|------------|
| Boss / interactive map (online) | **[Open Viewer](https://neridavid1.github.io/QuestSystem/)** — GitHub Pages |
| Boss / interactive map (local) | [`presentation/viewer.html`](presentation/viewer.html) — double-click to open |
| Boss / overview (text) | [`presentation/overview.md`](presentation/overview.md) |
| **English-learning design** | [`presentation/english-learning/README.md`](presentation/english-learning/README.md) |
| Author a quest | [`_registry/`](_registry/) → pick questline → edit one quest file |
| AI authoring | Cursor reads [`.cursor/rules/quest-authoring.mdc`](.cursor/rules/quest-authoring.mdc) automatically |
| Unity map | [`_registry/unity_mapping.yaml`](_registry/unity_mapping.yaml) |

## Folder layout

```
_registry/          Shared definitions (systems, NPCs, areas, interactables, items, minigames)
questlines/         english_kingdom_maya + adjective_crown only
presentation/       Boss-facing summary and graphs
  english-learning/ Step & minigame design docs
```

World IDs in `_registry/npcs.yaml`, `areas.yaml`, and `interactables.yaml` mirror Unity `QuestWorldCatalogSet_OpenWorld`.

## Quest lines

| Folder | NPC | Quests | Status |
|--------|-----|--------|--------|
| `adjective_crown` | Teacher Maya | 6 | **Live in Unity** |
| `english_kingdom_maya` | Teacher Maya | 10 | Authored here (OpenWorld IDs; QuestDefinition SOs not yet) |

## Authoring workflow

1. Use only IDs from `_registry/` (OpenWorld catalogs).
2. Prefer the Adjective Crown pattern: `reach_location` → `play_minigame` → `deliver_item`.
3. Add or edit a quest in `questlines/<line>/qXX_name.yaml`.
4. Update that questline's `_index.yaml` and `_graph.mmd`.

## Interactive presentation (עברית)

1. Edit quest YAML files as usual.
2. Rebuild the viewer:
   ```bash
   pip install -r requirements.txt
   python scripts/build_presentation.py
   ```
3. Open `presentation/viewer.html` in your browser (double-click `OPEN_VIEWER.bat`).

Hebrew text lives in:
- `presentation/locale/he.yaml` — UI strings
- `_registry/locale/he-content.yaml` — quest names, NPCs, items, summaries

## AI prompt example

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
