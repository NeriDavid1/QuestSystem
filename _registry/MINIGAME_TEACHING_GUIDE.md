# Minigame Teaching Guide

Read alongside [shared rules](QUESTLINE_CONTENT_RULES.md). These are content-authoring contracts, not claims that a live playthrough has passed.

## Sources and freshness

Audited 2026-09-30 against the published [Creator catalog](https://neridavid1.github.io/QuestSystem/catalog.html) and its [data](https://neridavid1.github.io/QuestSystem/catalog-data.json), local minigames.yaml, editor/src/lib/minigameParams.ts, letterDrawing.ts and letterOrdering.ts.
Runtime evidence: English Kingdom Assets/_OurAssets/Scripts/GamePlay/MiniGames data/mode classes and Scripts/Editor/Tools/Quests/DatabaseSync importers. Recheck these when implementation changes.

There are eight catalog choices; Letter Ordering and Listen & Build share a backend but have distinct authoring IDs. Catalog variants are metadata, not evidence that any imagined interaction exists.

| ID | Best learning evidence | Range | Main dependency |
|---|---|---|---|
| letter_drawing | Letter/word formation along a model | 1-4 | Ready case-sensitive glyph assets |
| letter_ordering | Spelling from a meaning/context cue | 1-6 | Known target letters |
| listening_letter_ordering | Listening-to-spelling correspondence | 1-6 | Matching playable English audio |
| word_matching | Missing-letter/whole-word discrimination | 1-8 | Valid gaps and tile occurrences |
| word_ordering | Sentence construction | 2-10 | Taught words and syntax |
| speak_aloud | Spoken production recognized by the system | 4-10 | Microphone/recognition, known phrase |
| dwarf_miner | Semantic/category discrimination | 1-8 | Unambiguous category membership |
| fruit_slice | Spelling or sentence order under motor demand | 1-8 | Previously practised target and segmentation |

Examples below are params fragments, not complete quests. Assign a verified station, instance key, difficulty and supported Hebrew instruction. Asset placeholders are never publishable paths.

## letter_drawing - Letter Drawing

- Each manual entry is one tracing round: a letter OR a complete word. Preserve order, case and repetitions.
- Current authored field: symbols. Example: {"symbols":["A","a","Apple","B","bag"]}.
- Use instance instruction, e.g. ציירו את האותיות והמילים לפי הקווים. No params.prompt is advertised.
- A whole word is composed onto one tracing surface; Apple is not five independent rounds.
- Start with formation/shape, then a familiar word. Showing the model is necessary support, not an answer leak.
- Tracing Apple is not evidence that the learner can independently spell or decode Apple.
- Do not author new drawingInputMode, word, letter, strokes or previewImage fields. Those earlier contracts are read for compatibility only.
- QA: entries are nonempty ASCII English letters only, no spaces/punctuation; required glyphs exist; each word remains one round; case and repeated letters survive import. Current Unity importer support must be present in the target game build.

## letter_ordering - Letter Ordering

- Fields: prompt, targetWord, extraDistractorCount, customDistractors, visualVariant, promptAudio, hintMode, wordRevealDatabase.
- Choose the game ID to select the classic presentation; do not use legacy visualVariant to override another game ID.
- Example: {"prompt":"סדרו את האותיות וכתבו את המילה חתול באנגלית.","targetWord":"cat","extraDistractorCount":2,"customDistractors":["b","n"]}.
- Use familiar vocabulary. Teach c/a/t before independently spelling cat.
- Start with a small plausible pool; later contrast a learned neighboring spelling. Do not add distracting unknown letters simply to increase difficulty.
- customDistractors contains single characters; repeated required letters, such as both p letters in apple, must remain available.
- QA: prompt does not show the target spelling; answer is a valid intended word; case behavior is checked where relevant; distractors cannot replace the intended answer with another equally valid answer.
- Do not call it pronunciation assessment or use it to order sentence words.

## listening_letter_ordering - Listen & Build

- Same parameter family as Letter Ordering; separate ID selects ListenAndBuild visuals.
- Key additions: promptAudio is an existing Unity AudioClip path; hintMode is AudioOnly or TextAndAudio. No microphone is required.
- Example text/answer fields: {"prompt":"הקשיבו למילה וסדרו את האותיות.","targetWord":"cat","hintMode":"AudioOnly","extraDistractorCount":1}.
- This example still REQUIRES a verified promptAudio recording for a complete listening exercise. Do not invent a path or claim the website preview plays Unity audio.
- Audio is technically optional in the editor. A listening objective is not ready until matching playable audio is available; a preserved manually assigned Unity clip must be verified.
- The recording must match the intended task: letter name, isolated taught sound, or whole word. A whole-word clip does not magically become a first-phoneme clip.
- For a first letter lesson, a one-letter target needs appropriate audio and meaningful alternatives. Full-word assembly requires taught letters.
- AudioOnly supports evidence from listening; TextAndAudio can scaffold meaning. Document when a text clue lets the learner bypass listening.
- QA: replay works in the target runtime, clip resolves, prompt language is correct and clues do not expose the written English answer.

## word_matching - Word Matching

- Actual content fields: letters and wordTasks. Instruction belongs in the instance instruction.
- letters entries have unique id and value. wordTasks entries have id, fullWord, missingIndices and optional supported image reference.
- Example: {"letters":[{"id":"choice_b","value":"b"},{"id":"choice_c","value":"c"}],"wordTasks":[{"id":"cat","fullWord":"cat","missingIndices":[0]},{"id":"bag","fullWord":"bag","missingIndices":[0]}]}.
- Supply meaning/image/context where needed to disambiguate gaps. The JSON example alone is not a complete semantic lesson.
- Select zero-based character gaps for the intended skill. Initial-letter lessons use initial gaps; middle-vowel lessons use vowel gaps. Vary location later when pedagogically relevant.
- Count required tile occurrences, including repeated values with distinct IDs. IDs never encode which answer belongs to which word.
- Whole-word gaps are supported when all letters of one word are missing: fullWord: an apple, missingIndices: [0,1], tile value: an. Blank width must not reveal word length.
- Do not require opposite pairing or arbitrary two-column matching solely because a catalog variant says opposite_pairing; verify an applicable runtime representation first.
- Shuffle choices independently of tasks. Do not force every answer off its matching row: with two possible answers that can reveal the solution.
- QA: every index and character/whole-word group matches; every required occurrence is available; fragments derive from fullWord; wrong options are actually wrong in the given context; image paths resolve.

## word_ordering - Word Ordering

- Fields: prompt, translation, englishWordsInOrder, preFilledIndices, distractorWords, wordRevealDatabase.
- Example: {"prompt":"סדרו את המילים למשפט באנגלית: הכלב גדול.","translation":"הכלב גדול.","englishWordsInOrder":["The","dog","is","big"],"preFilledIndices":[],"distractorWords":["small"]}.
- Use a complete natural sentence and complete Hebrew meaning. Do not show its finished English sequence in the instruction.
- Default short practice to full assembly. Guided scaffolding may lock known nontarget tokens; document the support and later remove it. Do not prefill the skill being assessed.
- Use enough plausible distractors for the goal/readiness, not a fixed quota. A semantically wrong alternative may be grammatical; the Hebrew meaning must determine the intended answer.
- preFilledIndices are unique zero-based WORD indices. Keep at least the assessed part open.
- Runtime creates a tile for every unfilled token. A sentence such as I have a cat and a dog needs both occurrences of a. Never deduplicate required answer tokens.
- Distractors should be intentional and unique; do not add redundant copies of an answer as wrong options.
- QA: required multiplicity preserved, sentence is grammatical, support level explicit, no alternative valid ordering is rejected unexpectedly.

## speak_aloud - Speak Aloud

- Catalog fields: prompt, targetWords, targetPhrase, silenceTimeoutSeconds, allowFuzzyMatch, referenceClip, wordRevealDatabase.
- Default lesson form: a short complete sentence using taught vocabulary.
- Example: {"prompt":"אמרו את המשפט באנגלית בקול. המשמעות: יש לי חתול.","targetPhrase":"I have a cat.","targetWords":[],"allowFuzzyMatch":true}.
- In the inspected SpeakAloudDataSO, nonempty targetWords drives GetDisplayWords(); targetPhrase is the display fallback when targetWords is empty. Do not assume targetWords: [cat] displays I have a cat.
- Full-sentence display with only one-word scoring is an integration requirement until verified. Phrase mode above is the supported default. Use short phrases/rehearsal rather than claiming an unsupported reduced-scoring mode.
- Introduce listening and recognition before demanding speech, especially initial A. No requirement to include speech in every line.
- referenceClip needs a real asset. The inspected SO does not expose silenceTimeoutSeconds and documents global word reveal; their presence in the website catalog is not proof that changing those fields affects runtime.
- Fuzzy matching concerns recognition tolerance, not instructional mastery. It can blur intended contrasts; inspect behavior before claiming it assesses minimal phoneme differences.
- QA: visible English target agrees with Hebrew meaning, microphone/recognition path is known, alternative handling is deliberate and runtime prompt is visible. Do not claim human-level pronunciation assessment.

## dwarf_miner - Dwarf Miner

- Fields: prompt, categoryLabel, targetWords, distractorWords, requiredCorrect, allowedMistakes, background, wordRevealDatabase.
- Example: {"prompt":"אספו רק שמות של בעלי חיים.","categoryLabel":"בעלי חיים","targetWords":["cat","dog","cow"],"distractorWords":["hat","bag","cup"],"requiredCorrect":3,"allowedMistakes":3}.
- Use for taught vocabulary/category distinctions. Tie it to a Kingdom request, e.g. helping a farmer sort a list; the cave/hook presentation does not imply real quest loot.
- Define category membership precisely. Ambiguous isolated words such as cook or light can be more than one word class; use unambiguous material or another game with sentence context.
- Keep target and distractor sets disjoint, remove accidental duplicates, and include both positive and negative examples when discrimination is the objective.
- requiredCorrect must be achievable with the configured/placed targets. The SO documents runtime clamping; do not rely on that to repair a bad authored count.
- Keep allowedMistakes positive and appropriate to learning, not punitive. Motor mistakes do not necessarily indicate a vocabulary error.
- QA: each item has a defensible category decision, count is attainable, Hebrew category/instruction agree, optional background path exists.

## fruit_slice - Fruit Slice

- Fields: prompt, segmentation, targetText, preFilledIndices, distractors, extraLetterDistractorCount, background, wordRevealDatabase.
- Letters example: {"prompt":"חתכו את האותיות לפי הסדר כדי לכתוב חתול באנגלית.","segmentation":"Letters","targetText":"cat","preFilledIndices":[],"distractors":["b","n"],"extraLetterDistractorCount":0}.
- Words example: {"prompt":"הרכיבו את המשפט באנגלית: הכלב גדול.","segmentation":"Words","targetText":"The dog is big","preFilledIndices":[],"distractors":["small"]}.
- Letters mode practises one word; Words mode orders sentence segments. Do not pass sentence spaces to a letter exercise without checking segmentation behavior.
- preFilledIndices refer to segments in the selected mode, not always character positions. Keep the learning target open.
- Empty distractors in Letters mode can trigger random distractors via extraLetterDistractorCount; an empty list does not mean no distractors when that count is positive.
- Prefer this game for consolidating familiar content. Flying targets add motor/timing demand; first exposure to a difficult rule is better supported elsewhere.
- No invented speed, fruit-count or per-answer feedback fields. Use runtime options only when actually exposed.
- QA: segment sequence and indices match, distractors use the same unit, no alternative valid answer, and motor difficulty is not misreported as language proficiency.

## Evidence labels for all cards

Authoring examples are proposals. A validated bundle confirms data, not sound playback or runtime UI.
Creator records verified assets and missing dependencies; QA separately reports content, import and runtime readiness.
If a future catalog adds a game, add its card before using it in a brief. Never silently assume this audit covers new IDs.
