# Wh-Questions — Pedagogical Brief (v2)

**מסמך תכנון — Local authoring only**
**קהל:** גיל ~9–11
**מפתח קו:** `wh_questions`
**שפת הדרכה:** עברית-first; English רק כחומר הלימוד
**אין העלאה לאתר / Supabase עד אישור מפורש מהמשתמש**

## Scope

- Five connected quests teaching information questions: What / Where / When / Who / Why / How.
- Levels: Q1 = 50; Q2–Q5 = 1.
- No `reach_location`, `collect_item`, or `deliver_item`.
- Every quest uses `wait_for_npc_turn_in: false`.
- New NPC cast, different from the gate/teacher lines already in the repo.

## Story: The Ghost Who Forgot His Story

רוח קטנה באבני הבכי לא זוכרת מה קרה לה. היא זוכרת רק תחושה של ים וסערה. כדי להיזכר צריך לשאול שאלות נכונות, ולכל מילת שאלה יש תפקיד אחר בחקירה.

הלומד עובר בין עדים: הרוח עצמה, דייג במפרץ, תותחן במפרץ הנטוש, הילדה הקטנה מתחת לעץ הכתום הגדול, ומדריך הרים במגדל. כל עד מחזיר חלק אחר בזיכרון, ובסוף הרוח מקבלת את הסיפור השלם ויכולה להירגע.

הסיפור נותן סיבה אמיתית לכל מילת שאלה: מה קרה, איפה זה קרה, מתי, מי היה שם, למה זה קרה, ואיך הרוח יכולה להשתחרר.

## Learning map

| Quest | Sub-skill | Learner action | Success |
|-------|-----------|----------------|---------|
| Q1 | Introduce Wh-questions; **What / Where** | Identify thing vs place, spell and say | Correct What/Where in matching, ordering, spelling, speaking |
| Q2 | **When / Who** | Identify time vs person in witness questions | Correct When/Who plus retained What/Where |
| Q3 | **Why / How** | Distinguish reason vs manner | Correct Why/How plus retained words |
| Q4 | Build complete short questions | Put the Wh-word at the start of a real question | Six-word matching plus two built questions |
| Q5 | Mixed transfer + spoken questions | Apply all six in new contexts, speak two questions | Mixed matching, two orderings, two L2 speak targets |

Sub-skill order: introduce → practise the new pair alone → review previous words inside the new quest → build questions → mixed transfer only in Q5.

## World anchors (verified registry IDs)

| Quest | Learner-facing name | NPC ID | Area | Station |
|-------|---------------------|--------|------|---------|
| Q1 | בו Boo | `Ghost` | The Weeping Stones | `Tomb_Stone_The_Weeping_Stones` |
| Q2 | נמו Nemo | `Fisherman` | Driftgold Bay | `Lost_Chest2_Driftgold_Bay` |
| Q3 | התותחן Cannoneer | `Cannoneer` | Forsaken Cove | `Lost_Chest3_Forsaken_Cove` |
| Q4 | הילדה הקטנה | `Little Girl` | The Sunspire Tree | `Lost_Chest7_The_Sunspire_Tree` |
| Q5 | מדריך ההרים Mountain Guide | `Mountain Guide` | TowerOfLostVigil | `Fire_Camp_Tower_Of_Lost_Vigil` |

One station per quest, so the learner never crosses the map mid-quest.

## Hebrew meanings (teaching targets)

What = מה · Where = איפה · When = מתי · Who = מי · Why = למה · How = איך

Opening explanation (Q1 dialogue): שאלת מידע (Wh-question) מתחילה במילת שאלה ומבקשת מידע, ולא תשובת כן או לא.

## Quest flows

### Q1 — The Forgotten Name (level 50, Boo)

1. `talk_to_npc` `Ghost` — explain Wh-questions; What = מה, Where = איפה
2. `word_matching` — what, where, who (missing letters)
3. `word_ordering` — open What: `What is your name?` (מה השם שלך?)
4. `letter_ordering` — spell where (איפה)
5. `word_ordering` — open Where: `Where is the ship?` (איפה הספינה?)
6. `speak_aloud` — say `What is this?` (מה זה?)
7. `return_to_npc` — Boo remembers the sea; sends the learner to Nemo

### Q2 — The Sailor Who Saw (level 1, Nemo)

1. `talk_to_npc` `Fisherman` — When = מתי, Who = מי
2. `word_ordering` — open Who: `Who is the sailor?` (מי המלח?)
3. `letter_ordering` — spell when (מתי)
4. `word_matching` — when, who, what, where
5. `word_ordering` — open When: `When is the storm?` (מתי הסערה?)
6. `speak_aloud` — say `Who is she?` (מי היא?)
7. `return_to_npc` — Nemo points to the cove

### Q3 — The Night the Ship Broke (level 1, Cannoneer)

1. `talk_to_npc` `Cannoneer` — Why = למה (סיבה), How = איך (אופן)
2. `letter_ordering` — spell why (למה)
3. `word_ordering` — open Why: `Why is the ship broken?` (למה הספינה שבורה?)
4. `word_matching` — why, how, when, who
5. `word_ordering` — open How: `How is the wind?` (איך הרוח?)
6. `speak_aloud` — say `How is it?` (איך זה?)
7. `return_to_npc` — the cannoneer sends the learner to the park

### Q4 — Six Questions for the Little Girl (level 1)

1. `talk_to_npc` `Little Girl` — under the big orange tree; the Wh-word always opens the question
2. `word_ordering` — open What: `What is in the box?` (מה יש בקופסה?)
3. `word_ordering` — open Where: `Where are the flowers?` (איפה הפרחים?)
4. `word_matching` — all six Wh-words
5. `letter_ordering` — spell who (מי)
6. `speak_aloud` L2 — `Where is my friend?` (איפה החבר שלי?)
7. `return_to_npc` — the little girl sends the learner up to the tower

### Q5 — The Light at the Tower (level 1, Mountain Guide)

1. `talk_to_npc` `Mountain Guide` — final mixed check at the fire camp
2. `word_matching` — mixed six with new gap positions
3. `word_ordering` — full rebuild, no pre-fill, no distractors: `Who is the ghost?` (מי הרוח?)
4. `word_ordering` — full rebuild, no pre-fill, no distractors: `Why is she here?` (למה היא כאן?)
5. `letter_ordering` — spell how (איך)
6. `speak_aloud` L2 — `What is your name?` (מה השם שלך?)
7. `speak_aloud` L2 — `How are you?` (מה שלומך?)
8. `return_to_npc` — Boo's story is complete; 10 coins immediately; no further NPC

The two consecutive Speak Aloud targets in Q5 are intentional: after ordering and spelling, the learner produces two complete spoken questions.

## Minigame rules for Creator

- Word Ordering: at least two words open (Wh-word + content word); distractors for both slots; complete natural Hebrew translation; unique choices. In Q5 only: rebuild the full question with empty `preFilledIndices` and empty `distractorWords`.
- Letter Ordering: Hebrew meaning only, never the English answer in the prompt. One new spelling target per quest: where, when, why, who, how.
- Word Matching: compact pools, unique tile IDs, varied gap positions, every missing letter present, previously learned words reviewed alongside new ones.
- Speak Aloud: authored `params.prompt` with the speaking action plus the Hebrew meaning. Minimum two English words in every target (short question). No single-word Speak Aloud in this line.
- No more than two identical minigame types in a row.
- Dialogue: no quotation marks, no em dash; learner-facing names only (בו Boo, נמו Nemo, הילדה הקטנה).

## Quest keys

- `wh_questions__q01_the_forgotten_name`
- `wh_questions__q02_the_sailor_who_saw`
- `wh_questions__q03_the_night_the_ship_broke`
- `wh_questions__q04_six_questions_for_lily`
- `wh_questions__q05_the_light_at_the_tower`

## Closure

מדריך ההרים מדליק את המדורה, הרוח שומעת את הסיפור השלם ומודה. הלומד מקבל עשרה מטבעות מיד, והקו נסגר בלי הפניה ל־NPC נוסף.
