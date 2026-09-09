# Quest QA — `personal_pronouns` (v2, two-NPC rewrite)

**Status: PASS (local only — not uploaded to Supabase / the live site)**
**Brief:** `agents/brief_personal_pronouns.md`

## Scope checked

- `questlines/personal_pronouns/_index.yaml`, `_graph.mmd`, 5 quest files (old v1 quest files deleted)
- `_registry/dialogues/personal_pronouns.yaml`
- `_registry/minigame_instances/personal_pronouns.yaml`

## Automated results

| Check | Result |
|-------|--------|
| `python scripts/import_yaml_to_supabase.py` | 0 errors, 0 warnings; 10 questlines, 48 quests, 307 steps |
| `python scripts/build_all.py` | OK; the 5 rewritten quests appear in `presentation/quests-data.json` |
| Custom content checks | 0 errors |

## Rewrite requirements verified

- **Exactly two NPCs** — `Village Head` (Q1, Q3, Q5) and `Little Boy` (Q2, Q4). No other speaker appears in any dialogue or step.
- **One station for the entire questline** — `Exam_Table_Fairy_Rose_Park`. Both NPCs live in FairyRosePark, so the learner never crosses the map.
- **Speak Aloud validates complete sentences** — every instance targets a full sentence of 4–6 words; `targetPhrase` carries the whole sentence including the final period and matches `targetWords` exactly; `silenceTimeoutSeconds: 3.5`; every instruction and prompt uses the sentence wording `אמרו בקול את המשפט המלא באנגלית` plus the natural Hebrew meaning of the whole sentence. No single-word or fragment targets remain.

Sentences: `I am the king.` · `He is my best friend.` · `We are on the stage.` · `They are very happy.` · `I am ready for the show.` · `It is a beautiful day.`

## Content rules verified

- **Level pattern** — Q1 = 50, Q2–Q5 = 1, in the index and in each `level_required`.
- **Registry IDs** — every `giver_npc`, `npc_id`, `world_object_id`, `dialogue_id`, `instance_id` resolves; index quest IDs match the quest files exactly.
- **No orphans** — every dialogue and minigame instance is referenced by a step.
- **Dialogue typography** — no `"`, no curly quotes, no em dash. Learner-facing names are ראש הכפר and הילד הקטן only.
- **Step types** — only `talk_to_npc`, `play_minigame`, `return_to_npc`.
- **Minigame variety** — never three identical types in a row.
- **Closure** — Q5 ends with the Village Head, 10 coins granted immediately, no pointer to another NPC.

## Minigame rules verified

- **Word Matching** — unique tile IDs (including intentional duplicate-value `e1`/`e2` tiles where two words need `e`), every missing letter present in the pool, at least one distractor letter, gap positions varied, letter order shuffled independently of task order.
- **Word Ordering** — at least two open words in Q1–Q4, full natural Hebrew translation inside the authored prompt, no duplicate choices, `target` consistent with `englishWordsInOrder`. Pronoun distractors are always other pronouns, so the answer cannot be reached by elimination.
- **Word Ordering, Q5** — `preFilledIndices: []` and `distractorWords: []` on both instances: the learner rebuilds the whole sentence unaided.
- **Letter Ordering** — prompts give the Hebrew meaning only and never contain the English answer. Targets: `you`, `she`, `it`, `they`, `we`; two-letter targets use `extraDistractorCount: 3`.

## Pedagogical review

The play-notebook premise gives a concrete reason to replace a name with a short word, and the two NPCs alternate as teacher and applier: the Village Head introduces each rule, the boy applies it to the next scene. Progression: I/You → He/She → It/We → They + review → mixed transfer with unaided rebuilds and two spoken stage lines.

## Known deviation

`variant` stays `short_phrase` because `_registry/minigames.yaml` only defines `single_word` and `short_phrase` for `speak_aloud`. The recognition unit is nevertheless a full sentence via `targetPhrase`. Adding a `sentence` variant would require a matching Unity config change and was not made unilaterally.

## Runtime note

`params.prompt` rendering on the actual in-game minigame screen still needs verification in the running game before any upload; this report covers authoring, the importer and the local viewer only.
