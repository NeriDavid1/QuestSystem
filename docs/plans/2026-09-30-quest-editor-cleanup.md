# QuestForge: make quest editing easy and clean

Date: 2026-09-30 · Scope: `editor/` (QuestForge) only. No change to the Supabase schema or to what
Unity's Database Sync reads.

## What gets in the way today

Observed by running the editor in demo mode and reading the code:

1. **Steps are hard to read.** The step list shows the raw type (`talk to npc`) and the step key
   (`q01_bridge_too_short_s1`). You cannot tell *what* a step does without opening it.
2. **The step editor is far from the step.** Clicking a step renders its editor at the very bottom of
   the inspector, below the "Questline settings" section, so you scroll and lose context.
3. **Adding a step means fixing it afterwards.** "Add step" always creates `talk_to_npc` pre-filled with
   Teacher Maya; for any other step you then change the type and clean up.
4. **Changing a step type leaves junk in the payload.** Switching `talk_to_npc` → `reach_location` keeps
   `npc_id` / `dialogue_id` in the payload, which is then published.
5. **Field labels are developer names** (`npc id`, `world object id`, `item id`) in an otherwise Hebrew UI,
   and the "missing field" validation message quotes those raw names.
6. **Validation is a dead end.** The bottom panel shows only the first 6 issues and none are clickable, so
   finding *which* quest or step is broken means hunting.
7. **Number inputs misbehave.** Clearing a number field writes `0` (e.g. `amount: 0`, `difficulty: 0`).
8. **Code health.** `state/EditorStore.tsx` is ~1,900 lines and `index.css` ~4,500 lines; step-type
   presentation (names, icons, labels) is scattered as `replaceAll('_', ' ')` calls.

## Phase 1 (this PR): the editing loop

| # | Change | Fixes |
|---|---|---|
| 1 | New `lib/stepPresentation.ts`: one place for each step type's icon, translated name, field labels and a one-line summary built from the payload and catalog ("Talk to Teacher Maya", "Play Letter Ordering at Wooden Cart 3", "Bring 1 × Gem to Teacher Maya"). | 1, 5, 8 |
| 2 | Step list rows show icon + friendly name + summary, with a red/amber dot when that step has validation issues. | 1, 6 |
| 3 | The selected step's editor opens directly under the step list, inside the Steps section. | 2 |
| 4 | "Add step" opens a small type picker (icon, name, one-line description) and pre-fills sensible defaults for that type. | 3 |
| 5 | Changing step type keeps only the fields the new type declares (plus the minigame `instance_key` link). | 4 |
| 6 | Friendly field labels (he/en) with the raw key kept as a small hint, used by the field editor and by validation messages. | 5 |
| 7 | Validation panel lists every issue (scrollable) and each one is a button that jumps to its quest/step. | 6 |
| 8 | Number fields: empty stays empty until you type, values clamp to the field's min/max. | 7 |

Visual pass (same PR):

| # | Change |
|---|---|
| 9 | Readable type scale: no UI text under 11px (was 7–10px for most labels), via `--text-*` tokens in `index.css`. |
| 10 | The quest map is a vertical path of quest cards instead of a one-row SVG, so every quest shows without side-scrolling; each card shows level, step count, status, its steps as icons, an issue dot and any non-adjacent prerequisite ("After Q02"). |
| 11 | Questline heading gets the full width, with its actions in a row underneath. |
| 12 | Library catalog status badges sit on their cards again (they were all stacked in the page corner). |

All of it is presentation or editor behaviour; the saved rows keep the same shape, so Unity's
`QuestSnapshotImporter` is unaffected.

## Phase 2 (next): structure

- Split `EditorStore.tsx` into slices (selection, questline/quest/step mutations, dialogues, minigames,
  persistence/publish) behind the same `useEditorStore()` API.
- Split `index.css` per area (layout, inspector, graph, library, preview).
- Move the remaining inline Hebrew/English strings (e.g. in `QuestGraphPanel.tsx`) into `i18n/messages.ts`.

## Phase 3: game-side follow-ups (English Kingdom)

- **Defeat monsters step.** English Kingdom PR #483 adds `QuestObjectiveType.DefeatMonsters`
  (`targetId` = `MonsterDefinitionSO.MonsterId` or `any_monster`, `count`), but Database Sync
  (`QuestSnapshotImporter.QuestBuilding.cs`) has no `step_type` case for it, so an editor step would be
  skipped with "unhandled step_type". Proposal: `step_type: defeat_monsters`, payload
  `{ monster_id, count }`, plus a `monster` catalog kind. Add it to QuestForge only together with the
  importer case.
- Database Sync fetches `step_type_definitions` but ignores `unity_objective` and hard-codes the mapping;
  driving it from that table would make new step types a data-only change.
