# Personal Pronouns — Pedagogical Brief (v2)

**מסמך תכנון — Local authoring only**
**קהל:** גיל ~9–11
**מפתח קו:** `personal_pronouns`
**שפת הדרכה:** עברית-first; English רק כחומר הלימוד
**אין העלאה לאתר / Supabase עד אישור מפורש מהמשתמש**

## Scope

- Five connected quests teaching the basic personal pronouns: I / You / He / She / It / We / They.
- **Two NPCs only**, alternating between them, both in FairyRosePark.
- **One station for the whole questline** — the learner never leaves the park.
- Levels: Q1 = 50; Q2–Q5 = 1.
- No `reach_location`, `collect_item`, or `deliver_item`.
- Every quest uses `wait_for_npc_turn_in: false`.

## Story: The Village Play

מחר בערב יש הצגה בפארק וכל הכפר מגיע. הילד הקטן כתב את המחזה לבד, אבל הוא כתב כל שם שוב ושוב: Dan is here. Dan is happy. Dan is the king. בגלל זה הדפים במחברת נגמרו באמצע, וסוף ההצגה עוד לא כתוב.

ראש הכפר מגלה לו את הפתרון: יש מילים קצרות שיכולות לבוא במקום שם. במקום Dan is the king אפשר לכתוב He is the king. ככה המחזה כולו נכנס למחברת אחת.

הלומד עובר הלוך ושוב בין השניים - ראש הכפר מלמד את הכלל, והילד הקטן מיישם אותו על התמונה הבאה במחזה. כל קווסט מציל תמונה אחרת בהצגה, ובקווסט האחרון ההצגה עולה על הבמה.

**למה הסיפור עובד פדגוגית:** מחברת שנגמרת היא סיבה אמיתית וברורה לילד להשתמש במילה קצרה במקום שם. כל כינוי גוף נדרש בגלל צורך אמיתי בעלילה: מי מדבר על הבמה, אל מי הוא פונה, על איזו דמות מדברים, מה זה האביזר, מי הלהקה, ומי הקהל.

## Learning map

| Quest | NPC | Sub-skill | Learner action |
|-------|-----|-----------|----------------|
| Q1 | ראש הכפר | What a pronoun is; **I / You** | The word for the speaker vs the listener |
| Q2 | הילד הקטן | **He / She** | Choose by the gender of the character on stage |
| Q3 | ראש הכפר | **It / We** | A prop or animal vs the whole troupe including me |
| Q4 | הילד הקטן | **They** + review of all seven | One word for a crowd |
| Q5 | ראש הכפר | Mixed transfer + spoken lines | Full rebuilds with no help, two spoken stage lines |

Sub-skill order: introduce → practise the new pair alone → review earlier pronouns inside the new quest's matching game → mixed transfer only in Q5.

## World anchors (verified registry IDs)

| Quest | Learner-facing name | NPC ID | Area | Station |
|-------|---------------------|--------|------|---------|
| Q1 | ראש הכפר Village Head | `Village Head` | FairyRosePark | `Exam_Table_Fairy_Rose_Park` |
| Q2 | הילד הקטן | `Little Boy` | FairyRosePark | `Exam_Table_Fairy_Rose_Park` |
| Q3 | ראש הכפר Village Head | `Village Head` | FairyRosePark | `Exam_Table_Fairy_Rose_Park` |
| Q4 | הילד הקטן | `Little Boy` | FairyRosePark | `Exam_Table_Fairy_Rose_Park` |
| Q5 | ראש הכפר Village Head | `Village Head` | FairyRosePark | `Exam_Table_Fairy_Rose_Park` |

## Hebrew meanings (teaching targets)

I = אני · You = אתה / את · He = הוא · She = היא · It = זה (חפץ או בעל חיים) · We = אנחנו · They = הם / הן

Opening explanation (Q1 dialogue): כינוי גוף (pronoun) הוא מילה קצרה שבאה במקום שם. במקום Dan is the king אפשר לומר He is the king.

## Quest flows

### Q1 — The Notebook Ran Out (level 50, ראש הכפר)

1. `talk_to_npc` `Village Head` — what a pronoun is; I = אני, You = אתה/את
2. `word_matching` — you, am, are (the small words every stage line needs)
3. `word_ordering` — open I: `I am the king` (אני המלך)
4. `letter_ordering` — spell you (אתה/את)
5. `word_ordering` — open You: `You are my friend` (אתה החבר שלי)
6. `speak_aloud` — full line: `I am the king.` (אני המלך)
7. `return_to_npc` — the first scene now fits on half a page; go to the boy

### Q2 — Two Actors, One Name (level 1, הילד הקטן)

1. `talk_to_npc` `Little Boy` — He = הוא, She = היא
2. `word_ordering` — open He: `He is a singer` (הוא זמר)
3. `letter_ordering` — spell she (היא)
4. `word_matching` — you, he, she
5. `word_ordering` — open She: `She is a dancer` (היא רקדנית)
6. `speak_aloud` — full line: `He is my best friend.` (הוא החבר הכי טוב שלי)
7. `return_to_npc` — scene two fits on one page; the head needs help with the props

### Q3 — The Hat and the Whole Troupe (level 1, ראש הכפר)

1. `talk_to_npc` `Village Head` — It = זה (חפץ או בעל חיים), We = אנחנו
2. `letter_ordering` — spell it (זה)
3. `word_ordering` — open It: `It is a hat` (זה כובע)
4. `word_matching` — she, it, he, we
5. `word_ordering` — open We: `We are actors` (אנחנו שחקנים)
6. `speak_aloud` — full line: `We are on the stage.` (אנחנו על הבמה)
7. `return_to_npc` — the prop list is ready; the boy is stuck on the crowd scene

### Q4 — The Crowd Scene (level 1, הילד הקטן)

1. `talk_to_npc` `Little Boy` — They = הם/הן, ליותר מאחד
2. `word_ordering` — open They: `They are my friends` (הם החברים שלי)
3. `word_matching` — all six spellable pronouns: you, he, she, it, we, they
4. `letter_ordering` — spell they (הם)
5. `word_ordering` — open They + place noun: `They are in the garden` (הם בגן)
6. `speak_aloud` — full line: `They are very happy.` (הם מאוד שמחים)
7. `return_to_npc` — the play is finished with two blank pages to spare

### Q5 — Opening Night (level 1, ראש הכפר)

1. `talk_to_npc` `Village Head` — the audience is seated; all seven pronouns mixed
2. `word_matching` — mixed six with new gap positions
3. `word_ordering` — full rebuild, no pre-fill, no distractors: `She is the queen` (היא המלכה)
4. `word_ordering` — full rebuild, no pre-fill, no distractors: `We are a family` (אנחנו משפחה)
5. `letter_ordering` — spell we (אנחנו)
6. `speak_aloud` — full line: `I am ready for the show.` (אני מוכן להצגה)
7. `speak_aloud` — full line: `It is a beautiful day.` (זה יום יפה)
8. `return_to_npc` — the play is over, the crowd applauds; 10 coins immediately; no further NPC

The two consecutive Speak Aloud targets in Q5 are intentional: they are the learner's two lines on stage.

## Minigame rules for Creator

- **Speak Aloud = a complete sentence.** Every target is a full sentence of four to six words, and `targetPhrase` holds that whole sentence including the final period, so recognition validates the sentence and not a single word. `targetWords` lists exactly the words of that same sentence. `silenceTimeoutSeconds: 3.5` to allow a full sentence. Instruction wording is always the sentence form: `אמרו בקול את המשפט המלא באנגלית.` The prompt adds the natural Hebrew meaning of the whole sentence. No single-word and no fragment targets in this line.
- Word Ordering: at least two words open (pronoun + content word); distractors for both slots; complete natural Hebrew translation; unique choices. In Q5 only: rebuild the full sentence with empty `preFilledIndices` and empty `distractorWords`.
- The pronoun distractors must always be other pronouns, so the learner has to understand who is being talked about and cannot guess by elimination.
- Letter Ordering: Hebrew meaning only, never the English answer in the prompt. One new spelling target per quest: you, she, it, they, we.
- Word Matching: compact pools, unique tile IDs, varied gap positions, every missing letter present, earlier pronouns reviewed alongside the new ones.
- No more than two identical minigame types in a row.
- Dialogue: no quotation marks, no em dash; learner-facing names only (ראש הכפר, הילד הקטן).

## Quest keys

- `personal_pronouns__q01_the_notebook_ran_out`
- `personal_pronouns__q02_two_actors_one_name`
- `personal_pronouns__q03_the_hat_and_the_troupe`
- `personal_pronouns__q04_the_crowd_scene`
- `personal_pronouns__q05_opening_night`

## Closure

ההצגה נגמרת, הקהל מוחא כפיים, והמחזה כולו נכנס למחברת אחת. ראש הכפר מודה ללומד ומעניק עשרה מטבעות מיד. הקו נסגר בלי הפניה ל־NPC נוסף.
