# Unity QuestSystem ↔ Supabase ↔ Editor — Sync Validation

**Date:** 2026-08-03
**Scope:** Cross-validate the Unity quest data model and the real quest-line assets
(`…/Assets/_OurAssets/Data/Quests/Lines`) against the Supabase schema + seed data and
the React editor, so quests authored in the editor can be transferred to the game end-to-end.
**Method:** Static cross-check of Unity `.asset` YAML, the `questlines/` + `_registry/` YAML
authoring files, the generated `supabase/seed/` bundle/SQL and `reports/quest_import_report.json`,
plus the editor code and its tests.

---

## Verdict

The three systems **are in sync** for the three live lines — `adjective_crown` (6 quests),
`kingdom_nouns` (7), `blacksmith_will` (3): every quest key, prerequisite chain, step order,
reward, giver NPC, dialogue reference, minigame-instance reference and the new
`wait_for_npc_turn_in` flag lines up, and the import pipeline reports **0 errors / 0 warnings**
(26 quests, 155 steps, 69 rewards, 22 prerequisite edges).

All divergences found in the first validation pass are now resolved:

- **D1** (duplicate `deliver_item` step rewards in 15 quests) — **fixed**, importer regenerated;
- **D2** (off-by-one maya minigame brief keys) — **fixed** by renaming `_s3` → `_s2`;
- **D3** (Unity `levelRequired` on `q01_bridge_too_short`) — **fixed** in the Unity asset;
- **D4** (editor not linking imported minigame briefs) — fixed in the earlier editor pass.

What remains are **documented Unity-side conventions**, not sync bugs: a single YAML
`play_minigame` step can expand into several objectives in the Unity asset (D9), and the 10
`english_kingdom_maya` quests have no `QuestDefinitionSO` asset yet (D7 — they are the
ready-to-transfer letters line). A transfer bridge (`scripts/export_questlines_to_yaml.py`)
closes the editor → game direction, and the new `wait_for_npc_turn_in` field is authorable
end-to-end (YAML → DB → editor).

---

## 1. The four models and how they map

| Layer | Files / objects | Identifies quests by | Notes |
|---|---|---|---|
| **Unity assets** | `QuestDefinitionSO`, `QuestObjectiveDefinition`, `QuestLineSO`, `QuestLineRegistrySO`, catalogs (`NpcCatalog_OpenWorld` etc.) | string `id` (e.g. `q01_bridge_too_short`), objectives reference catalogs by `targetId` | Game display strings are Hebrew; rewards reference `RewardDefinition`/SoftKitty int ids |
| **YAML authoring** | `questlines/<line>/_index.yaml` + `qXX_*.yaml`, `_registry/*.yaml` (npcs, areas, interactables, items, minigames, dialogues, minigame_instances, systems.yaml) | string keys | **Source of truth for the DB seed** |
| **Supabase** | tables `questlines`, `quests`, `quest_steps`, `quest_prerequisites`, `quest_rewards`, `catalog_entries`, `step_type_definitions`, `dialogues`, `dialogue_lines`, `minigame_instances`, `questline_revisions` | same string keys + uuid PKs | Generated from YAML by the importer; edited by the editor; published snapshots live in `questline_revisions.document` |
| **Editor** | `editor/src/lib/types.ts`, `editorData.ts`, components | same keys | Reads/writes Supabase; publishes `buildSnapshotDocument` |

### Step-type map (YAML/DB ⇄ Unity `QuestObjectiveType`)

| YAML/DB step type | Unity objective | Key payload fields (systems.yaml) |
|---|---|---|
| `talk_to_npc` | `TalkToNpc` | `npc_id`, `dialogue_id`, `optional_flag` |
| `return_to_npc` | `TalkToNpc` | `npc_id`, `dialogue_id` |
| `play_minigame` | `CompleteMiniGame` | `minigame_id`, `world_object_id`, `difficulty`, `success_required`, `instance_id`, `reward_item_id`, `reward_amount` |
| `collect_item` | `Collect` | `item_id`, `amount` |
| `deliver_item` | `DeliverItem` | `npc_id`, `item_id`, `amount`, `dialogue_id` |
| `reach_location` | `EnterArea` | `location_id`, `radius` |

Reward items are strings in YAML/DB (`oak_log`, `gem`, `coin`) and int SoftKitty ids in
Unity (`10`, `26`, …) — bridged by `_registry/unity_mapping.yaml → softkitty_items_used`.

---

## 2. What is in sync (validated facts)

- **Quest inventory** — DB/YAML has 26 quests across 4 lines. Unity has 16
  `QuestDefinitionSO` assets: adjective_crown 6/6, kingdom_nouns 7/7, blacksmith_will 3/3.
  All 16 keys, prerequisite chains (`prerequisiteQuestId`), giver NPCs and step composition
  match the DB seed (spot-checked `q01_bridge_too_short`, `q01_roles_without_names`,
  `q03_crown_soup`, `q06_dragon_identity`, `q07_royal_noun_trial`).
- **Turn-in gating** — `QuestDefinitionSO.waitForNpcTurnIn` is `true` for the 3 blacksmith_will
  and 10 maya quests, `false` for adjective_crown and kingdom_nouns; the flag flows through the
  YAML, the importer, the `quests.wait_for_npc_turn_in` column, the editor checkbox
  (`QuestInspector`) and the export bridge (covered by
  `test_wait_for_npc_turn_in_flows_from_yaml_to_db_and_editor`).
- **References resolve** — every step reference (NPC, area, interactable, item, minigame,
  dialogue) exists in the corresponding catalog/registry: importer reports **0 errors / 0 warnings**.
- **Step semantics** — the canonical live pattern `talk_to_npc → reach_location →
  play_minigame → deliver_item` is used consistently and matches Unity objective types.
- **Rewards** — quest-level XP and item rewards match Unity `RewardDefinition` bundles
  (e.g. oak_log → SoftKitty `10`, gem → `26`). Step rewards are granted on the
  `play_minigame` step in both Unity and YAML/DB; `deliver_item` steps carry **no** step
  reward (15 quests cleaned of duplicate deliver rewards, warnings 17→0, rewards 84→69).
- **Step types** — 6 `step_type_definitions` mirror `systems.yaml` and map 1:1 to the
  Unity enum used by live quests.
- **Prerequisites** — 22 edges; no cycles; editor validation + importer agree.
- **Minigame briefs** — 52 `minigame_instances` match `_registry/minigame_instances/`;
  the maya `q02_bee_bandit` / `q06_butterfly_chaos` brief keys were corrected to `_s2`
  (0-based step position), removing the last 2 importer warnings.
- **Dialogues** — 54 dialogues / 150 lines; step `dialogue_id`s resolve.

---

## 3. Divergences found

All listed divergences are now resolved or documented as Unity-side conventions.

| # | Divergence | Evidence | Status |
|---|---|---|---|
| **D1** | **Duplicate reward on 15 `deliver_item` steps** — YAML/DB grant `reward_item_id`/`reward_amount` on delivery, but Unity grants nothing on delivery | Every Unity deliver objective has `stepReward: {fileID: 0}`; `QuestAuthoringValidator` raises an **error** for any `DeliverItem` stepReward; the item is already granted by the preceding minigame step | **FIXED** — removed from 15 quest YAMLs (6 adjective_crown, 2 blacksmith_will, 7 kingdom_nouns); importer regenerated (warnings 17→0, rewards 84→69) |
| **D2** | **Minigame brief keys off-by-one** for `english_kingdom_maya` `q02_bee_bandit` (step 2) and `q06_butterfly_chaos` (step 2) — brief existed under `…_s3`, step expects `…_s2` | import report `minigame_key_mismatch` ×2 | **FIXED** — renamed the briefs to the canonical `_s2` (0-based step position) in `_registry/minigame_instances/english_kingdom_maya.yaml`; the last 2 warnings are gone |
| **D3** | **Unity `levelRequired` mismatch on `adjective_crown/q01_bridge_too_short`** — Unity asset `50`, YAML/DB `1`. (kingdom_nouns q01 is `50` on *both* sides; blacksmith q01 is `1` on both) | Unity `.asset` vs `questlines/…/q01_bridge_too_short.yaml` vs `seed/generated/06_quests.sql` | **FIXED** — asset aligned to `1` |
| **D4** | **Editor did not link imported minigame briefs** — editor read only `payload.instance_id`, but the importer stores the resolved brief key under `payload.instance_key`; every imported `play_minigame` step showed “no minigame attached” | bundle payloads (`instance_key`) vs `getStepMinigame`/`StepMinigameEditor` | **FIXED** — new `getStepMinigameKey()` (reads `instance_id` then `instance_key`), wired into `getStepMinigame`, editor UI, and validation; new tests |
| **D7** | `english_kingdom_maya` (10 quests, letters A–J) exists in YAML/DB but has **no Unity assets** | Unity Lines folder has 0 maya `QuestDefinitionSO` | Noted — DB/editor are ahead; this is the ready-to-transfer letters line |
| **D9** | **Minigame expansion in Unity assets** — a single YAML `play_minigame` step can expand into several objectives in the `.asset` (q06: 3 matching games → `EnterArea`+`CompleteMiniGame` pairs; q07: 1 letter-ordering step → 6 per-word `CompleteMiniGame` objectives) | `validate_unity_sync.py` flags q06/q07 step-count + objective-type mismatches | Noted — a valid Unity authoring convention (world-object travel + minigame per word); the validator reports it because it compares 1:1. Documented in §4 transform rules; the export bridge re-collapses Unity objectives into single YAML steps |
| **D5** | Unity `QuestObjectiveType.Custom` has no YAML/DB step type | `systems.yaml` (6 types) vs enum | Noted — unused by all current quests |
| **D6** | 5 NPCs in `NpcCatalog_OpenWorld` are absent from `_registry/npcs.yaml` (Palace Guard, Dark Wizard, King Numbers, Chef, Museum Clerk) | Unity catalog vs registry | Noted — no quest references them; safe to leave |
| **D8** | **Model transform rules** for YAML/DB → Unity that the transfer must apply (see §4) | `QuestAuthoringValidator` design rules | Documented — covered by the export bridge for quests; miniGameConfig assets still authored in Unity |

---

## 4. Transfer path: editor → game

```
Editor (React)                    Supabase                      YAML authoring                     Unity
─────────────                     ────────                      ──────────────                     ─────
edit quests / steps / rewards     save → draft / publish →      scripts/export_questlines_         QuestLineBuilder
→ buildSnapshotDocument()         questline_revisions.document  to_yaml.py → questlines/<key>/     / specs / catalogs
→ persisted draft                                                       │
                                  scripts/import_yaml_to_            _index.yaml + qXX_*.yaml
                                  supabase.py (seed)                 (quests, steps, rewards,
                                                                      prerequisites)
```

- **Forward (authoring):** YAML → importer → Supabase seed → editor loads → publish.
- **Backward (transfer):** editor publish → `export_questlines_to_yaml.py` → canonical
  `questlines/<key>/` files → existing Unity generation tooling.

Run the bridge:

```bash
python scripts/export_questlines_to_yaml.py --dry-run --input supabase/seed/quest_content_bundle.json
python scripts/export_questlines_to_yaml.py --supabase     # uses QUEST_SUPABASE_URL / QUEST_SUPABASE_ANON_KEY
```

The exporter is deterministic, normalizes the pipeline’s `instance_key` back to the
canonical `instance_id`, re-embeds step rewards into `play_minigame` steps, sums quest
rewards into `_index.yaml`, and is covered by `tests/test_export_questlines.py`.

### YAML/DB → Unity transform rules (D8)

| DB / editor step | Unity result |
|---|---|
| first `talk_to_npc` to the quest giver | becomes `startDialogue` on the definition — **not** a `TalkToNpc` objective (validator warning otherwise) |
| other `talk_to_npc` / `return_to_npc` | `TalkToNpc` objective; `targetId = npc_id` |
| `reach_location` | `EnterArea` objective; `targetId = location_id` |
| `play_minigame` | `CompleteMiniGame` objective; `targetId = world_object_id`, `parameters = {difficulty,…}`, `stepReward` = item reward (via `softkitty_items_used`); requires a `QuestMiniGameConfigSO` with `GameId == world_object_id` (still authored in Unity) |
| `deliver_item` | `DeliverItem` objective; `targetId = npc_id`, `requiredItemId` = SoftKitty int of `item_id`, completion `dialogue`; **never** a stepReward |
| last step is `deliver_item` | `waitForNpcTurnIn = false` + completion dialogue (validator rules) |
| `wait_for_npc_turn_in: true` | `QuestDefinitionSO.waitForNpcTurnIn = 1` (e.g. blacksmith_will / maya quests) |

---

## 5. How the fixes were applied

All fixes were applied and the generated artifacts regenerated in one pass:

```bash
python scripts/import_yaml_to_supabase.py     # regenerated supabase/seed/* + reports/quest_import_report.json
```

Current pipeline state: `warnings: 0`, `errors: 0`, `rewards: 69` (was 17 warnings / 84 rewards
before the D1 cleanup). The importer is deterministic (`test_import_is_deterministic`).

Verification:

```bash
python -m unittest discover tests            # pipeline + exporter tests (20 tests)
cd editor && npm test && npm run typecheck    # editor tests incl. new instance_key cases (83 tests)
```

Unity-side sync (`scripts/validate_unity_sync.py`) still reports 5 errors / 5 warnings on
`adjective_crown/q06` and `kingdom_nouns/q07` — all of them the **minigame-expansion
convention** (D9), not editor/DB sync bugs.

---

## 6. Files changed in this validation

- **Editor fit (D4):** `editor/src/lib/editorData.ts`, `editor/src/lib/validation.ts`,
  `editor/src/components/editor/StepMinigameEditor.tsx`, `editor/src/lib/editorData.test.ts`
- **Data fix (D1):** 15 quest YAMLs under `questlines/{adjective_crown,blacksmith_will,kingdom_nouns}/`
  (removed deliver-step rewards)
- **Data fix (D2):** `_registry/minigame_instances/english_kingdom_maya.yaml`
  (maya brief keys `_s3` → `_s2`)
- **Unity fix (D3):** `QuestDefinition_q01_bridge_too_short.asset` (`levelRequired` 50 → 1)
- **Turn-in feature (`wait_for_npc_turn_in`):** Unity `QuestDefinitionSO.waitForNpcTurnIn`,
  `supabase/migrations/20260803140000_quest_wait_turn_in.sql`,
  `editor/src/lib/types.ts`, `demoData.ts`, `EditorStore.tsx`, `persistence.ts`,
  `editorData.ts`, `QuestInspector.tsx`, `messages.ts`,
  `scripts/import_yaml_to_supabase.py`, `scripts/export_questlines_to_yaml.py`,
  and all 26 quest YAML files
- **Pipeline expectations:** `tests/test_content_pipeline.py` (warnings 17→0, rewards 84→69)
- **Transfer bridge:** `scripts/export_questlines_to_yaml.py`, `tests/test_export_questlines.py`
- **Design rule note:** `_registry/systems.yaml` (deliver_item must not carry rewards)
- **This report:** `reports/sync_validation.md`
