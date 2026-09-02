# Quest minigame content rules

These rules are mandatory for every questline and minigame instance in this repository. They apply to new content and to edits of existing content, not only to noun lessons.

## Word Matching

- Every `word_matching` instance must define `params.letters` as the available letter tiles. Each tile has a stable `id` and its single-letter `value`.
- Every `word_matching` instance must also define `params.wordTasks`. Each task has an `id`, the complete `fullWord`, and `missingIndices` containing one or more zero-based indices of the missing letters.
- Every character at every `missingIndices` position must exist in `params.letters[].value`. If a word has two missing letters, both letters must be available in the letter pool.
- Do not always remove the first letter. Vary the missing position when it serves the exercise: the beginning, middle, end, or two positions may be used, while every index must be valid for `fullWord`.
- The player-facing `instruction`, quest `display_text`, and task copy must not reveal the completed answer. Use Hebrew guidance such as `השלימו את האות החסרה במילה` (or a subject-specific equivalent such as `במילת ה־noun`).

## Letter Ordering and Word Ordering

- Letter Ordering must never reveal the English answer in the instruction. Give the Hebrew meaning and explicitly require the English answer, for example `כתבו את המילה ספר באנגלית.`
- All player-facing minigame instructions must avoid revealing the answer. Use Hebrew task guidance; show English answers only as runtime tiles, targets, or other elements that the learner must actively solve or say.
- Word Ordering must not write the completed sentence or the answer noun in the player-facing instruction. Give a Hebrew prompt such as `השלימו את המשפט לפי התרגום בעברית` and show the Hebrew translation.
- Word Ordering does not always require rebuilding every word: use `params.preFilledIndices` to lock correct words and leave a meaningful target word, often a noun, for the learner to choose or place.
- When a Word Ordering task leaves a word open, provide `params.distractorWords` with a small choice set (for example, three words) and keep the English word array as runtime data.
- Word Ordering tasks must include a Hebrew translation in `params.translation`.

## Speak Aloud

- Each Speak Aloud instance may test one word or a short list of words, but never an unintended sentence.
- The player-facing instruction should be `אמרו את המילים הבאות בקול` or equivalent Hebrew wording. The instruction must not repeat the words when the game UI already displays them below; the target list remains runtime data.
