# Questline Content and Minigame Rules

These rules are mandatory for every questline and minigame instance in this repository. They apply to new content and to edits of existing content, not only to noun lessons.

## Word Matching

- Every `word_matching` instance must define `params.letters` as the available letter tiles. Each tile has a stable `id` and its single-letter `value`.
- Every `word_matching` instance must also define `params.wordTasks`. Each task has an `id`, the complete `fullWord`, and `missingIndices` containing one or more zero-based indices of the missing letters.
- Every character at every `missingIndices` position must exist in `params.letters[].value`. If a word has two missing letters, both letters must be available in the letter pool.
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
- Every Word Ordering choice list must contain unique words: never show the same option more than once. The list must include the exact correct word needed for the open position, plus only intentional distractors.
- Word Ordering tasks must include a Hebrew translation in `params.translation`.

## Language and answer disclosure

- Learner-facing instructions and task descriptions should be primarily Hebrew, with only the necessary English learning material.
- Never give the English answer in an instruction when the learner is expected to spell, choose, match, or order it. Give the Hebrew meaning and the required action instead.
- Speak Aloud is the intentional exception: English target words may be shown because the learner must say them in English. If the game UI already displays the targets, do not duplicate them in the instruction.
- When assembling a sentence, always provide the Hebrew translation. The learner may complete only the missing target word(s); do not force a full rewrite when partial completion better serves the objective.

## Questline and quest structure

- A questline should contain a clear progression of connected quests, with a coherent story, NPC task, active mini-games, optional return to an NPC, and a final turn-in dialogue that thanks the learner and points to the next NPC or quest.
- Use several varied mini-games per quest when appropriate, keeping every mini-game tied to the lesson objective. Do not repeat identical tasks or mix unrelated vocabulary into a lesson.
- Dialogue flow must not insert an unnecessary `talk_to_npc` step between the opening dialogue and the first active task; return to an NPC only when the story or handoff requires it.
- Use exact registry IDs for NPCs, world objects, minigame instances, items, and dialogues so the Unity importer can resolve every step.

## Speak Aloud

- Each Speak Aloud instance may test one word or a short list of words, but never an unintended sentence.
- The player-facing instruction should be `אמרו את המילים הבאות בקול` or equivalent Hebrew wording. The instruction must not repeat the words when the game UI already displays them below; the target list remains runtime data.

## Local-to-site import

For every request to upload a local questline to the website, follow this repository procedure:

1. Run `python scripts/import_yaml_to_supabase.py` to validate the YAML source and generate the bundle/seed artifacts.
2. Run `python scripts/build_all.py` and confirm that the build completes without errors.
3. Commit and push the source plus generated bundle to `main`.
4. Wait for the GitHub Pages workflow for the pushed commit to complete successfully.
5. In a fresh browser tab, open `https://neridavid1.github.io/QuestSystem/editor/?load=<questline-key>&v=<commit-sha>` so the existing editor importer loads the local revision. Use a new cache-buster on every deployment.
6. Verify the imported title, quest count, and representative step/minigame in the editor. If the command does not fire, select another questline and repeat the navigation once the editor selection is ready.
7. If an existing empty or duplicate database record prevents replacement, request confirmation before deleting that exact record; never perform an unrequested destructive delete.

This is the standard method for all subjects and questlines. It imports a draft into the editor; a public publish must be separately requested and verified.
