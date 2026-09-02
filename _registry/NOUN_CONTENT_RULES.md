# Quest minigame content rules

These rules are mandatory for every questline and minigame instance in this repository. They apply to new content and to edits of existing content, not only to noun lessons.

## Word Matching

- Every `word_matching` instance must define `params.letters` as the available letter tiles. Each tile has a stable `id` and its single-letter `value`.
- Every `word_matching` instance must also define `params.wordTasks`. Each task has an `id`, the complete `fullWord`, and `missingIndices` containing the zero-based index or indices of the missing letters.
- The player-facing `instruction`, quest `display_text`, and task copy must not reveal the completed answer. Use Hebrew guidance such as `השלימו את האות החסרה במילה` (or a subject-specific equivalent such as `במילת ה־noun`).

## Letter Ordering and Word Ordering

- Do not write the target word or the completed sentence in player-facing instructions.
- Use a Hebrew prompt that asks whether the learner remembers or knows the answer, for example `זוכרים איך כותבים את המילה?`.
- Word Ordering tasks must include a Hebrew translation in `params.translation`, while the English word array remains runtime data.

## Speak Aloud

- Each Speak Aloud instance may test one word or a short list of words, but never an unintended sentence.
- The player-facing instruction should be `אמרו את המילים הבאות בקול` or equivalent Hebrew wording. The instruction must not repeat the words when the game UI already displays them below; the target list remains runtime data.
