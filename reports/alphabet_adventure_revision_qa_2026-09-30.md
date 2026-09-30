# The Alphabet Adventure - revision QA

Date: 2026-09-30. Independent review of the six requested lesson corrections. This report supersedes the earlier QA report's exercise inventory for the revised content; it does not turn earlier runtime PENDING evidence into a gameplay PASS.

## Verdict

**Content and source-contract review: PASS. No unresolved content blocker or major finding.** Reviewed all seven quest sources, index, graph, all 29 minigame instances and 14 dialogues; relevant shared and three-role documentation changes; current Unity Miner, Slice and Ordering source. This was a read-only inspection. No tests, generation, browser use or Unity playthrough were performed by QA. QA wrote only this report.

Generated bundle/import, hosted revision and Unity gameplay remain **PENDING in this report** until the parent provides their separate evidence. The earlier existing audio/ASR evidence remains valid as file-content evidence only; pronunciation and runtime playback are not certified.

## Six requested corrections

| Request | Review result |
|---|---|
| Simple Hebrew sound explanation and אות ניקוד | PASS. Learner text has no IPA; requested term is used with an explanation distinguishing an English written letter from Hebrew niqqud marks. Sound examples explicitly reference English apple/acorn/bag/cat/dog and their Hebrew meanings. A's letter name and contextual sounds remain distinct. |
| Varied mechanics | PASS. 5 Drawing, 6 Miner, 7 Listen & Build, 5 Letter Ordering, 2 Word Matching and 4 Slice activities. Homework uses separate visual case sorting, combinations through ordering/slicing, and familiar word construction. |
| Collect A/a in Miner | PASS source representation. Both case-preserving strings are target entries; B/b are distractors. Goal counts any two correct catches, not guaranteed one of each form. First drawing explicitly practises both forms. |
| Repeated letter slicing | PASS source representation. aaa contains three separate a positions; dad contains two separate d occurrences. Current mode creates a unique tile GUID for every occurrence. Lowercase-only visual sequence is intentional. |
| Hebrew BA/CA/DA cues | PASS. Literal בא, קא, דא prompts build lowercase ba, ca, da. Openings label them practice combinations and approximate Hebrew reminders; the English vowel example remains the apple recording. No fabricated syllable audio or pronunciation-assessment claim. |
| One opening before games; short first drawing | PASS. Each source has one initial talk matching its giver, followed only by games; teaching and story are combined in its opening. Completion is quest-level turn-in. First drawing is exactly A/a, with no apple tracing. |

## Every exercise reviewed

Instance IDs below share `the_alphabet_adventure_`. All play steps use registered live_used Exam_Table_Fairy_Rose_Park; catalog ranges allow all selected difficulties 1/2. All prompt-bearing games have authored Hebrew params.prompt matching their instruction/display_text. Drawing and Matching use instruction without an invented params.prompt.

| Quest | Instance suffix | Review |
|---|---|---|
| A | q01_form | A and a, two guided case-preserving formation rounds. |
| A | q01_mine_a | Targets A/a, foils B/b, goal 2, allowed mistakes 3; letter-family recognition. |
| A | q01_listen_apple | Real apple path, lowercase a, AudioOnly, one b foil; contextual onset association. |
| A | q01_slice_a | aaa, three a occurrences, b foil, no prefilled letters/random extras; explicitly a sequence, not a word. |
| B | q02_form | B/b with A/a review; formation support acknowledged. |
| B | q02_mine_b | Targets B/b, foils A/a; all target forms taught, positive goal/mistake budget. |
| B | q02_listen_bag | Real bag path, b response and taught a foil; no unlearned G spelling demand. |
| B | q02_build_ba | Hebrew בא cue, b/a target, count 0 and empty custom pool are valid guided two-letter ordering; two possible orders remain. |
| B | q02_gap_bag | Initial index 0 only, b tile available, a foil; Hebrew meaning supplies context, ag remains scaffold. |
| C | q03_form | C/c with B/b review. |
| C | q03_mine_c | C/c targets, A/a/B/b foils; disjoint literal pools. |
| C | q03_listen_cat | Real cat path, c response and a/b foils; only onset association, existing acoustic ambiguity retained. |
| C | q03_build_ca | Hebrew קא cue, c/a target, b foil and count 1; combination explicitly taught. |
| C | q03_gap_cat | Initial index 0 only, c tile available and b foil; cat meaning disambiguates, unknown T scaffolded. |
| D | q04_form | D/d and b/d formation; correct English glyph direction explanation. |
| D | q04_mine_d | D/d targets, B/b foils; literal case preserved. |
| D | q04_build_da | Hebrew דא cue, d/a target, learned b/c foils and count 2. |
| D | q04_listen_dog | Real dog path, d response, a/b/c foils; unknown O/G not assembled. |
| D | q04_listen_dad | Real DAD clip, taught d/a/d target, b/c foils; both required d occurrences retained. |
| D | q04_slice_dad | Known dad, lowercase d/a/d, b/c foils, no prefilled letters; second d present. |
| Homework 1 | q05_mine_upper | Targets A/B/C/D, foils a/b/c/d, goal 4. Catches count instances, not four distinct letters. |
| Homework 1 | q05_mine_lower | Reverse literal case category, goal 4; prompt and category agree. |
| Homework 1 | q05_mixed_forms | b/d/B/D guided tracing after sorting. |
| Homework 2 | q06_build_ca | Familiar קא construction, b/d learned foils, count 2. |
| Homework 2 | q06_slice_ba | Familiar בא represented as lowercase b/a, c/d foils; valid ordering units. |
| Homework 2 | q06_listen_acorn | Real acorn path, a response and b/c/d foils; revisits other contextual A sound, not two-sound discrimination. |
| Homework 3 | q07_spell_dad | Hebrew אבא cue, full taught dad, b/c foils; repeated d retained. |
| Homework 3 | q07_listen_bad | Real bad path, full taught b/a/d, c foil. |
| Homework 3 | q07_slice_bad | Familiar bad, lowercase b/a/d, c foil, no prefilled target/random extras. |

All ordering/listening custom foil counts equal their intended supplied pool sizes. The deliberate zero count is only guided BA with an empty custom pool, not a one-letter listening exercise. No redundant answer letter is incorrectly tagged as a distractor. Both matching instances use valid zero-based initial indices and available distinct-ID answer tiles. All Slice entries use Letters, lowercase targets, empty preFilledIndices, explicit learned/visually disclosed foils and extraLetterDistractorCount 0.

## Contract and integration evidence

- MinerSession preserves original target/distractor strings and tags correctness by the originating pool, so upper/lowercase grouping is supported. OrbView renders the supplied string. Pools are shuffled and reused; success cannot prove every unique target appeared or was collected. The inspected MinerTuning asset has 12 orbs and 0.5 distractor ratio, producing six target definitions before placement; goals 2/4 fit this inspected tuning. Actual prefab binding/placement remains unplayed.
- OrderingSegmenter lowercases Letters mode. SliceOrderingMode creates one tile per unfilled segment with a distinct GUID, preserving aaa and both d letters. Scheduler/presenter comparisons ignore case, so Slice does not assess case discrimination. Miner is used for that purpose instead.
- LetterTilePool similarly lowercases ordering targets. BA/CA/DA are practice combinations, not invented English vocabulary or sound recordings. Hebrew reminders are approximate; successful tile order does not score spoken production.
- Seven exact existing quest keys are retained. Index/source/graph show A -> B -> C -> D -> homework 1 -> homework 2 -> homework 3. First level is 50, all later levels 1. Source first talk matches giver/start; there are no intermediate or duplicated closing talk objectives.
- Main giver/speaker/turn-in remains registered Old Man, introduced as Oren. Homework giver/speaker/turn-in is teacher_maya. All dialogue addresses the player. No invented adjacency, item pickup, window search, chest animation or NPC-to-NPC scene is required.
- Narrative closes the key/book story at D before homework. Q04/Q07 each state and grant 5 coins. Index and per-quest rewards remain 50/75/100/150/50/50/75 XP, totaling 550 XP and 10 coins.
- No learner text IPA/niqqud or new audio paths were found during reading. Existing audio references stay within the seven previously inspected assets. The cat clip's ASR Cut! and acorn's A corn result still do not establish phonetic correctness; corresponding tasks use contextual first-letter association.

## Corrections resolved in this review

1. Early BA was simplified to two known tiles with no unknown D distractor. This is legitimate supported order practice and differs from an ineffective lone-answer listening choice.
2. Literal Hebrew combination cues are present as requested, with an explicit approximation caveat in openings.
3. Translated-word onset references were corrected to the actual English word/recording, preventing Hebrew חתול/כלב/תיק sounds from being mistaken for English cat/dog/bag onsets.
4. A completion now says תרגלת את שתי הצורות rather than claiming independent recognition of both forms from an unrestricted Miner catch counter.

## Shared documentation

Reviewed changes to MINIGAME_TEACHING_GUIDE, QUESTLINE_CONTENT_RULES and all three agent role files: child-facing no-IPA/requested vowel terminology, short first A drawing, varied purposeful mechanics, Miner case preservation and catch-count limitation, Slice repeated-letter/lowercase limitation, and supported Hebrew combination cues agree with source contracts. Internal technical phonetic notes remain distinct from learner copy.

The agents/README update prefers backing up and updating the same hosted line in place using the supported identity-preserving importer. This agrees with the reviewed quest-key/step UUID preservation fixes; parent remains responsible for comparing the shorter imported step graph against the saved hosted draft and confirming obsolete rows are removed. No browser/import/save operation was performed by QA for this revision.

Runtime prompt rendering, Mine case fonts/catch availability, three successive Slice a tiles, repeated dad letters, replay and actual phonetics remain PENDING until separately observed. Parent should provide fresh generated-bundle and hosted semantic readback evidence for this revised inventory; earlier hosted success is not proof of the new revision.
