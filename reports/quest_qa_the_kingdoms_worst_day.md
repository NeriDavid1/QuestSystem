# QA Report — The Kingdom's Worst Day

Date: 2026-09-02  
Scope: `agents/brief_the_kingdoms_worst_day.md`, `questlines/the_kingdoms_worst_day/`, `_registry/dialogues/the_kingdoms_worst_day.yaml`, `_registry/minigame_instances/the_kingdoms_worst_day.yaml`

## Final result

Content QA: **PASS after Creator correction**.  
Repository release gate: **FAIL until generated artifacts and stale Python expectations are refreshed**.

## Checks passed

- 4 indexed quests, 10 referenced minigame instances, and 215-step full-source bundle were parsed successfully.
- All new NPC, area, world-object, minigame, dialogue, quest, prerequisite, and instance references resolve against the registries.
- Area/station pairings match the registry: KingdomGate, BuildersHome, The Sunspire Tree, FairyRosePark, Solitude Tower, and TowerOfLostVigil.
- All new dialogue and player-facing step instructions contain Hebrew guidance; no unintended answer appears in the player-facing instructions.
- Word Matching instances use `params.letters` and `params.wordTasks`; every gap index is valid, every missing character is available, and every visible fragment agrees with `fullWord`/`missingIndices` (case-insensitive runtime display comparison). Gap positions now include beginning/middle/end coverage.
- Letter Ordering prompts give Hebrew meanings and require English spelling without putting the target word in `instruction`.
- Word Ordering instances contain Hebrew `translation`, valid `preFilledIndices`, and distractor choices.
- Speak Aloud contains a short English target phrase, Hebrew instruction, `allowFuzzyMatch: true`, and no unintended sentence in the instruction.
- Index/detail metadata and graph labels are consistent. The graph follows this repository's `Q1`–`Q4` label convention.
- Final minigame flow is:

  `word_matching → letter_ordering → word_matching → word_ordering → word_matching → word_ordering → letter_ordering → word_ordering → word_ordering → speak_aloud`

  Maximum identical run: 2 (`word_ordering`).
- All 7 new `wordRevealDatabase` fields now point to the verified Unity asset-relative path:
  `Art/Prefabs/UI/GamePlay/MiniGame/WordOrderingGame/WordTranslationDatabase.asset`.
  The asset exists at `C:\English Room\Animal-English-World\English Kingdom\Assets\_OurAssets\Art\Prefabs\UI\GamePlay\MiniGame\WordOrderingGame\WordTranslationDatabase.asset`.

## Build and runtime boundary evidence

- Isolated `python scripts/build_all.py`: PASS.
- Isolated `python scripts/import_yaml_to_supabase.py`: PASS, `errors=0`, `warnings=0`, `info=0`; current counts: catalog 177, dialogues 60, dialogue lines 166, minigame instances 117, questlines 6, quests 29, steps 215.
- Isolated `python scripts/_check_seed_json.py`: PASS, `ALL SEED JSON BLOCKS VALID`.
- `editor`: `npm run typecheck` PASS; Vitest PASS, 7 files and 113 tests.
- Unity source path was inspected for the database asset, but `scripts/validate_unity_sync.py` was not run against QuestDefinition assets because its configured default path was unavailable. No Unity Play Mode/runtime playthrough was performed; this report does not claim runtime verification.

## Release-gate failures outside the new content

### MAJOR — generated import artifacts are stale

The workspace source currently produces digest `08e8dd6d89881ed9e939226a8ab9d484bfdce84ff7008a5edcac2b7bc6b0aa7b` and counts `6/29/215` for questlines/quests/steps. The tracked `reports/quest_import_report.json:3-15` and `supabase/seed/quest_content_bundle.json:13522-13540,18415` still contain the previous digest `f1ff62ce...` and do not contain the new questline. The isolated import regenerated correct outputs in a temporary copy, so this is a refresh/release issue, not an importer parsing error.

Recommendation to Creator/maintainer: regenerate and review the bundle, report, and SQL outputs before any site/Supabase publication.

### MAJOR — four repository Python tests use obsolete source expectations

`python -m unittest discover -s tests -v` result: 16 passed, 4 failed. The failures are stale expectations, not new-line contract failures:

- `tests/test_content_pipeline.py:30-40` expects old counts including 3 questlines, 16 quests, and 107 steps; current source build returns 6 questlines, 29 quests, and 215 steps.
- `tests/test_content_pipeline.py:78-79` expects 13 prerequisites/49 rewards; current source has 23 prerequisites (the reward assertion is not reached after the prerequisite assertion).
- `tests/test_content_pipeline.py:186` expects 16 quests; current source has 29.
- `tests/test_export_questlines.py:24-32` reads the stale 5-document generated bundle and expects 3 documents.

The source-backed deterministic checks in those suites pass where they can run, and the editor test suite passes. Update expectations only as part of the normal generated-artifact refresh; QA did not edit tests.

## Earlier QA return and correction

The first audit returned the content to Creator for two issues: missing beginning/middle/end gap coverage and a three-item `word_ordering` run across the q03→q04 boundary. Creator corrected the three Word Matching payloads and inserted the q03 adjective spelling step. The repeat audit found zero content errors and zero content warnings.

## Decision

**Return to maintainer for generated-artifact/test refresh; approve the new questline content itself after that refresh. Do not publish yet.**
