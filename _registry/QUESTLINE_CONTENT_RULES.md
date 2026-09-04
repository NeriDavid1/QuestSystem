# Questline Content and Minigame Rules

These rules are mandatory for every questline and minigame instance in this repository. They apply to new content and to edits of existing content, not only to noun lessons.

## Pedagogical validity

- Every learning task must require the learner to apply the intended objective. Success must not be possible through guessing, translation matching alone, eliminating obviously wrong answers, or following superficial visual cues.
- Distractors must be plausible and pedagogically meaningful. Keep cognitive load appropriate to the learner's level and increase difficulty progressively from recognition to discrimination, application, combination, and transfer.
- Context should support comprehension without revealing the answer. Feedback should briefly reinforce why an answer is correct or guide the learner toward the relevant rule after an error.
- Before approving any task, ask: **Can the learner answer correctly without understanding the target skill?** If yes, redesign the task.

## Language accessibility

- All translations, instructions, hints, and native-language dialogue must use clear, natural, age-appropriate everyday language. The native language is scaffolding for learning, never an additional comprehension task.
- Avoid unnecessarily formal, literary, academic, bureaucratic, or uncommon wording. Prefer short, direct sentences and familiar words.
- Translate meaning naturally rather than mirroring English structure word-for-word. Translation complexity must not exceed what is needed to understand the task.
- Before approving text, ask: **Would a learner of the target age understand this immediately without needing the wording itself explained?** If not, simplify it while preserving the meaning.
- “Hebrew-first” means that learner-facing instructions, explanations, hints, and support are primarily in clear Hebrew; English is retained only for the target language material the learner must recognize, read, write, order, or say. Do not use “Hebrew-first” as a vague learner-facing label; describe the concrete support instead.

## Word Matching

- Every `word_matching` instance must define `params.letters` as the available letter tiles. Each tile has a stable `id` and its single-letter `value`.
- Every `word_matching` instance must also define `params.wordTasks`. Each task has an `id`, the complete `fullWord`, and `missingIndices` containing one or more zero-based indices of the missing letters.
- Every character at every `missingIndices` position must exist in `params.letters[].value`. If a word has two missing letters, both letters must be available in the letter pool.
- The letter pool must be compact: include the letters required by the missing positions and only a small, intentional set of distractors. Do not add a large list of unrelated letters or letters that are already visible as a redundant “paired” answer.
- Matching correctness is based on the letter `value`, not on the tile or task `id`. A tile with any ID may complete any gap when its value is the required missing character; IDs must never be used as positional links between a letter and a word.
- The order of `params.letters` must be independently shuffled from the order of `params.wordTasks`, using a reproducible pseudo-random seed. Never place a letter opposite its word or rely on matching row positions.
- Every letter tile must have a unique stable `id`; IDs are technical identity only and do not represent the correct answer. Duplicate IDs are invalid because the UI may hide or collapse tiles with the same ID. Distinct IDs may be used for distinct tiles, including same-value tiles only when the task genuinely requires multiple occurrences.
- Missing positions must be selected by a deterministic pseudo-random rule derived from the task/instance key, not by always using index 0. Across a questline, distribute valid gaps between the beginning, middle, and end whenever the word allows it.
- For a task with two or more missing letters, every missing character must be present in the letter pool; validate the complete set, not only the first missing index.
- Regenerate the visible fragment from `fullWord` and `missingIndices`; never hand-edit a fragment independently of its indices.
- The player-facing `instruction`, quest `display_text`, and task copy must not reveal the completed answer. Use Hebrew guidance such as `השלימו את האות החסרה במילה` (or a subject-specific equivalent such as `במילת ה־noun`).

## Letter Ordering and Word Ordering

- Letter Ordering must never reveal the English answer in the instruction. Give the Hebrew meaning and explicitly require the English answer, for example `כתבו את המילה ספר באנגלית.`
- All player-facing minigame instructions must avoid revealing the answer. Use Hebrew task guidance; show English answers only as runtime tiles, targets, or other elements that the learner must actively solve or say.
- Word Ordering must not write the completed sentence or the answer noun in the player-facing instruction. Give a Hebrew prompt such as `השלימו את המשפט לפי התרגום בעברית` and show the Hebrew translation.
- Word Ordering does not always require rebuilding every word: use `params.preFilledIndices` to lock correct words and leave a meaningful target word, often a noun, for the learner to choose or place.
- When a Word Ordering task leaves a word open, provide `params.distractorWords` with a small choice set (for example, three words) and keep the English word array as runtime data.
- Every Word Ordering choice list must contain unique words: never show the same option more than once. The combined runtime choices must include the exact correct word needed for the open position exactly once; `distractorWords` must contain only unique, intentional wrong options and must not repeat the correct open word.
- Word Ordering tasks must include a Hebrew translation in `params.translation`.
- When a Word Ordering task leaves only one word open while the other words are pre-filled, provide the complete natural Hebrew translation of the full sentence and explicitly tell the learner to infer and choose the missing word from that sentence translation. The translation should support understanding of the whole sentence, not only define the missing word; do not reveal the English answer in the prompt.

## Language and answer disclosure

- Learner-facing instructions and task descriptions should be primarily Hebrew, with only the necessary English learning material.
- Never give the English answer in an instruction when the learner is expected to spell, choose, match, or order it. Give the Hebrew meaning and the required action instead.
- Speak Aloud is the intentional exception: English target words may be shown because the learner must say them in English. If the game UI already displays the targets, do not duplicate them in the instruction.
- When assembling a sentence, always provide the Hebrew translation. The learner may complete only the missing target word(s); do not force a full rewrite when partial completion better serves the objective.

## Preview and runtime display contract

- For every minigame whose schema contains a `prompt` field, `params.prompt` must be present and non-empty in the authored instance. Do not leave it blank, null, or dependent on an answer-data fallback.
- Every preview must render the authored learner-facing `params.prompt` (or the authored minigame instruction when the prompt field is intentionally absent) for Letter Ordering, Word Ordering, Speak Aloud, Word Matching, and every other minigame. The editor and public viewer must not invent, append, or infer explanatory text from answer data.
- The actual in-game minigame screen must render the same authored learner-facing explanation before the interaction controls. It is not sufficient for the prompt to appear only in Quest Creator, Editor Preview, or the public quest viewer.
- For `speak_aloud`, the game screen must show an explicit Hebrew instruction explaining what the learner must say, such as `אמרו את המילה הבאה באנגלית בקול` or `אמרו את המשפט הבא באנגלית בקול`, together with the English target that the learner must pronounce. Showing only the target word/phrase (for example, `book`) is a runtime content defect.
- For `speak_aloud`, the authored prompt must also provide the Hebrew meaning of the target: for Level 1, translate the target word; for Level 2 or Level 3, translate the complete target phrase or sentence naturally. The prompt must explain the action and meaning without replacing the English target or revealing an answer that the learner is meant to construct.
- QA must verify this in the running game or an authoritative runtime screen, not only by reading YAML or inspecting the editor preview. If the prompt is missing in the game, mark the result as FAIL and return it for runtime/integration correction.
- Do not use `translation`, `englishWordsInOrder`, `targetWord`, `targetPhrase`, `tasks`, or similar answer fields as a fallback instruction or as an extra learner-facing line. These fields remain runtime data and validation data.
- If a translation or explanation is needed in the preview, write it explicitly inside the authored prompt. For Word Ordering, `params.translation` may remain available to the runtime, but it must not appear as a separate preview line unless the author included it in `params.prompt`.
- Keep the editor preview, public viewer, and runtime aligned: no surface may silently add text that is not present in the authored prompt/instruction. A missing prompt must remain visibly missing or use a neutral placeholder, never reveal the answer.
- For Letter Ordering and Word Ordering, put the learner's required meaning/action and any needed Hebrew translation in the authored prompt. For Speak Aloud, keep an explicit speaking instruction; if the target words are already displayed by the game, do not repeat them in the prompt.

## Questline and quest structure

- A questline should contain a clear progression of connected quests, with a coherent story, NPC task, active mini-games, optional return to an NPC, and a final turn-in dialogue that thanks the learner and points to the next NPC or quest.
- A completed quest must end at its actual completion point. If it is the final quest, the turn-in NPC must not send the learner to another NPC to collect a reward or continue the finished quest. Give the reward immediately and close with thanks, praise, or a clear completion message. A direction to another NPC is allowed only for an intermediate quest with a real next quest.
- Do not use `reach_location` unless the user explicitly requests it. The future monster-combat flow may use it to send the learner to a monster location, complete combat and drop objectives, and return to an NPC, but that implementation does not exist yet and must not be assumed.
- Use several varied mini-games per quest when appropriate, keeping every mini-game tied to the lesson objective. Do not repeat identical tasks or mix unrelated vocabulary into a lesson.
- Place minigame stations according to the questline context and known world geography. Keep stations near one another when possible, and reuse one station for two or three consecutive minigames when that is natural, so the learner does not need to cross the map for every task. Use a different station only when the story or location meaningfully requires it.
- Dialogue flow must not insert an unnecessary `talk_to_npc` step between the opening dialogue and the first active task; return to an NPC only when the story or handoff requires it.
- If a quest already has an opening NPC dialogue, do not add an immediate `talk_to_npc` step that repeats the same dialogue. The opening dialogue is the conversation for that encounter; a separate `talk_to_npc` step is allowed only for a distinct, necessary later conversation with different content.
- Keep dialogue blocks short and easy to read: use clear, separated sentences rather than one long text block. Whenever an English sentence appears, provide its complete Hebrew translation in the same dialogue block. Put the next idea in a separate dialogue block.
- A final quest dialogue must be a clear, short closure: summarize the success, give the reward immediately, and congratulate the learner. Do not hide the completion message inside a long mixed-language paragraph.
- Use exact registry IDs for NPCs, world objects, minigame instances, items, and dialogues so the Unity importer can resolve every step.

## Speak Aloud

- Speak Aloud content format must follow the user's explicit brief. Do not introduce a word list, phrase, or sentence merely because the minigame supports it.
- Use this three-level progression when the brief approves more than one word:
  - Level 1 — one English word.
  - Level 2 — several words or one short sentence, chosen according to the lesson topic. Keep the sentence short and easy to say.
  - Level 3 — more words or a more difficult sentence, still appropriate to the learner and the topic.
- If the user describes the questline as difficult, that permits proposing Level 2 or Level 3, but the selected format and target length must still be stated in the approved pedagogical plan. Difficulty alone does not justify an unnecessarily long sentence.
- Each Speak Aloud instance may test one word or a short list of words, but never an unintended sentence.
- Every Speak Aloud instance must have an explicit player-facing instruction containing the action to speak aloud, such as `אמרו את המילה הבאה באנגלית בקול`, `אמרו את המילים הבאות באנגלית בקול`, or `אמרו את המשפט הבא באנגלית בקול`.
- Every Speak Aloud prompt must include both the required speaking action and the Hebrew translation/meaning of the exact recognition unit. A generic prompt such as `אמרו את המילה הבאה באנגלית בקול` without the word's meaning is incomplete.
- The instruction, displayed target, and speech-recognition target must describe the same unit: one word, a short list of words, or one complete sentence. Never display a long sentence while validating only one word from it.
- Use the singular wording for one target and plural wording for a list. Use sentence wording only when `targetPhrase` is the actual value being checked.
- English target words may be shown because the learner must pronounce them. If the game UI already displays the target below, do not duplicate the target words in the instruction; keep the explicit speaking action.

## Local-to-site import

The local-to-site import sequence is defined only in `agents/README.md`. Follow that procedure for every subject and questline; do not duplicate or modify it here. This file remains the single source for content and minigame rules.
