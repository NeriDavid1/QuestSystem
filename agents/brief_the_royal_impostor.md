# The Royal Impostor — Approved Pedagogical Brief

## Scope

- Local questline key: `the_royal_impostor`.
- Three connected quests at levels 8–9.
- Target language: possessive adjectives `my`, `your`, `his`, `her`, `our`, `their`.
- The possessive adjective must change the owner, viewpoint, or truth of a clue. It is never only a spelling blank.
- The king, the two advisors, and the arrest are narrated through dialogue. No new Unity NPC or world object is required.
- All playable interactions use existing NPC IDs and minigame stations from the local registry.
- No `reach_location`, `collect_item`, or `deliver_item` objectives.
- Every quest uses `wait_for_npc_turn_in: false`.
- Local authoring only. Do not publish or change the live site/Supabase catalog.

## Existing-world adaptation

- Fenn (`City Gaurd Info`) coordinates the investigation at `KingdomGate` and gives the final Royal Test.
- Will (`Blacksmith`) and Painter are the first witnesses. Their testimony establishes `his` and `her`.
- Tomlin (`Main Gate Gaurd 1`) and Garrick (`Main Gate Gaurd 2`) provide the lunch dispute for `our`, `their`, `your`, and `my`.
- The king's message and the two advisors are quoted by Fenn rather than represented as physical NPCs.
- Existing stations:
  - `Lost_Chest1_BuildersHomeArea`
  - `Lost_Chest7_The_Sunspire_Tree`
  - `Exam_Table1_Outside_Gate`
  - `Wooden_Cart1_Inside_Gate`

## Progression

1. **Two Advisors** — use witness identity and known belongings to distinguish `his` from `her` and earn Clue #1.
2. **The Witnesses** — change perspective between what the guards say (`our`) and what the player reports (`their`), then contrast `my` and `your` to earn Clue #2.
3. **The Royal Test** — combine all six forms in mixed two-owner sentences and expose the actor who wanted a free palace lunch.

## Minigame rules

- Word Ordering is the main semantic assessment. The English possessive adjective remains open while the Hebrew translation supplies the ownership context.
- Distractors are unique, plausible possessive adjectives and never duplicate a correct open word.
- Speak Aloud uses Level 3 short sentences at difficulty 9: the spoken-content level is raised by two from the Level 1 baseline.
- Every Speak Aloud prompt explicitly asks the learner in Hebrew to speak and gives the complete natural Hebrew meaning of the exact target sentence.
- `targetWords` and `targetPhrase` describe the same spoken unit.
- No more than two instances of the same minigame type appear consecutively.

## Story closure

Fenn reports that the impostor is a theatre actor who wanted the Royal Advisor's free lunch. The guards answer, “Our lunch?!” The final dialogue immediately congratulates the learner and the quest grants 10 coins.
