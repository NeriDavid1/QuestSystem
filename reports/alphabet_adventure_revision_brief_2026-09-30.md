# The Alphabet Adventure - revision brief

2026-09-30. Target: the_alphabet_adventure; retain its existing four main and three homework quest keys. This revision supersedes only the lesson/story recommendations in alphabet_adventure_brief_2026-09-30.md. Creator owns quest source; this file changes no quest data.

## Required direction

Use child-facing אות ניקוד, Hebrew without niqqud, and no IPA anywhere in learner copy. Explain that English writes vowel sounds with letters, so the term is not a literal Hebrew pointing mark. A has the short open sound heard at the start of apple and the sound איי at the start of acorn. Name, printed form and sound remain different concepts. Do not claim the short sound is simply Hebrew א/איי or an extended version of the other sound.

Put the story, new-letter explanation and upcoming combination/word teaching in each quest START dialogue, then games. Do not immediately add a separate teaching talk step. Oren (Old Man) speaks directly to the player and can teach the short lesson himself; Maya (teacher_maya) gives the homework. Oren narrates Maya's prepared exercise cards when helpful; there is no NPC-to-NPC exchange. Oren at MoonriverCottage, Maya at Alphabet Plaza, game station Exam_Table_Fairy_Rose_Park: directions must not claim adjacency. Chest/window/key/book events remain narrated.

Only A and a are traced in the first lesson. Apple/acorn remain meaningful auditory examples, never first-lesson whole-word tracing or independent spelling. Full-word independent work remains dad/bad after A/B/D are taught. Word Matching bag/cat only fills initial letters and supplies the unlearned endings.

## Contract checks before authoring

Inspected current MINIGAME_TEACHING_GUIDE.md, MinerCategoryDataSO.cs, MinerSession.cs, SliceOrderingDataSO.cs and OrderingSegmenter.cs.

- Miner preserves each target string's case for its visible label and marks target membership on each spawned orb. A and a may both be target entries. requiredCorrect counts any correct orb, including repeated instances; goal 2 does NOT guarantee one uppercase and one lowercase collected. Teach/accept both forms and describe the task as collecting the letter in either of its forms. Do not claim distinct-form completion without an added verified runtime rule. Pool repeats according to the actual tuning; runtime layout/clamping still needs play evidence.
- Slice Letters mode lowercases but preserves EVERY character occurrence in targetText. dad becomes d,a,d, not d,a. Keep targetText lowercase; preFilledIndices empty; distractors from taught letters; extraLetterDistractorCount 0 with explicit distractors.
- Classic Letter Ordering also lowercases. Use targets ba,ca,da as taught sound combinations, not vocabulary words. When supplying distractors, extraDistractorCount must equal their positive customDistractors length; count zero suppresses the custom pool. Guided two-letter ordering may legitimately use count 0 and custom [] because the two known target tiles still require ordering; this differs from a lone one-letter listening tile.
- Listen & Build is reserved for a meaningful auditory check rather than repeated one-letter tasks in every stage. Existing apple, acorn, dad, bad audio files only; first-sound mapping uses whole recording and states this explicitly. No invented isolated phoneme or BA/CA/DA clip.

## Start copy and ordered games

Each quoted block below is exact learner text, but serialization may split it into smaller START-dialogue entries. No additional immediate teacher encounter is required.

### A - festival book and the apple clue

שלום, אני אורן. הערב אספר סיפור בחגיגת הממלכה, אבל הספר נעול בתיבה ושכחתי איפה המפתח. ברמז הראשון ציירתי תפוח. מאיה הכינה לי כרטיסי לימוד שיעזרו לך לפענח את הרמזים. נתחיל ב-A, שנקראת איי. A גדולה ו-a קטנה הן שתי צורות של אותה אות. A היא אות ניקוד באנגלית: באנגלית כותבים גם את צלילי הניקוד באותיות. בתחילת apple, תפוח, יש לה צליל קצר ופתוח. בתחילת acorn, בלוט, היא נשמעת כמו השם איי. זאת אותה אות שיכולה לייצג צלילים שונים. אין צורך לקרוא את שתי המילים לבד. בשולחן הלימוד שבפארק תצייר את שתי הצורות, תאסוף את האות, ואז תקשיב לרמז התפוח.

Games: Draw [A,a] -> Miner targets [A,a], foils [B,b] -> Listen apple with target a, foil b -> Slice aaa. Slice consolidates three required occurrences of the same familiar letter: targetText aaa, Letters, preFilledIndices [], distractors [b], extraLetterDistractorCount 0; prompt חתוך שלוש פעמים את האות הקטנה איי כדי ליצור רצף אותיות. זה רצף, לא מילה. Move acorn listening to homework rather than repeat the same one-letter choice here. Early B/b are visibly different unlearned foils, not required new sounds. End: התפוח מזכיר לי שלקחתי הבוקר את התיק שלי. הרמז הבא קשור לתיק.

A example params:

```json
{"prompt":"אסוף רק את האות איי, בצורה הגדולה או הקטנה שלה.","categoryLabel":"שתי הצורות של איי","targetWords":["A","a"],"distractorWords":["B","b"],"requiredCorrect":2,"allowedMistakes":3}
```

Listen apple retains real _OurAssets/Art/Audio/Voice/Words/apple.mp3; prompt הקשב למילה ובחר את האות של הצליל הראשון שלה. targetWord a, hintMode AudioOnly, extraDistractorCount 1, customDistractors [b]. This is initial-sound association with supported choice, not pronunciation assessment. Acorn is explained here, revisited through its existing clip in homework.

### B - rustle in the bag

ברמז השני מופיע התיק שלי. Bag פירושו תיק. האות B נקראת בי, והיא נכתבת B גדולה או b קטנה. בתחילת bag שומעים את הצליל הקצר של B, בלי להוסיף את הצליל אי של השם בי. עכשיו נחבר את הצליל הזה לצליל של A בתחילת apple. זה צירוף צלילים, ואפשר לקרוא לו הברה; הוא אינו מילה שעליך לזכור. בתרגול תצייר ותזהה את B, תחבר את שני הצלילים לפי הסדר, ואז תשלים רק את האות הראשונה של תיק. סוף המילה כבר כתוב כי עוד לא למדנו את כל האותיות שלו.

Games: Draw [B,b] -> Miner [B,b], foils [A,a] -> one Listen bag initial b -> Letter Ordering ba -> Word Matching bag missingIndices [0], choices a,b. End: התפוח היה בתוך התיק, אבל שמעתי ממנו רחש. משהו התחבא בפנים.

BA exact params:

```json
{"prompt":"הרכב הברה משני צלילים לפי הסדר: הצליל הקצר בתחילת תיק באנגלית, ואז הצליל של אות הניקוד בתחילת תפוח באנגלית. זה צירוף צלילים, לא מילה.","targetWord":"ba","extraDistractorCount":0,"customDistractors":[]}
```

This first guided combination uses only two taught tiles, b and a. They still need placing in the taught order, so no additional distractors are needed here. Later homework adds now-taught c/d foils and reduces support. Do not deduplicate target occurrences or add redundant answer letters as wrong options.

### C - cat surprise

ברמז הבא מצויר חתול. Cat פירושו חתול. האות C נקראת סי, ונכתבת C גדולה או c קטנה. בתחילת cat היא מייצגת צליל כמו ק בעברית. ל-C יש גם צלילים אחרים; היום נתאמן על הצליל שבתחילת חתול. נחבר את הצליל הזה לצליל של A בתחילת apple, לפי הסדר. שוב ניצור הברה, ולא נדרוש לקרוא מילה חדשה. בסוף תשלים את האות הראשונה של חתול; הסוף כבר כתוב.

Games: Draw [C,c] -> Miner [C,c], foils [A,a,B,b] -> one Listen cat initial c -> Letter Ordering ca -> Word Matching cat initial gap choices b,c. End: החתול שלי התחבא בתיק וקפץ החוצה. כשהרמתי אותו, הנחתי את המפתח לרגע. הרמז האחרון הוא הכרית שהבת שלי הכינה לי.

CA exact params:

```json
{"prompt":"הרכב הברה משני צלילים לפי הסדר: הצליל כמו ק בתחילת חתול באנגלית, ואז הצליל של אות הניקוד בתחילת תפוח באנגלית. זה צירוף צלילים, לא מילה.","targetWord":"ca","extraDistractorCount":1,"customDistractors":["b"]}
```

### D - the cushion by the window

הבת שלי רקמה על הכרית מילה קטנה. האות החדשה D נקראת די, ונכתבת D גדולה או d קטנה. בתחילת dog, כלב, היא מייצגת צליל קצר כמו ד, בלי להוסיף אי. ב-b הקו הגבוה משמאל לבטן, וב-d הוא מימין. נחבר את הצליל של D לצליל של A כמו בתחילת apple וניצור הברה. אחר כך נוסיף שוב את הצליל של D ונקבל dad, שפירושה אבא. יש d גם בתחילה וגם בסוף. Bad פירושו רע: שם הצליל הראשון הוא של B. האות הראשונה משנה את הצליל ואת המשמעות. כל האותיות של שתי המילים כבר מוכרות לך.

Games: Draw [D,d] -> Miner [D,d], foils [B,b] -> Letter Ordering da -> one Listen dog initial d -> Listen dad -> Slice dad. Listening progresses here from initial association to full taught-word construction. Only if a model is helpful, drawing [dad,bad] may follow formation in this lesson; it is supported practice, not prerequisite for first-lesson word exposure.

DA exact params:

```json
{"prompt":"הרכב הברה משני צלילים לפי הסדר: הצליל הקצר בתחילת כלב באנגלית, ואז הצליל של אות הניקוד בתחילת תפוח באנגלית. זה צירוף צלילים, לא מילה.","targetWord":"da","extraDistractorCount":2,"customDistractors":["b","c"]}
```

Slice exact params:

```json
{"prompt":"הרכב את המילה אבא באנגלית. חתוך את האותיות לפי הסדר; אותה אות נדרשת גם בתחילת המילה וגם בסופה.","segmentation":"Letters","targetText":"dad","preFilledIndices":[],"distractors":["b","c"],"extraLetterDistractorCount":0}
```

Main closure: אבא! הבת שלי רקמה dad על הכרית שנמצאת ליד החלון. עכשיו נזכרתי: הנחתי שם את המפתח כדי להרים את החתול. מצאתי אותו ופתחתי את התיבה. הספר בפנים, ובחגיגה אספר איך עזרת לי. מאיה הכינה לך שלושה תרגולי בית קצרים להמשך.

## Homework, same existing three quest keys

1. **Case families and b/d:** START Maya explains b/d side cue and goal. Draw [b,d,B,D] -> Miner targets [B,b,D,d], foils [A,a,C,c], requiredCorrect 4, allowedMistakes 3 -> Slice target bdb, prompt חתוך לפי הסדר את האות הקטנה בי, אחריה די, ואז שוב בי. זה רצף אותיות, לא מילה. Here names deliberately assess visual symbol retrieval, not sound blending; d must be present once and b twice. Miner teaches acceptance of both forms, not exact one-per-form collection.
2. **Syllables by sound:** START reminds same short open A sound from apple and consonant sound vs name. Letter Ordering ca -> ba -> da, each Hebrew sound prompt as above, but use only now-taught distractors: ca foils b,d; ba foils c,d; da foils b,c. Different order avoids memorized quest sequence. One Listen acorn -> a with foils b,c,d can close the task to revisit the other A sound. No claim of independent two-sound discrimination from a shared response.
3. **Two small words:** START models meaning dad=אבא, bad=רע and shared ending; Letter Ordering dad from Hebrew meaning -> Listen bad -> Slice dad. Keep repeated d occurrences. First practice language/spelling, then low difficulty motor consolidation; no speech-recognition or full sentence load.

Homework START sample: שלום, מאיה כאן. אורן כבר מצא את הספר. עכשיו נכין לחגיגה כרטיסים מסודרים ונחזק את מה שלמדת. בתרגול הזה נעבוד על [specific target]. [one short explanation/model]. אחר כך תוכל לגשת ישר למשחקים שבשולחן הלימוד בפארק.

## Hebrew sound cues and remaining evidence

Prefer descriptions anchored to known recorded examples over Hebrew בא/קא/דא transcription, because Hebrew א does not precisely reproduce the short vowel in apple. If user needs those mnemonics shown, label them as approximate reminders only and explicitly keep the English sound from apple; never call Hebrew בא an exact English phonetic spelling. No IPA and no niqqud required. Target ba/ca/da are lowercased by runtime; uppercase BA/CA/DA may be modelled in START but not independently case-scored.

Creator must preserve real IDs, structured rewards, seven-quest chain and turn-in dialogues. Avoid immediate extra teaching objectives and do not claim Miner enforces distinct forms. QA verifies source/import, exact custom distractor counts, all repeated tiles, runtime prompt/audio playback separately. Word clip presence and cached recognition are evidence of an asset, not isolated-sound or production assessment. Difficulty 1 for drawing/miner/slice, 1-2 for ordering/listening; motor load is not language mastery.
