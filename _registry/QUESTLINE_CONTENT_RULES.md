# Questline Content Rules

Authoritative shared authoring policy. Role files describe responsibilities; the [minigame teaching guide](MINIGAME_TEACHING_GUIDE.md) describes all game-specific contracts and examples. Explicit user instructions take precedence over project preferences. They do not make an unsupported runtime feature exist: explain such a limitation and provide a supported alternative.

## Evidence and scope

- Use current registries, editor fields, importer and runtime source. When these disagree, record the discrepancy and use the supported path; never invent behavior from a catalog label.
- Distinguish proposal, authored source, valid import, runtime verification, hosted draft and published revision.
- Continue authorized work without repeated approvals. A story-only request does not authorize quest creation. Publication/deletion must be within the user's requested destination and target.
- Read relevant neighboring quests for prerequisites and continuity; do not broadly rewrite unrelated lines.
- New games/characters/locations require actual integration before their IDs can be used. Authorized narrative proposals and off-screen characters are allowed and labeled.

## Learning design

- Define an observable target and prerequisites for every stage. Teach -> model -> supported practice -> independent practice -> review/transfer is a useful sequence, adjusted to readiness.
- Introduce one new distinction at a time. Revisit older learning across later tasks.
- Separate motor formation, visual recognition, listening, decoding, spelling, vocabulary, syntax and speaking. Success in one does not prove mastery of another.
- Recognition and translation matching are valid when recognition/meaning is the objective. They do not by themselves assess independent spelling or grammar production.
- Chance success is possible in choice games. Reduce superficial shortcuts and use several contrasting examples or a later independent task; do not promise guessing is impossible.
- Distractors reflect plausible learner confusions and must not be equally correct. Increase language, memory and motor load deliberately, not simultaneously by accident.
- Guided practice may show a model and use fewer/no distractors. Mark that support and reduce it in later assessment.
- No fixed quest count, compulsory game coverage, NPC rotation or ban on a third consecutive game. Explain purposeful repetition; vary activity when it improves the lesson.
- Provide a short corrective explanation for likely errors. Use supported feedback fields or actual teacher/completion dialogue; proposed feedback is not an implemented per-answer feature.

## Kingdom stories and dialogue

- Ground stories in Kingdom geography, occupations and established fantasy. No futuristic vehicles/devices unless explicitly requested.
- Give the NPC a concrete motive, a problem, a meaningful development and closure. Let discoveries and character choices create humor.
- Fantasy is permitted when coherent with the world. Do not ban ghosts or magic merely because they are impossible in reality.
- Match promised actions to implemented steps. A narrated discovery does not imply a new searchable object, animation or inventory action.
- Keep stations close where sensible and reuse a station for consecutive learning tasks. Do not invent geographic adjacency from names alone.
- Dialogue is short and natural, one idea per block. Avoid forced jokes, humiliation and exposition.
- Teach a new concept briefly before first practice. Teaching examples may show English; assessment prompts must not supply answers to be reconstructed.
- NPCs motivate and give natural direction. Game UI explains exact controls and task actions.
- Learner-facing NPC names are short and natural, optionally Hebrew plus English. Exact technical IDs belong only in schema fields.
- One opening and one closing conversation per actual encounter; no immediate duplicate talk step. Intermediate dialogue needs new teaching, story information or a handoff.

## Language and visible answers

- Learner-facing explanations/instructions are simple Hebrew without niqqud by default. Keep English for target learning material. User requests can change these preferences.
- Translate meaning naturally; provide complete Hebrew meaning of an English sentence used in dialogue or a sentence-building/speaking instruction.
- Dialogue text contains no quotation marks or em dash; use a short hyphen if needed. This restriction does not prohibit YAML/JSON serialization quotes.
- Spelling, matching and ordering assessment prompts describe meaning/action without displaying the finished English answer.
- Tracing necessarily displays its model; speaking displays the sentence to pronounce; listening supplies the target through sound. These are legitimate modality-specific supports.
- For every schema supporting prompt, author a nonempty params.prompt. Otherwise use the supported instruction field. Never fabricate params.prompt where it is ignored.
- Do not rely on targetWord, translation, targetPhrase or similar answer data to generate a missing instruction. A Word Ordering prompt explicitly includes the Hebrew sentence, even when translation is also stored.
- Verify what is actually rendered. If unavailable, mark runtime PENDING. A known missing instruction is an integration defect; a preview alone cannot establish a runtime PASS.

## Phonics

- Distinguish letter shape, name and represented sounds. A/a is one letter in two cases.
- Use אותיות תנועה for vowel letters; English vowel letters are not Hebrew niqqud marks.
- A, E, I, O, U are the main vowel letters; sound depends on word/spelling context. Do not claim each letter has exactly one sound.
- For initial A, use drawing and Listen & Build, not compulsory Speak Aloud. Introduce /æ/ and /eɪ/ through clear recorded examples such as apple and acorn, with meanings; do not demand spelling all their untaught letters.
- Hebrew transliteration cannot fully represent /æ/. Use recorded English, not a misleading Hebrew approximation. Short/long vowel labels do not mean merely speaking longer.
- Teach consonant sounds without adding a vowel: /b/, not the letter name /biː/ during blending.
- C as /k/ in cat is a contextual example, not a universal rule. Introduce additional sounds later.
- Blend in order, then say/listen to the whole word. Teach T before independent cat and G before independent bag, or explicitly scaffold those letters.
- Do not infer sound mastery from tracing or use a speech recognizer as a clinical/phonetic scoring tool.

## Quest integration

- Exact IDs come from systems/npcs/areas/interactables/items/minigames registries. Prefer live_used over catalog_stub.
- Quest keys are globally unique and line-scoped; dialogue/instance keys are also unique.
- Preserve the project integration convention: first quest by order level 50, all later quests level 1, consistently in index and quest files. These values do not describe cognitive difficulty.
- Mini-game difficulty uses its catalog range. Explain the actual support/content progression separately.
- Use quest-level start/turn-in dialogue. Set turn_in_dialogue_id and wait_for_npc_turn_in: true; do not append return_to_npc or a talk step that duplicates completion.
- Final completion thanks the learner and gives the stated reward at the real completion point. A next-NPC handoff is meaningful only when a real next quest follows; do not send a finished quest elsewhere just for its reward.
- A delivery item is granted to the player first; deliver_item names the recipient waiting for it. Item/reward values in prose and data agree.
- Do not add reach_location unless requested. Do not assume monster combat/drop objectives exist.
- Keep prerequisite chains, summaries, rewards and graph consistent. No unreachable endings or unexplained rewards.

## Game policy

Use [MINIGAME_TEACHING_GUIDE.md](MINIGAME_TEACHING_GUIDE.md) for the eight supported IDs, fields, examples and failure checks. Technical requirements are mandatory; teaching defaults may be adapted to the documented objective.

For Word Ordering, default to full assembly for short sentences. A documented guided stage may prefill nontarget scaffolding, but must leave the target open and lead to independent practice. Do not impose an arbitrary three-distractor minimum. Preserve every required occurrence of repeated words; only redundant distractors are removed.

For Word Matching, choose gap positions from the lesson objective first. Initial-sound lessons may deliberately use initial gaps. Vary positions in later review where valid; randomization must not move the target to an irrelevant position. Shuffle pools independently without enforcing a positional pattern that reveals answers.

For Speak Aloud, default to a complete short taught sentence with targetWords: [] and targetPhrase set. Nonempty targetWords affect the displayed text in the inspected runtime. Never assume a whole displayed sentence plus one-word scoring without verifying that capability. There is no compulsory speech task in every questline.

## Delivery workflow

[agents/README.md](../agents/README.md) owns the local-to-site procedure. Use its sequence only for the authorized target/destination. The QA report separates content, import, runtime and publication evidence.
