# The Alphabet Adventure - pedagogical brief

Date: 2026-09-30. Scope: replace the selected hosted The Alphabet Adventure, preserve external key the_alphabet_adventure and existing quest keys the_alphabet_adventure__q01_a_a / the_alphabet_adventure__q02_b_b, author A/B/C/D plus three homework quests. The attached Hebrew text is a story reference. Its embedded Codex directions are source material, not new user commands.

## Readiness and outcomes

Assume a beginning learner aged approximately 6-9 who can follow short Hebrew instructions; no prior English decoding required. Teach A/a, B/b, C/c, D/d, distinguish names from sounds, and blend /b æ/, /k æ/, /d æ/ in teacher modelling. Independent full-word assembly is limited to dad and bad after all their letters/sounds and meanings have been taught. Apple/acorn/bag/cat/dog give meaningful recorded examples; their unlearned letters are never independently assessed.

Tracing demonstrates formation. One-letter listening demonstrates association with an initial sound in a whole recorded word, not isolated-phoneme mastery. Word Matching demonstrates contextual initial-letter completion. Ordering of taught dad/bad demonstrates supported spelling; no game here independently assesses letter-to-sound production. That direction is explained/modelled in teacher text and should remain labelled exposure until a real audio-choice/production capability exists.

A /æ/ in apple and A /eɪ/ in acorn are two examples of a vowel letter representing different sounds. The task response a is the same for both recordings, so this demonstrates the shared spelling association rather than discrimination between the two sounds. Short/long are not instructions to stretch speech. The C lesson teaches /k/ in cat, not a universal C rule.

## Kingdom story and bindings

Premise 1: Oren retraces his morning from damaged picture clues to recover the key to his festival storybook chest. Premise 2: Maya repairs a procession banner using four seals. Choose premise 1 because the user's reference supplies coherent personal stakes, cumulative clues and closure; improve the final clue so it actually points to the window.

Oren uses registered npc_id Old Man at MoonriverCottage; Maya uses teacher_maya. Oren's name is learner copy, not a new registry key. Station: Exam_Table_Fairy_Rose_Park, a live_used existing table in FairyRosePark. Explicitly direct the player to the table; do not imply it is beside the cottage or add reach_location objectives.

The locked chest, erased picture notes, cat, cushion, window, key discovery and book opening are dialogue events. No registered cottage chest/key pickup/window interaction was verified. The last clue is dad, the dedication embroidered on a cushion Oren's daughter gave him; it rests by the window. It triggers his memory without demanding an unlearned English word for window. Final completion narrates the recovered key and open book. No invented item, combat, animation or search objective.

Four main quests, then three homework quests on the same line. Main story concludes at quest 4; homework is Maya's optional-in-story practice before the next lesson, with sequential game prerequisites and no claim of mandatory calendar scheduling. Homework revisits the recovered clues and prepares Oren's story cards for the festival. First quest level 50, subsequent levels 1. Difficulty reflects support/content, not these integration levels. Creator selects concrete XP/coin values and echoes them consistently in completion lines.

## Audio dependencies

Confirmed files exist under Unity Assets; use the importer's exact expected relative path convention:

- _OurAssets/Art/Audio/Voice/Words/apple.mp3
- _OurAssets/Art/Audio/Voice/Words/acorn.mp3
- _OurAssets/Art/Audio/Voice/Words/bag.mp3
- _OurAssets/Art/Audio/Voice/Words/cat.mp3
- _OurAssets/Art/Audio/Voice/Words/dog.mp3
- _OurAssets/Art/Audio/Voice/Words/bad.mp3
- _OurAssets/Art/Audio/Museum sounds/SOUNDS FOR MUSEUM new/DAD.mp3

File existence does not prove pronunciation, language or playback. Parent inspected cached Whisper recognition: apple -> Apple, bag -> Bag, dog -> Dog, bad -> Bad, museum DAD -> Dad; acorn -> A corn and cat -> Cut on short clips. Recognition is not phonetic proof; accent/vowel and runtime playback remain PENDING. Preserve these as existing word examples with explicit teaching context, not certified isolated phoneme recordings. Verify recordings and import bindings before runtime PASS. Do not use a.mp3 as an isolated /æ/ clip: its filename does not establish what it says. Museum BA.wav/CA.wav/DA.mp3 are not used until their exact vowel has been heard. The whole-word clips below are always described as whole words. No fabricated audio paths or invented audio-in-dialogue fields.

## Reusable game payloads

Each payload below is exact params. Add the corresponding instruction to the instance; for prompt-bearing games instruction equals params.prompt. All Listen & Build targets are lowercase because the runtime normalizes case. Use hintMode AudioOnly, replay supplied by actual runtime. Custom distractors are single characters. Set extraDistractorCount equal to the customDistractors count: runtime count zero suppresses the custom pool. Equal counts avoid additional random unknown distractors. Drawing preserves case.

### Drawing

A_form: {"symbols":["A","a"]}
A_word: {"symbols":["apple"]}
B_form: {"symbols":["B","b","A","a"]}
B_word: {"symbols":["bag"]}
C_form: {"symbols":["C","c","B","b"]}
C_word: {"symbols":["cat"]}
D_form: {"symbols":["D","d","b","d"]}
D_word: {"symbols":["dad","bad"]}
HW_form: {"symbols":["b","d","B","D","A","a","C","c"]}

Letter-form instruction: צייר את האותיות הגדולות והקטנות לפי הקווים.
Word-model instruction: צייר את המילה לפי הקווים. המילה כולה מופיעה כדוגמה.
Whole-word tracing is exposure/formation and explicitly permits untaught letters as a model; never report it as independent reading.

### First sound from whole recorded word

A_apple: {"prompt":"הקשב למילה ובחר את האות הקטנה שמתאימה לצליל הראשון שלה.","targetWord":"a","promptAudio":"_OurAssets/Art/Audio/Voice/Words/apple.mp3","hintMode":"AudioOnly","extraDistractorCount":1,"customDistractors":["b"]}
A_acorn: {"prompt":"הקשב למילה נוספת ובחר את האות הקטנה שמתאימה לצליל הראשון שלה.","targetWord":"a","promptAudio":"_OurAssets/Art/Audio/Voice/Words/acorn.mp3","hintMode":"AudioOnly","extraDistractorCount":1,"customDistractors":["b"]}
B_bag: {"prompt":"הקשב למילה ובחר את האות הקטנה שמתאימה לצליל הראשון שלה.","targetWord":"b","promptAudio":"_OurAssets/Art/Audio/Voice/Words/bag.mp3","hintMode":"AudioOnly","extraDistractorCount":1,"customDistractors":["a"]}
B_review_a: A_apple with customDistractors ["b"] and extraDistractorCount 1 after B has been taught.
C_cat: {"prompt":"הקשב למילה ובחר את האות הקטנה שמתאימה לצליל הראשון שלה.","targetWord":"c","promptAudio":"_OurAssets/Art/Audio/Voice/Words/cat.mp3","hintMode":"AudioOnly","extraDistractorCount":2,"customDistractors":["a","b"]}
D_dog: {"prompt":"הקשב למילה ובחר את האות הקטנה שמתאימה לצליל הראשון שלה.","targetWord":"d","promptAudio":"_OurAssets/Art/Audio/Voice/Words/dog.mp3","hintMode":"AudioOnly","extraDistractorCount":3,"customDistractors":["a","b","c"]}

A's initial b foil is a visually different unlearned symbol, not a required sound/letter knowledge target; explicitly explain that only the newly taught letter is needed. This early check is supported association with just two choices. Revisit the same contrast after B teaching for cumulative evidence. Randomize tile locations; do not encode correct choice by position.

### Contextual first-letter completion

B_gap: {"letters":[{"id":"tile_1","value":"a"},{"id":"tile_2","value":"b"}],"wordTasks":[{"id":"picture_1","fullWord":"bag","missingIndices":[0]}]}
Instruction: השלם את האות הראשונה במילה שפירושה תיק. הסוף כבר כתוב, ואין צורך לקרוא אותו לבד.

C_gap: {"letters":[{"id":"tile_1","value":"b"},{"id":"tile_2","value":"c"}],"wordTasks":[{"id":"picture_1","fullWord":"cat","missingIndices":[0]}]}
Instruction: השלם את האות הראשונה במילה שפירושה חתול. הסוף כבר כתוב.

D_gap: {"letters":[{"id":"tile_1","value":"b"},{"id":"tile_2","value":"d"}],"wordTasks":[{"id":"picture_1","fullWord":"dad","missingIndices":[0]}]}
Instruction: השלם את האות הראשונה במילה שפירושה אבא.

One task per instance keeps Hebrew context unambiguous without a guessed image path or row-order assumption. Do not claim uppercase/lowercase discrimination in matching: validation is case-insensitive. G/T and O/G are unlearned nontarget scaffold; only the specified initial gaps are assessed.

### Complete taught words

D_listen_dad: {"prompt":"הקשב למילה והרכב אותה מכל האותיות לפי הסדר.","targetWord":"dad","promptAudio":"_OurAssets/Art/Audio/Museum sounds/SOUNDS FOR MUSEUM new/DAD.mp3","hintMode":"AudioOnly","extraDistractorCount":2,"customDistractors":["b","c"]}
D_listen_bad: {"prompt":"הקשב למילה והרכב אותה מכל האותיות לפי הסדר.","targetWord":"bad","promptAudio":"_OurAssets/Art/Audio/Voice/Words/bad.mp3","hintMode":"AudioOnly","extraDistractorCount":1,"customDistractors":["c"]}
HW_spell_dad: {"prompt":"הרכב את המילה אבא באנגלית מכל האותיות לפי הסדר.","targetWord":"dad","extraDistractorCount":2,"customDistractors":["b","c"]}
HW_slice_bad: {"prompt":"חתוך את האותיות לפי הסדר כדי להרכיב את המילה רע באנגלית.","segmentation":"Letters","targetText":"bad","preFilledIndices":[],"distractors":["c"],"extraLetterDistractorCount":0}

Do not deduplicate both d tiles in dad. Fruit Slice difficulty 1 is optional motor consolidation only after familiar spelling/listening practice; if motor accessibility prevents use, substitute ordinary Letter Ordering with same taught target and Hebrew meaning. No sentence/speech task: these would add untaught vocabulary and unnecessary microphone load.

## Ordered quests and exact teaching dialogue

All dialogue is directed to the player, without niqqud or quotation marks. Blocks below may be split for UI readability. Intermediate Maya teaching is meaningful; avoid duplicate completion talk objectives.

### 1 - A: התפוח והרמז הראשון

Oren opening:
בדיוק אותך הייתי צריך. הערב אספר סיפור בחגיגת הממלכה, אבל הספר שלי נעול בתיבה ושכחתי איפה המפתח. כתבתי לעצמי רמזים, וחלק מהאותיות נמחקו. ברמז הראשון מצויר תפוח. תוכל לעזור לי לפענח אותו? מאיה תוכל ללמד אותך ליד שולחן הלימוד בפארק.

Maya before A_form:
נתחיל באות A. קוראים לה איי. לכתוב אותה אפשר בשתי צורות: A גדולה ו-a קטנה. זאת אותה אות. השם של האות והצליל שהיא מייצגת אינם תמיד אותו הדבר.

Maya before A_apple:
Apple פירושו תפוח. A היא אות תנועה. בתחילת apple היא מייצגת את הצליל /æ/. האזן למילה בשלמותה ובחר את האות של הצליל הראשון. אין צורך לקרוא את כל המילה. בחר מתוך שני סימנים; את האות שלנו כבר הכרנו, והסימן האחר משמש רק כאפשרות נוספת.

Maya before A_acorn:
A היא אות מיוחדת: היא יכולה לייצג כמה צלילים. Acorn פירושו בלוט. בתחילת acorn היא מייצגת /eɪ/, כמו בשם האות. Apple ו-acorn מתחילות באותה אות, אף שהצלילים שונים. האזן לשתי הדוגמאות; לא צריך לכתוב אותיות שעוד לא למדת.

A_word instruction adds meaning תפוח; Maya bridge:
עכשיו צייר את המילה תפוח באנגלית לפי הדוגמה. האותיות האחרות עדיין חדשות, ולכן הן מופיעות בשבילך. הציור עוזר להכיר צורות; הוא לא דורש לקרוא את כל המילה לבד.

Oren completion:
תפוח! עכשיו אני נזכר שלקחתי תפוח כשיצאתי מהבקתה. יש ברמז הבא ציור של התיק שלי. אולי הוא יזכיר לי מה קרה אחר כך.

Games: A_form drawing difficulty1; A_apple Listen&Build1; A_acorn Listen&Build1; A_word drawing1. Observable result: forms both cases; associates the a tile with two teacher-introduced recorded beginnings. First-sound contrast remains supported.

### 2 - B: התיק שהשמיע רחש

Maya opening:
ברמז הבא מופיע תיק. Bag פירושו תיק. נלמד את B, שנקראת בי. B היא הצורה הגדולה ו-b הקטנה. בתחילת bag האות מייצגת /b/. בחיבור צלילים משתמשים בצליל הזה, ולא בשם בי.

Games: B_form drawing1; B_bag Listen&Build1; B_review_a Listen&Build1; B_gap WordMatching1; B_word drawing1.

Maya before gap/model:
אחרי הזיהוי נחבר את הצליל של b לצליל /æ/ של a. /b/ ואז /æ/. זה תרגול של חיבור צלילים, ולא מילה שנדרש לקרוא. בסוף bag יש אות שעוד לא למדנו; היא כבר כתובה. צריך להשלים רק את האות הראשונה.

Oren completion:
נכון, לקחתי את התיק. התפוח היה בפנים, אבל שמעתי ממנו רחש מוזר. ברמז הבא מצויר מי שהתחבא בו.

Likely confusion: learner says בי when blending. Planned completion/teacher explanation: בי הוא שם האות. כדי לחבר צלילים נשתמש בצליל /b/. This is teacher copy, not an unsupported automatic wrong-answer field.

### 3 - C: האורח בתוך התיק

Maya opening:
ברמז מצויר חתול. Cat פירושו חתול. האות החדשה היא C, שנקראת סי. C גדולה ו-c קטנה הן אותה אות. בתחילת cat היא מייצגת /k/. לאות הזאת יש גם צלילים אחרים, אבל היום נשתמש בדוגמה של החתול.

Games: C_form drawing1; C_cat Listen&Build2; C_gap WordMatching1; B_gap fresh instance WordMatching1; C_word drawing1.

Maya teaching bridge:
עכשיו נחבר /k/ ואחריו /æ/. חיבור צלילים נעשה לפי הסדר. במילה חתול נשלים רק את האות הראשונה; הסוף כבר כתוב כי עוד לא למדנו את כולו. בתרגול הבא נחזור גם על האות של תיק.

Oren completion:
החתול שלי! הוא התחבא בתיק, וכשפתחתי אותו הוא קפץ החוצה. החזקתי את המפתח באותו רגע. הרמז האחרון הוא הכתובת שעל הכרית שקיבלתי מהבת שלי.

Likely confusion cat/bat: contextual meaning חתול determines cat, no undefined image needed. Do not teach a /s/ rule before lesson target /k/ is established.

### 4 - D: הכרית של אבא והמפתח

Maya opening:
האות החדשה היא D, שנקראת די. D היא גדולה ו-d קטנה. בתחילת dog, שפירושה כלב, היא מייצגת /d/. השם די שונה מהצליל /d/. שים לב: ל-b יש קו גבוה משמאל לבטן, ול-d יש קו גבוה מימין לבטן. אלה שתי אותיות שונות.

Games: D_form drawing1; D_dog Listen&Build2; D_word drawing1; D_gap WordMatching2; D_listen_bad Listen&Build2; D_listen_dad Listen&Build2.

Maya before D_word and full listening:
כבר למדנו את כל האותיות של dad. Dad פירושו אבא. נחבר לפי הסדר /d/, /æ/, /d/. יש d גם בתחילת המילה וגם בסופה. עכשיו bad: /b/, /æ/, /d/. Bad פירושו רע. אם נחליף את האות הראשונה, נשנה גם את הצליל הראשון ואת המשמעות. צייר תחילה לפי הדוגמה; אחר כך הקשב והרכב בעצמך.

Oren completion and main-story closure:
Dad, אבא! הבת שלי רקמה את המילה על הכרית שלי ליד החלון. כשהחתול קפץ, הנחתי שם את המפתח והרמתי אותו בשתי הידיים. עכשיו נזכרתי איפה לחפש. מצאתי את המפתח ופתחתי את התיבה. הספר בפנים, ובחגיגה אוכל לספר איך עזרת לי. אותיות הן כמו מפתחות קטנים לסיפורים. מאיה הכינה לך עוד שלושה תרגולים קצרים לשיעורי הבית.

Observable result: forms D/d and contrasts b/d visually in teacher support; independently assembles full taught words from audio. No claim this proves pronunciation production. Repeated d preserved.

### 5 - שיעורי בית: שתי אותיות דומות

Maya opening:
הספר של אורן כבר מוכן לחגיגה. לפני השיעור הבא נחזק שתי אותיות שקל לבלבל. ב-b הקו הגבוה נמצא משמאל לבטן, וב-d הוא נמצא מימין. צייר אותן, ואז האזן לכל מילה ובחר לפי הצליל הראשון. הפעם נעבוד עם כל ארבע האותיות שלמדנו.

Games: HW_form drawing1; B_bag fresh Listen&Build2 customDistractors ["a","c","d"], extraDistractorCount 3; D_dog fresh Listen&Build2 customDistractors ["a","b","c"], extraDistractorCount 3.

Maya completion:
סיימת לחזור על שתי הצורות ועל הצלילים בתחילת המילים. אם b ו-d מתבלבלות, עצור ובדוק באיזה צד נמצא הקו הגבוה. בתרגול הבא נחזור לרמזי התפוח והחתול.

Assessment reduction: new mixed-choice pool; formation remains modelled. No invented uppercase-choice check.

### 6 - שיעורי בית: הרמזים בסדר חדש

Maya opening:
אורן רוצה להציג בחגיגה את הרמזים שפתרת. הפעם הם מופיעים בסדר אחר. הקשב לכל מילה ובחר רק את האות של הצליל הראשון. אינך צריך לקרוא את המילה כולה. אותה אות יכולה להתאים למילים עם צלילי פתיחה שונים, כמו בשתי הדוגמאות של A.

Games: C_cat fresh Listen&Build2 customDistractors ["a","b","d"], extraDistractorCount 3; A_acorn fresh Listen&Build2 customDistractors ["b","c","d"], extraDistractorCount 3; A_apple fresh Listen&Build2 same learned foils. Do not write English answers in prompts. This tests cumulative retrieval; it does not claim isolated-sound discrimination or unseen vocabulary decoding.

Maya completion:
חזרת אל האותיות בסדר חדש. ב-apple וב-acorn בחרת אותה אות, למרות הצלילים השונים בתחילתן. בשיעורים הבאים נלמד עוד דוגמאות שיעזרו לבחור את הצליל לפי המילה.

### 7 - שיעורי בית: שתי מילים ושני סיפורים

Maya opening:
לסיום נכין שתי מילים קטנות שכבר למדנו. Dad פירושו אבא, ו-bad פירושו רע. שתי האותיות האחרונות זהות, והאות הראשונה משנה את המילה. עכשיו נסה להרכיב לפי המשמעות ואחר כך לפי ההקלטה. במשחק האחרון נחזור על מילה מוכרת בתנועה.

Games: HW_spell_dad LetterOrdering2; D_listen_bad fresh Listen&Build2; HW_slice_bad FruitSlice1. Before the last game remind meaning only, no visible finished answer. A short narrative counterexample can clarify bad describes something wrong, not a label for learner: כשמעשה הוא רע, אפשר לתקן אותו. הטעות בתרגול היא חלק מהלמידה.

Maya closing:
סיימת את ההרפתקה ואת שלושת תרגולי הבית. הכרת את A, B, C ו-D, חזרת על הצורות שלהן וחיברת את הצלילים במילים קטנות. עכשיו יש לך בסיס להמשך, ובשיעור הבא נוסיף אות חדשה.

## QA and publication handoff

Creator: preserve exact hosted line identity, import current draft backup before replacement, line-scoped quest/dialogue/instance IDs, correct chain and quest turn-in conventions, explicit instance instructions and prompt-bearing fields, real catalog station/IDs, consistent structured/prose rewards. Avoid inferred physical interactions. Check letter/word tracing importer is current.

QA: check no niqqud; no NPC-to-NPC speeches; all model/new knowledge is taught before checks; no unlearned full spelling; drawing-only claims correctly labelled; Listen&Build lowercase normalization; G/T endings scaffolded; all foils learned after initial exposure; dad gets two d tiles; all audio asset references resolve and actual language/pronunciation verified; main closure before homework; runtime/published evidence distinct. Listen replay, UI prompt rendering, audio-first partial-target behavior and motor accessibility require runtime evidence. File existence and valid bundle alone are not runtime PASS.
