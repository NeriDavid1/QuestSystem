# Quest QA Report: wh_questions (v2 - ghost detective rewrite)

## Summary: PASS

Local authoring only. Importer and presentation build succeeded. Nothing uploaded to the website or Supabase.

## Evidence

- `python scripts/import_yaml_to_supabase.py` → errors 0, warnings 0; 9 questlines, 43 quests, 195 minigame instances.
- `python scripts/build_all.py` → all presentation builds finished.
- Bundle contains the new keys `wh_questions__q01_the_forgotten_name` … `wh_questions__q05_the_light_at_the_tower`; old v1 keys removed.
- Scripted content check: word-matching pools, tile IDs, row alignment, word-ordering open index, choice uniqueness, prompts, dialogue typography → no errors.

## Cast and stations (all new in v2)

| Quest | NPC ID | Station |
|-------|--------|---------|
| Q1 | `Ghost` | `Tomb_Stone_The_Weeping_Stones` |
| Q2 | `Fisherman` | `Lost_Chest2_Driftgold_Bay` |
| Q3 | `Cannoneer` | `Lost_Chest3_Forsaken_Cove` |
| Q4 | `Little Girl` | `Exam_Table_Fairy_Rose_Park` |
| Q5 | `Mountain Guide` | `Fire_Camp_Tower_Of_Lost_Vigil` |

## Checklist

| Check | Result |
|-------|--------|
| Levels Q1=50, Q2–Q5=1 (index + quest files) | PASS |
| No `reach_location` / `collect_item` / `deliver_item` | PASS |
| Registry NPC, station, and item IDs resolve | PASS |
| One station per quest, no map crossing mid-quest | PASS |
| Quest-giver variety (5 different NPCs) | PASS |
| Word Matching: pools complete, unique IDs, varied gaps, answers not aligned by row | PASS |
| Word Ordering: only Wh-word open, full Hebrew translation, unique choices | PASS |
| Letter Ordering: Hebrew meaning only, no English answer in prompt | PASS |
| Speak Aloud: action + Hebrew meaning in prompt; L1 in Q1–Q3, L2 in Q4–Q5 | PASS |
| Minigame type ≤ 2 consecutive | PASS |
| Dialogue: no quotation marks, no em dash, short blocks | PASS |
| Learner-facing names only (בו Boo, נמו Nemo, לילי Lily) | PASS |
| Final quest gives reward immediately, no next-NPC handoff | PASS |

## Recommendation

Approve for user content review. Do not import to the live site until the user explicitly requests upload.
