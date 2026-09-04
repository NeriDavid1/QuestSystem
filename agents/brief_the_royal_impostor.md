# The Royal Impostor — Approved Pedagogical Brief

## Scope

- Local questline key: `the_royal_impostor`.
- Five connected quests at levels 8–9.
- Target language: possessive adjectives `my`, `your`, `his`, `her`, `our`, `their`.
- Ownership and speaker perspective determine the answer; spelling rounds reinforce forms already learned in meaningful testimony.
- The king, the two advisors, and the arrest are narrated through registered NPC dialogue. No new Unity NPC or world object is required.
- No `reach_location`, `collect_item`, or `deliver_item` objectives.
- Every quest uses `wait_for_npc_turn_in: false`.
- Local authoring only. Do not publish or change the live site/Supabase catalog.

## Existing-world adaptation

- Fenn (`City Gaurd Info`) coordinates the investigation and the final Royal Test.
- Will (`Blacksmith`) and Painter give first-person testimony; the player changes it to third-person evidence.
- Tomlin (`Main Gate Gaurd 1`) and Garrick (`Main Gate Gaurd 2`) provide the lunch dispute and perspective changes.
- Existing stations: `Lost_Chest1_BuildersHomeArea`, `Lost_Chest7_The_Sunspire_Tree`, `Exam_Table1_Outside_Gate`, and `Wooden_Cart1_Inside_Gate`.

## Progression

1. **Two Advisors** — transform `my` witness statements into `his` and `her` reports.
2. **The Witnesses** — contrast `our/their` and `my/your` as the speaker changes.
3. **The Torn Testimony** — restore the damaged spelling of all six ownership words, then apply them in two evidence sentences.
4. **The Ownership Code** — produce all six forms from Hebrew owner/speaker contexts and pass three transfer checks.
5. **The Royal Test** — combine all six forms in mixed two-owner sentences and expose the actor who wanted a free palace lunch.

## Minigame rules

- Word Matching uses two three-word missing-letter rounds with compact pools, opaque unique IDs, every required occurrence, varied beginning/middle/end gaps, and deterministic task/letter orders shuffled independently.
- The persisted Word Matching order is derived by SHA-256 sorting with separate `tasks` and `letters` salts, followed by the smallest deterministic letter rotation that leaves no answer opposite its task.
- Letter Ordering prompts give a concrete Hebrew owner/speaker context and request the English form without showing it. Every instance has a non-empty `params.prompt`.
- Word Ordering leaves only the possessive adjectives open and uses unique plausible distractors.
- Speak Aloud remains Level 3 at difficulty 9 with an explicit Hebrew action and the complete meaning of the exact target phrase.
- No more than two instances of the same minigame type appear consecutively.

## Story closure

Fenn reports that the impostor is a theatre actor who wanted the Royal Advisor's free lunch. The guards react to the stolen lunch, the learner receives 10 coins immediately, and the investigation closes with congratulations.
