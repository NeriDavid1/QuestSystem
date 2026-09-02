# Quest minigame content rules

These rules are mandatory for every questline and minigame instance in this repository. They apply to new content and to edits of existing content, not only to noun lessons.

## Word Matching

- Every `word_matching` instance must define `params.letters` as the available letter tiles. Each tile has a stable `id` and its single-letter `value`.
- Every `word_matching` instance must also define `params.wordTasks`. Each task has an `id`, the complete `fullWord`, and `missingIndices` containing one or more zero-based indices of the missing letters.
- Do not always remove the first letter. Vary the missing position when it serves the exercise: the beginning, middle, end, or two positions may be used, while every index must be valid for `fullWord`.
- The player-facing `instruction`, quest `display_text`, and task copy must not reveal the completed answer. Use Hebrew guidance such as `השלימו את האות החסרה במילה` (or a subject-specific equivalent such as `במילת ה־noun`).

## Letter Ordering and Word Ordering

- Letter Ordering must tell the learner which word to write. Use a Hebrew command followed by the English target, for example `כתבו את המילה BOOK`.
- Word Ordering must not write the completed sentence in the player-facing instruction. Give a Hebrew prompt such as `בנו משפט לפי התרגום בעברית` and show the Hebrew translation.
- Word Ordering tasks must include a Hebrew translation in `params.translation`, while the English word array remains runtime data.

## Speak Aloud

- Each Speak Aloud instance may test one word or a short list of words, but never an unintended sentence.
- The player-facing instruction should be `אמרו את המילים הבאות בקול` or equivalent Hebrew wording. The instruction must not repeat the words when the game UI already displays them below; the target list remains runtime data.
