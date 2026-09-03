# Pedagogical Brief: The Kingdom's Worst Day

**מסמך תכנון בלבד — לא YAML ולא פרסום**  
**קהל:** כיתה ז׳–ח׳  
**רמת קו מוצעת:** 7–8  
**שפת הדרכה:** עברית-first; English מופיע רק כחומר הלימוד שהלומד צריך לזהות, לבחור, לכתוב או לומר.

## גבולות המסמך

המסמך מתרגם את premise הזמין של **The Kingdom's Worst Day** למסלול של ארבעה quests תוכניים. בתוך ה־quest הרביעי יש שני checkpoints קוגניטיביים, כדי לכסות את כל הרצף:

`Recognize → Understand → Use → Combine → Transfer`

ה־IDs של quests, dialogues ו־minigame instances לא הומצאו כאן. יש להקצות אותם ב־QuestForge או ב־Quest Creator רק לאחר אישור הבריף. כל ה־NPC, האזור והתחנה שמופיעים בהמשך הם IDs שהועתקו מה־registry המאומת.

## רעיון הסיפור

זהו היום הגרוע ביותר בממלכה: לא מפלצת תקפה — **השפה עצמה התקלקלה**. שמות החפצים התחלפו, פעולות נעלמו מההוראות, והמילים שמתארות דברים איבדו את המשמעות שלהן. לכן השומרים לא מזהים מה נמצא ליד השער, בוני הממלכה לא יודעים איזו פעולה לבצע, והציירת לא מצליחה לתאר את העץ. התלמיד/ה משחזר/ת את מערכת המילים בשלבים, עד שאפשר למסור הוראת חירום חדשה וברורה.

הסיפור מצחיק אך יש לו logic לימודי: בכל אזור מתקנים שכבה אחרת של המשפט, ואז משתמשים באותה שכבה בהקשר חדש.

## עוגני עולם מאומתים

| תפקיד בסיפור | NPC ID מאומת | עובדת registry שיש לכבד | אזור/תחנה מאומתים |
|---|---|---|---|
| עדכון ופתיחת הקו | `teacher_maya` | מורה אנגלית עליזה, שולחת ילדים להרפתקאות אותיות ומילים | אין להוסיף `reach_location` ל־Alphabet Plaza: האזור אינו מופיע ב־areas registry |
| nouns / שמות חפצים | `City Gaurd Info` | Fenn the Chatty, שומר עירוני שמכיר כל שמועה | `KingdomGate` → `Exam_Table1_Outside_Gate` ו־`Wooden_Cart1_Inside_Gate` |
| verbs / פעולות | `Blacksmith` | Will The Smith, נפח ידידותי שמתקן כלים ואוהב רעש פטישים | `BuildersHome` → `Lost_Chest1_BuildersHomeArea` |
| adjectives / תיאורים | `Painter` | ציירת חולמנית שמחפשת צבעים ורעיונות למילים | `The Sunspire Tree` → `Lost_Chest7_The_Sunspire_Tree` |
| combine / מעבדה | `Professor Crazy` | פרופסור פרוע עם רעיונות גדולים וניסויים מבולגנים | `Solitude Tower` → `WoodenCart2_Solitude_Tower` |
| transfer / בדיקת שימוש | `Mountain Guide` | מדריך שמכיר את השבילים הגבוהים והמגדלים הבודדים | `TowerOfLostVigil` → `Fire_Camp_Tower_Of_Lost_Vigil` |

כל pairing של area ו־world object לעיל נלקח מה־registry. אין להשתמש בשם minigame בתור `world_object_id`.

## מפת למידה

| Checkpoint | תוכן | מה הלומד עושה | ראיית הצלחה |
|---|---|---|---|
| Recognize | nouns | מזהה מילה מול תמונה/משמעות | 4 התאמות נכונות באותו round |
| Understand | verbs | מקשר פועל לפעולה ומבין אותו בתוך משפט קצר | משלים לפחות 3 מתוך 4 משפטי פעולה ללא גילוי התשובה |
| Use | adjectives | משתמש בתיאור כדי לתאר דבר ולא רק לשנן זוגות | בונה 3 משפטים עם adjective מתאים |
| Combine | nouns + verbs + adjectives | מרכיב משפטים חדשים משלוש הקטגוריות | 3 משפטים תקינים עם תרגום עברי מוצג |
| Transfer | mixed, בהקשר חדש | אומר משפט/הוראה שלא הוצג/ה בדיוק קודם | אומר משפט קצר מובן; retries בלתי מוגבלים |

היעד הוא כ־70% זמן פעילות אנגלית. דיאלוגים קצרים נותנים הקשר, אך ה־minigames הם מרכז הלמידה.

## מבנה הקו

### Quest 1 — Nouns: השער איבד את השמות

**Checkpoint:** Recognize  
**NPC/אזור:** `City Gaurd Info` ב־`KingdomGate`  
**תחנות:** `Exam_Table1_Outside_Gate`, אחר כך `Wooden_Cart1_Inside_Gate`  
**אוצר מילים מוצע:** `gate`, `key`, `book`, `crown` — תוכן לימודי מוצע, לא IDs.

**פתיחה בעברית:** Fenn מספר שכל שלטי השער החליפו שמות, ולכן הוא קורא ל־gate “a very large spoon”. הוא מבקש מהתלמיד/ה להחזיר לכל תמונה את ה־noun הנכון.

**זרימת צעדים:**

1. `talk_to_npc` אל `City Gaurd Info` — דיאלוג קצר בעברית שמציג את ארבעת החפצים; English words מוצגים רק כדוגמאות לימודיות.
2. `reach_location` אל `KingdomGate` אם ה־quest מתחיל מחוץ לאזור.
3. `play_minigame` מסוג `word_matching` על `Exam_Table1_Outside_Gate`, variant מוצע `word_to_image`, difficulty 5: התאמת ארבעת ה־nouns לתמונות.
4. `play_minigame` מסוג `letter_ordering` על `Wooden_Cart1_Inside_Gate`, difficulty 3: כתיבת שני nouns לפי המשמעות בעברית, למשל `כתר` ו־`מפתח`.
5. `return_to_npc` אל `City Gaurd Info` — Fenn מודה בעברית ומצביע על BuildersHome, שם “אף אחד כבר לא יודע מה לעשות”.

**נוסח הוראות UI מוצע:**

- `word_matching`: `התאימו כל מילה באנגלית לתמונה המתאימה.`
- `letter_ordering`: `כתבו את המילה כתר באנגלית.`
- כישלון: `כמעט! נסו שוב; הסתכלו על התמונה ועל המשמעות.`

הוראת ה־letter ordering נותנת משמעות בעברית בלבד; היא לא מציגה את התשובה באנגלית.

### Quest 2 — Verbs: בית המלאכה קפא

**Checkpoint:** Understand  
**NPC/אזור:** `Blacksmith` ב־`BuildersHome`  
**תחנות:** `Lost_Chest1_BuildersHomeArea`, ולאחר מכן `Wooden_Cart1_Inside_Gate`  
**אוצר מילים מוצע:** `fix`, `open`, `carry`, `close`.

**פתיחה בעברית:** Will אומר שהכלים שלו שלמים, אבל פתקי העבודה איבדו את ה־verbs. הוא מנסה “לתקן” בלי לבצע פעולה ומבקש מהתלמיד/ה לחבר כל פועל לפעולה הנכונה, ואז להבין אותו בתוך משפט.

**זרימת צעדים:**

1. `talk_to_npc` אל `Blacksmith` — Will מסביר בעברית מה כל פעולה צריכה לעשות; אין נאום ארוך.
2. `reach_location` אל `BuildersHome`.
3. `play_minigame` מסוג `word_matching` על `Lost_Chest1_BuildersHomeArea`, variant מוצע `word_to_image`: התאמת ארבעת ה־verbs לאיורי פעולה.
4. `reach_location` אל `KingdomGate`.
5. `play_minigame` מסוג `word_ordering` על `Wooden_Cart1_Inside_Gate`, difficulty 5: בניית משפטים קצרים לפי תרגום עברי, למשל “אני פותח את השער” ו־“אני נושא את הספר”. בכל task יש להציג `params.translation`; אפשר להשאיר את מילת הפעולה פתוחה עם `preFilledIndices` ו־`distractorWords`.
6. `return_to_npc` אל `Blacksmith` — Will מסכם בעברית שהממלכה שוב יודעת איזו פעולה לבצע ומפנה לציירת.

**נוסח הוראות UI מוצע:**

- `word_matching`: `התאימו כל פועל לתמונה שמראה את הפעולה.`
- `word_ordering`: `בנו את המשפט לפי התרגום בעברית.`
- הצלחה: `מצוין! עכשיו ברור איזו פעולה לבצע.`

**הערת אימות:** התאמת verbs לאיורים ובניית משפטי פעולה הם payload מוצע. הסוגים רשומים ב־registry, אך יש לאשר ב־Quest Creator/Unity שה־content fields האלה נתמכים בפועל לפני YAML.

### Quest 3 — Adjectives: הציור איבד את התיאור

**Checkpoint:** Use  
**NPC/אזור:** `Painter` ב־`The Sunspire Tree`  
**תחנות:** `Lost_Chest7_The_Sunspire_Tree`, ולאחר מכן `Exam_Table_Fairy_Rose_Park`  
**אוצר מילים מוצע:** `big`, `small`, `bright`, `dark`.

**פתיחה בעברית:** Painter מגלה שכל הציורים נראים “אותו דבר”, כי התיאורים נעלמו. היא מבקשת מהתלמיד/ה לא רק לזהות adjective אלא להשתמש בו כדי לתאר עץ, אור או חפץ.

**זרימת צעדים:**

1. `talk_to_npc` אל `Painter` — דיאלוג בעברית שמציג ניגודים דרך הציור; אין להציג רשימת תשובות בתוך הוראת המשימה.
2. `reach_location` אל `The Sunspire Tree`.
3. `play_minigame` מסוג `word_matching` על `Lost_Chest7_The_Sunspire_Tree`, variant מוצע `opposite_pairing`: התאמת זוגות ניגודיים, למשל `big/small` ו־`bright/dark`.
4. `reach_location` אל `FairyRosePark`.
5. `play_minigame` מסוג `word_ordering` על `Exam_Table_Fairy_Rose_Park`, difficulty 6: בניית שלושה משפטים חדשים לפי תרגום עברי, למשל “The tree is big.”, “The gate is dark.” ו־“The book is small.” התרגום העברי חייב להופיע ב־`params.translation`.
6. `play_minigame` מסוג `speak_aloud` על `Fire_Camp_Tower_Of_Lost_Vigil` רק אם יש מעבר מתוכנן ל־`TowerOfLostVigil`; אחרת להשאיר את הדיבור ל־Quest 4. אין להפעיל Speak Aloud לפני שהמילים נראו ונקראו.
7. `return_to_npc` אל `Painter` — היא מתארת בעברית שהציור “חזר לחיים” ומכינה את המעבר לפרופסור.

**החלטת scope:** כדי לא ליצור נסיעה מלאכותית, ההמלצה היא לדחות את סעיף הדיבור ל־Quest 4. כך Quest 3 נשאר focused על שימוש ב־adjectives, ו־Quest 4 מקבל את Transfer.

### Quest 4 — Mixed: הוראת החירום

**Checkpoints:** Combine → Transfer  
**NPC/אזורים:** `Professor Crazy` ב־`Solitude Tower`, אחר כך `Mountain Guide` ב־`TowerOfLostVigil`  
**תחנות:** `WoodenCart2_Solitude_Tower`, `Fire_Camp_Tower_Of_Lost_Vigil`  
**אוצר מילים:** reuse של nouns/verbs/adjectives מה־quests הקודמים; אין להוסיף קטגוריית דקדוק חדשה.

**פתיחה בעברית:** Professor Crazy בנה מכשיר שמדפיס את הוראת החירום, אבל הניסוי מערבב את כל המילים. הוא מבקש להרכיב משפטים חדשים, ואז Mountain Guide בודק אם אפשר לומר אותם בקול בשביל לאורך המגדל.

**זרימת צעדים:**

1. `talk_to_npc` אל `Professor Crazy` — הסבר עברי קצר על “המכונה המבולבלת”.
2. `reach_location` אל `Solitude Tower`.
3. `play_minigame` מסוג `word_ordering` על `WoodenCart2_Solitude_Tower`, difficulty 7: שלושה משפטים חדשים המשלבים noun + verb + adjective, למשל “The big gate opens.”, “I carry the small book.” ו־“The dark gate closes.” לכל משפט יש תרגום עברי; מומלץ להשאיר רק רכיב אחד פתוח בכל task.
4. `return_to_npc` אל `Professor Crazy` — הוא מאשר שהמכונה עובדת ומעביר את הודעת החירום ל־Mountain Guide.
5. `reach_location` אל `TowerOfLostVigil`.
6. `talk_to_npc` אל `Mountain Guide` — המדריך מסביר בעברית שהמסר חייב להיות מובן גם מחוץ למעבדה.
7. `play_minigame` מסוג `speak_aloud` על `Fire_Camp_Tower_Of_Lost_Vigil`, difficulty 7–8, variant `short_phrase`: הלומד אומר משפט mixed חדש אחד, עם `allowFuzzyMatch: true`, כפתור `Hear it` ו־retries בלתי מוגבלים.
8. `return_to_npc` אל `teacher_maya` — דיאלוג סיום בעברית שמסכם את ארבע הקטגוריות ומכריז שהממלכה ניצלה. אין להוסיף `reach_location` ל־Alphabet Plaza.

**נוסח הוראות UI מוצע:**

- Combine: `בנו משפט חדש לפי התרגום בעברית. השתמשו במילה שמתארת חפץ ובמילה שמתארת פעולה.`
- Transfer: `אמרו את המשפט באנגלית בקול.`
- כישלון בדיבור: `לא שמעתי בבירור. האזינו שוב ונסו פעם נוספת.`

ב־Speak Aloud מותר להציג את משפט היעד באנגלית, כי הילד/ה צריך/ה לומר אותו. בכל שאר המשימות אין להציג את התשובה בתוך ההוראה.

## רצף minigames ובקרת עומס

הרצף המומלץ הוא:

`word_matching → letter_ordering → word_matching → word_ordering → word_matching → word_ordering → word_ordering → speak_aloud`

אין יותר משני מופעים רצופים של אותו סוג. `letter_drawing` רשום במערכת אך אינו נדרש כאן: עבור כיתה ז׳–ח׳ הוא פחות מתאים למטרה הלשונית מאשר התאמה, בניית משפט ודיבור.

## דיאלוגים וסגנון

כל `talk_to_npc`, `return_to_npc`, task label, instruction, hint ו־success/failure text ייכתבו בעברית טבעית וקצרה. English יופיע רק:

- כמילת יעד שהוצגה לפני התרגול;
- כאריחים/אפשרויות שהלומד צריך לבחור או להרכיב;
- כמשפט יעד ב־Speak Aloud.

הדמויות צריכות להישאר נאמנות ל־registry: Fenn מדבר בשמועות, Will על תיקון וכלים, Painter על צבע/תיאור, Professor על ניסוי מבולגן, ו־Mountain Guide על שבילים ומגדלים. אין להוסיף NPCs כמו “Grammar Goblin” או תפקידים שאינם בקטלוג.

## תגמולים והשלמת קו

המלצה עיצובית בלבד, בכפוף לאישור Creator/QA:

- Quests 1–3: XP מדורג ותגמול קטן קיים מה־item registry, או ללא item אם אין צורך ב־deliver step.
- Quest 4: XP מסכם ו־`coin` כתגמול סיום, לפי convention הקיים בפרויקט.

הזרימה המועדפת כאן היא `return_to_npc`, לא `deliver_item`, כדי לא להמציא quest items חדשים. אם יוחלט על item hand-in, יש להעניק אותו ב־`play_minigame.reward_item_id` או ב־`collect_item`, ולא כ־step reward של `deliver_item`.

## Handoff ל־Quest Creator / QA

לפני מימוש:

1. להקצות line key, quest keys, dialogue IDs ו־minigame instance IDs באופן גלובלי דרך QuestForge.
2. לאשר את payloads של `word_to_image`, `opposite_pairing` ו־mixed `word_ordering` ב־Unity; זהו design proposal ולא הוכחת runtime.
3. לאמת שכל `world_object_id` נשאר בדיוק כפי שמופיע כאן ושכל area–station pair תואם ל־registry.
4. ליצור English target content רק אחרי אישור איות, תמונות/אודיו ותרגומים עבריים.
5. להריץ QA על answer disclosure, תרגום בכל sentence-building task, retries, microphone fallback, ורצף minigames.
6. רק לאחר אישור הבריף ליצור YAML ולעדכן index/graph. המסמך הזה עצמו אינו מחליף את שלב האישור ואינו מפרסם דבר.

