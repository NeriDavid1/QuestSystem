# The Alphabet Adventure - independent QA

Date: 2026-09-30. Role: Quest QA and Learning Review. Sources: Designer brief, attached Hebrew story reference, all seven authored quest YAML files, index/graph, dialogue and minigame registries, current Unity LetterTilePool/LetterOrderingDataSO/WordSlotState/importer source and the parent's audio transcription report. QA did not edit quest sources.

## Verdict

| Area | Status | Evidence |
|---|---|---|
| Learning, story and language | PASS | All 29 exercises reviewed in order; teaching precedes practice; full independent spelling limited to taught dad/bad; Hebrew without niqqud; all character speech addresses the player. |
| Source contracts and references | PASS | Inline Python checks covered 7 quests, 29 distinct referenced instances, 24 dialogues, all gap indices/tile occurrences, exact IDs, supported fields/ranges, levels/prerequisites, matching index/file rewards and seven existing audio paths. |
| Acoustic verification | PENDING | Existing clips and durations established. Cached Whisper recognizes Apple/Bag/Dog/Bad/Dad; acorn is A corn and cat is Cut!. ASR does not certify vowel/phoneme accuracy. No replacement with an unverified sound effect. |
| Generated bundle / editor import | PENDING | Parent owns importer/build/browser evidence. Static source validation is complete; this report does not claim that a browser import or Unity import passed. |
| Unity gameplay | PENDING | No live replay, audio button, tracing round, matching UI, letter-to-sound production or motor accessibility playthrough. |
| Hosted replacement / publication | PENDING | Parent owns exact target backup, deployment/import and hosted readback. Draft and public publish are distinct evidence states. |

No unresolved source-content blockers or major findings remain. Runtime limitations are explicitly retained below.

## Exercise review

All instance IDs below share prefix `the_alphabet_adventure_`. All used stations resolve to registered live_used `Exam_Table_Fairy_Rose_Park`. Difficulty 1/2 stays inside the actual catalog ranges.

| Instance suffix | Intended evidence / review result |
|---|---|
| q01_form | A/a formation, two case-preserving drawing rounds; model support acknowledged. |
| q01_listen_apple | Whole-word onset association to a; actual apple clip, one b foil; no claim of isolated phoneme assessment. |
| q01_listen_acorn | Second contextual A sound; same response a demonstrates spelling association, not sound discrimination. |
| q01_word_model | Whole apple tracing, one complete word round; untaught letters displayed as model rather than independent decoding. |
| q02_form | B/b formation with A/a cumulative review. |
| q02_listen_bag | Bag onset to b, taught a foil; no full bag assembly. |
| q02_review_apple | Prior A revisited after B; sound/name distinctions taught. |
| q02_gap_bag | Initial b gap, remaining ag scaffolded; Hebrew meaning disambiguates; b tile available. |
| q02_word_model | Whole bag tracing; explicit supported model. |
| q03_form | C/c formation and B/b review. |
| q03_listen_cat | Contextual /k/ onset to c; a/b foils; acoustic whole-word uncertainty retained. |
| q03_gap_cat | Initial c gap; Hebrew cat meaning makes b incorrect; a/t nontarget scaffold. |
| q03_review_bag | Previously taught B contextual completion; same valid first-letter representation. |
| q03_word_model | Whole cat tracing; no independent T decoding claim. |
| q04_form | D/d and b/d formation; correct English glyph directions explained. |
| q04_listen_dog | Dog onset to d; all foils previously taught; no unknown O/G spelling assessed. |
| q04_word_models | dad/bad tracing follows complete sound/meaning teaching; two whole-word rounds. |
| q04_gap_dad | Initial d vs b; Hebrew אבא determines intended word. |
| q04_listen_bad | Full taught b/a/d assembled from real word clip; c foil is learned. |
| q04_listen_dad | Full taught d/a/d; repeated d tiles remain distinct; b/c foils. |
| q05_mixed_forms | Mixed case/shape review includes b/d; formation evidence remains modelled. |
| q05_listen_bag | Cumulative four-letter onset selection; pool contains a/c/d plus target b. |
| q05_listen_dog | Corresponding d onset retrieval with a/b/c foils. |
| q06_listen_cat | Reordered cumulative clue retrieval; three learned foils; recorded onset contextual. |
| q06_listen_acorn | A contextual association in larger learned pool; no claimed new sound discrimination. |
| q06_listen_apple | Same learned A association, different recorded example; no English answer in prompt. |
| q07_spell_dad | Hebrew meaning prompts complete taught spelling; repeated d occurrences preserved. |
| q07_listen_bad | Previously taught word retrieved by audio, without written answer prompt. |
| q07_slice_bad | Familiar bad consolidation, Letters segmentation, no prefilled target, c foil; motor demand acknowledged. |

Coverage: 9 Letter Drawing, 14 Listen & Build, 4 Word Matching, 1 Letter Ordering, 1 Fruit Slice. Sentence grammar and microphone tasks are not pedagogically necessary for this initial four-letter unit.

## Resolved findings

1. **Blocker, Designer payloads:** extraDistractorCount 0 suppressed customDistractors in actual LetterTilePool, leaving only correct tiles and bypassing listening. Designer and Creator corrected every ordering/listening count to the supplied pool length. QA checked every authored instance; all counts are positive and equal to the actual foil pool. Fruit Slice's separate extraLetterDistractorCount 0 correctly remains unchanged.
2. **Major, q01/q02/q03 directions:** copy positioned Maya beside the park table without verified geography; registry places teacher_maya in Alphabet Plaza and the table in FairyRosePark. Creator split teacher learning and park exercise directions; current dialogue no longer invents adjacency.
3. **Minor, character identity:** registered Old Man speaker was called Oren only later in homework. Opening now introduces אני אורן, retaining the exact registered NPC ID while establishing the learner-facing story name.

All seven prerequisites form one reachable sequence; main story closes in q04 before three homework quests. Levels are 50 then 1 consistently. First talk matches the quest giver for importer start-dialogue promotion; completion is quest-level turn-in, with no duplicate return/talk step. Main giver/turn-in is Old Man; homework giver/turn-in is teacher_maya. Q04 and q07 each state and grant 5 coins; total structured rewards are 550 XP and 10 coins.

The window, key, chest and book are narrated discoveries. No search, pickup, inventory key, chest animation or unreachable unregistered objective is promised. Daughter's dad cushion inscription gives the final clue a specific causal role in recalling the window.

## Runtime boundaries

- LetterTilePool lowercases target slots and tiles. Listening uses lowercase only and does not claim uppercase identification. Drawing preserves case. Word Matching comparisons are case-insensitive; b versus d remains valid, b versus B would not assess case.
- All Listen & Build tasks have AudioOnly and a real resolvable audio path. Current ShowTextPrompt would show authored text when audio is absent; this fallback is not relied upon. Button replay and actual clip loading still need Unity verification.
- One-letter tasks hear a whole word and choose its initial letter. They assess contextual sound-to-letter association; whole bag/cat/dog decoding is not demanded. The parent's recognizer-only audio report preserves acorn/cat ambiguity rather than inventing auditory certainty.
- Textual teacher sound models and whole-word examples introduce letter-to-sound relationships and blending. This unit does not independently score letter-to-sound production or pronunciation.
- Matching provides one contextual word task per instance; every gap is a valid zero-based initial character index and required tile occurrence exists. No guessed illustration path or row-position pairing shortcut is used.
- Guided tracing of untaught word letters is explicitly model exposure, not autonomous reading. Fruit Slice is familiar-content consolidation; success can reflect motor control as well as spelling.
- No invented automatic per-error teaching, sound-choice UI, chest interactions or future technology is added.

Parent should append actual importer/build/editor/publication evidence when those steps finish. Unity gameplay and phonetic audition remain PENDING until performed.

## Parent preflight evidence

- Latest YAML importer after the corrected directions and Oren introduction: 0 errors, 0 warnings. Generated document contains 7 quests.
- Existing records compared with HEAD by key: no unrelated dialogue, minigame instance, questline or revision document changed.
- build_all.py and the subsequent refreshed build_presentation.py completed.
- Editor scoped replacement-key regression tests: 2 passed; TypeScript check and production build passed.
- Hosted baseline exported to the_alphabet_adventure-questline.zip before replacement and preserved in a separate temporary backup directory.
- Editor import/save and Unity playback remain pending at this preflight stage.
