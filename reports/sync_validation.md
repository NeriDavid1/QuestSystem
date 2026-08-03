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

The three systems **are structurally in sync** for the three live lines —
`adjective_crown` (6 quests), `kingdom_nouns` (7), `blacksmith_will` (3): every quest key,
prerequisite chain, step order, reward, giver NPC, dialogue reference and minigame-instance
reference lines up, and the import pipeline reports **0 errors**.

Five concrete divergences were found. Two were **fixed in this pass** (D1 duplicate
deliver-step rewards in 15 quests, D4 editor not linking imported minigame briefs); the rest
are **open items** documented below (D2, D3) or **notes** (D5–D8). One new transfer bridge
(`scripts/export_questlines_to_yaml.py`) closes the editor → game direction.

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
- **References resolve** — every step reference (NPC, area, interactable, item, minigame,
  dialogue) exists in the corresponding catalog/registry: importer reports **0 errors**.
- **Step semantics** — the canonical live pattern `talk_to_npc → reach_location →
  play_minigame → deliver_item` is used consistently and matches Unity objective types.
- **Rewards** — quest-level XP and item rewards match Unity `RewardDefinition` bundles
  (e.g. oak_log → SoftKitty `10`, gem → `26`). Step rewards are granted on the
  `play_minigame` step in both Unity and YAML/DB.
- **Step types** — 6 `step_type_definitions` mirror `systems.yaml` and map 1:1 to the
  Unity enum used by live quests.
- **Prerequisites** — 22 edges; no cycles; editor validation + importer agree.
- **Minigame briefs** — 52 `minigame_instances` match `_registry/minigame_instances/`.
- **Dialogues** — 54 dialogues / 150 lines; step `dialogue_id`s resolve.

---

## 3. Divergences found

| # | Divergence | Evidence | Status |
|---|---|---|---|
| **D1** | **Duplicate reward on 15 `deliver_item` steps** — YAML/DB grant `reward_item_id`/`reward_amount` on delivery, but Unity grants nothing on delivery | Every Unity deliver objective has `stepReward: {fileID: 0}`; `QuestAuthoringValidator` raises an **error** for any `DeliverItem` stepReward; the item is already granted by the preceding minigame step (`StepReward_q01_deliver_gem` etc. are attached to the *speak/minigame* step) | **FIXED** — removed from 15 quest YAMLs (6 adjective_crown, 2 blacksmith_will, 7 kingdom_nouns); re-run the importer to regenerate seed/bundle (warnings 17→2, rewards 84→69) |
| **D2** | **Minigame brief keys off-by-one** for `english_kingdom_maya` `q02_bee_bandit` (step 2) and `q06_butterfly_chaos` (step 2) — brief exists under `…_s3`, step expects `…_s2` | import report `minigame_key_mismatch` ×2 | **Open** — choose the canonical key (recommend the step’s `_s2`, since brief keys follow `{quest}_s{step_position}`) |
| **D3** | **Unity `levelRequired` mismatch on `adjective_crown/q01_bridge_too_short`** — Unity asset `50`, YAML/DB `1`. (kingdom_nouns q01 is `50` on *both* sides; blacksmith q01 is `1` on both) | Unity `.asset` vs `questlines/…/q01_bridge_too_short.yaml` vs `seed/generated/06_quests.sql` | **Open (Unity-side)** — likely a stale template value; decide the intended gate level and align the asset |
| **D4** | **Editor did not link imported minigame briefs** — editor read only `payload.instance_id`, but the importer stores the resolved brief key under `payload.instance_key`; every imported `play_minigame` step showed “no minigame attached” | bundle payloads (`instance_key`) vs `getStepMinigame`/`StepMinigameEditor` | **FIXED** — new `getStepMinigameKey()` (reads `instance_id` then `instance_key`), wired into `getStepMinigame`, editor UI, and validation; new tests |
| **D5** | Unity `QuestObjectiveType.Custom` has no YAML/DB step type | `systems.yaml` (6 types) vs enum | Noted — unused by all current quests |
| **D6** | 5 NPCs in `NpcCatalog_OpenWorld` are absent from `_registry/npcs.yaml` (Palace Guard, Dark Wizard, King Numbers, Chef, Museum Clerk) | Unity catalog vs registry | Noted — no quest references them; safe to leave |
| **D7** | `english_kingdom_maya` (10 quests, letters A–J) exists in YAML/DB but has **no Unity assets** | Unity Lines folder has 0 maya `QuestDefinitionSO` | Noted — DB/editor are ahead; this is the ready-to-transfer letters line |
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

---

## 5. How to apply the fixes

After this validation the generated artifacts still reflect the *old* data until the
importer is re-run. Do this once:

```bash
python scripts/import_yaml_to_supabase.py     # regenerates supabase/seed/* + reports/quest_import_report.json
```

Expected after regeneration: `warnings: 2` (only D2 maya key mismatches), `rewards: 69`.
Then resolve D2/D3 as decided, and optionally:

```bash
python -m unittest discover tests            # pipeline + exporter tests
cd editor && npm install && npm test         # editor tests incl. new instance_key cases
```

---

## 6. Files changed in this validation

- **Editor fit (D4):** `editor/src/lib/editorData.ts`, `editor/src/lib/validation.ts`,
  `editor/src/components/editor/StepMinigameEditor.tsx`, `editor/src/lib/editorData.test.ts`
- **Data fix (D1):** 15 quest YAMLs under `questlines/{adjective_crown,blacksmith_will,kingdom_nouns}/`
  (removed deliver-step rewards)
- **Pipeline expectations:** `tests/test_content_pipeline.py` (warnings 17→2, rewards 84→69)
- **Transfer bridge:** `scripts/export_questlines_to_yaml.py`, `tests/test_export_questlines.py`
- **Design rule note:** `_registry/systems.yaml` (deliver_item must not carry rewards)
- **This report:** `reports/sync_validation.md`
