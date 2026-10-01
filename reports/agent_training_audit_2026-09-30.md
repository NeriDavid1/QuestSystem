# Agent instruction audit - 2026-09-30

## Scope and evidence

Reviewed the three agent roles, workflow, shared content rules, Cursor authoring entry point and all eight published mini-game catalog entries. Live source: https://neridavid1.github.io/QuestSystem/catalog-data.json.
Compared with _registry/minigames.yaml, editor/src/lib/minigameParams.ts and the drawing/ordering catalog adapters.
Read relevant Unity data/mode classes under Assets/_OurAssets/Scripts/GamePlay/MiniGames and the Letter Tracing importer in the existing English Kingdom checkout.
This is a documentation/source audit, not a live Unity playthrough.

## Coverage

| Site choice | Instruction coverage |
|---|---|
| Letter Drawing | Manual mixed letter/word list, round boundaries, case, formation evidence, legacy compatibility |
| Letter Ordering | Spelling cues, repeated letters, meaningful distractors, answer leakage |
| Listen & Build | Exact ID, actual audio dependency, clue modes, sound/name/word distinction |
| Word Matching | Character and whole-word gaps, tile occurrences, lesson-driven positions, no positional shortcuts |
| Word Ordering | Sentence/translation, support fading, repeated required tokens, distractor ambiguity |
| Speak Aloud | Display vs recognition behavior, phrase default, asset/field limitations, no phonetic-score claims |
| Dwarf Miner | Semantic membership, ambiguous words, reachable count, motor vs language errors |
| Fruit Slice | Letters/Words segmentation, segment indices, random distractor fallback, motor readiness |

## Corrected instruction problems

- Removed the obsolete four-questline allowlist and five-game count in Cursor rules.
- Replaced duplicate role-level policies with links to one shared policy and a game teaching guide.
- Replaced forced NPC rotation/two-game repetition limit with purposeful repetition and story continuity.
- Replaced impossible no-guessing claims with observable assessment evidence and reduced visual shortcuts.
- Allowed meaningful recognition/translation practice; distinguished it from production assessment.
- Made target-specific missing positions take precedence over random gap placement.
- Removed universal minimum of three sentence distractors and rigid scaffolding restrictions; documented independent review after guided practice.
- Preserved repeated required words: WordOrderingMode builds one tile per unfilled token.
- Replaced old drawing either/or guidance with the current manual ordered list.
- Separated Kingdom-compatible fantasy from arbitrary absurdity/futuristic props.
- Added default Hebrew without niqqud, professional phonics distinctions and known-letter prerequisites.
- Removed redundant approval requests for already authorized work; kept technical limitations and publication scope explicit.
- Added separate content/import/runtime/publication verdicts and targeted correction loops.

## Runtime discrepancies that remain outside this documentation task

- SpeakAloudDataSO.GetDisplayWords uses nonempty targetWords for display; targetPhrase is fallback. The old whole-sentence-display plus one-word-scoring rule is not established by that source. Cards now use targetWords: [] with a taught targetPhrase by default.
- The inspected SpeakAloudDataSO does not expose silenceTimeoutSeconds and documents global word reveal, though these are catalog fields. Do not promise these settings work without tracing the current importer/runtime.
- Catalog labels such as opposite_pairing do not prove a general free-form pair-matching UI. Use the verified gap representation or inspect an actual alternative implementation.
- A blank Listen & Build audio field is permitted by the editor, but cannot establish a completed listening lesson.
- Runtime verification remains pending for exercises authored from these new instructions; no actual questline was created or changed.

## Deliverables

Updated Designer, Creator, QA, workflow, shared rules, Cursor entry point and root README.
Added MINIGAME_TEACHING_GUIDE.md and BRIEF_TEMPLATE.md.
Checked live/local catalog coverage, sample JSON fields, Markdown links and whitespace before handoff.
