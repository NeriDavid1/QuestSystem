# Quest System

Authoring workspace for NPC quest lines. Designed for **boss presentations**, **easy navigation**, and **AI-assisted creation** without loading the entire game every time.

## Quick start

| Audience | Start here |
|----------|------------|
| Boss / interactive map (online) | **[Open Viewer](https://neridavid1.github.io/QuestSystem/)** — GitHub Pages |
| Boss / interactive map (local) | [`presentation/viewer.html`](presentation/viewer.html) — double-click to open |
| Boss / overview (text) | [`presentation/overview.md`](presentation/overview.md) |
| **English-learning MMO** | [`presentation/english-learning/README.md`](presentation/english-learning/README.md) |
| Author a quest | [`_registry/`](_registry/) → pick questline → edit one quest file |
| AI authoring | Cursor reads [`.cursor/rules/quest-authoring.mdc`](.cursor/rules/quest-authoring.mdc) automatically |

## Folder layout

```
_registry/          Shared definitions (systems, NPCs, items, levels, minigames)
questlines/         One folder per NPC quest line
presentation/       Boss-facing summary and graphs
  english-learning/ Step & minigame design docs (children's English MMO)
```

## Quest lines

| Folder | NPC | Quests | Levels |
|--------|-----|--------|--------|
| `blacksmith_theron` | Theron the Blacksmith | 10 | 1–15 |
| `merchant_lina` | Lina the Merchant | 10 | 5–20 |
| `guard_captain_marcus` | Captain Marcus | 10 | 10–25 |
| `herbalist_elara` | Elara the Herbalist | 10 | 3–18 |
| `mystery_stranger_vex` | Vex the Stranger | 10 | 15–30 |

## Authoring workflow

1. Define or update shared data in `_registry/` (only when adding new NPCs, items, or step types).
2. Add or edit a quest in `questlines/<npc_folder>/qXX_name.yaml`.
3. Update that questline's `_index.yaml` with the summary row (name, level, rewards, prerequisite).
4. Update `_graph.mmd` if quest order or prerequisites change.

## Interactive presentation (עברית)

1. Edit quest YAML files as usual.
2. Rebuild the viewer:
   ```bash
   pip install -r requirements.txt
   python scripts/build_presentation.py
   ```
3. Open `presentation/viewer.html` in your browser (double-click `OPEN_VIEWER.bat`).

The viewer is **fully in Hebrew** with RTL layout. Hebrew text lives in:
- `presentation/locale/he.yaml` — UI strings
- `_registry/locale/he-content.yaml` — quest names, NPCs, items, summaries

Click a **quest line card** → see the quest chain → click a **quest node** → see steps and rewards.

## AI prompt example

```
Using _registry/systems.yaml, add quest q06 to blacksmith_theron:
level 8, reward 200 XP + steel_ingot, steps: talk to Theron → forging minigame → return to Theron.
Update _index.yaml and _graph.mmd.
```

## File conventions

- Quest IDs: `q01`, `q02`, … (zero-padded)
- Registry IDs: `snake_case` (e.g. `theron`, `rusty_hammer`)
- One quest = one YAML file
- Index files stay high-level — no step detail
