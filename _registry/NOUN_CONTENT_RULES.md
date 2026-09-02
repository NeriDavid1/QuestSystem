# Noun minigame content rules

These rules are mandatory for all future noun questlines and minigame instances.

## Word Matching

- Every `word_matching` instance must define `params.letters` as the available letter tiles. Each tile has a stable `id` and its single-letter `value`.
- Every `word_matching` instance must also define `params.wordTasks`. Each task has an `id`, the complete `fullWord`, and `missingIndices` containing the zero-based index or indices of the missing letters.
- The player-facing `instruction`, quest `display_text`, and task copy must not reveal the completed answer. Use Hebrew guidance such as `השלימו את האות החסרה במילת ה־noun`.

## Letter Ordering and Word Ordering

- Do not write the target word or the completed sentence in player-facing instructions.
- Use a Hebrew prompt that asks whether the learner remembers or knows the answer, for example `זוכרים איך כותבים את שם העצם?`.
- Word Ordering tasks must include a Hebrew translation in `params.translation`, while the English word array remains runtime data.

## Speak Aloud

- Each Speak Aloud instance tests exactly one noun, not a list of words or a sentence.
- The player-facing instruction should be `תגידו את שם העצם בקול` or equivalent Hebrew wording.
