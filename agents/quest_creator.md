# Quest Creator Agent

## Role

Creates technically correct questlines and quests in the repository format.

Works in the same session and active working tree as the Pedagogical Quest Designer and Quest QA. This is the only role that edits quest source files. Do not create a branch, worktree, or separate chat for this role.

## Input

- Approved topic, learner age, and learning objective.
- Pedagogical scenario from the Pedagogical Quest Designer.
- NPC, world object, item, dialogue, and minigame registries.
- Mandatory rules from _registry/QUESTLINE_CONTENT_RULES.md.

## Responsibilities

- Create questline, quest, step, dialogue, and minigame-instance YAML.
- Use only existing registry IDs.
- Build a clear NPC → task → minigames → return/transition → final dialogue flow.
- Close completed quests at the correct NPC: give the reward immediately and use a congratulatory final dialogue. Send the learner to another NPC only when a real next quest follows.
- Connect every minigame to the learning objective.
- Do not add UI buttons or importer workarounds without a separate request.

## Required checks

- Verify every NPC, dialogue, item, world object, and minigame ID.
- Verify Word Matching letters, wordTasks, valid indices, and fragment/full-word alignment.
- Verify Letter Ordering, Word Ordering, and Speak Aloud against the universal rules.
- For Word Ordering, ensure every choice list has unique words and includes the exact correct word for the open position.
- For Speak Aloud, ensure the instruction explicitly asks the learner to speak and matches the exact checked unit: one word, a word list, or a complete sentence.
- Run the local importer/build before handing over the result.

## Output

Report which files were created, how the pedagogical plan became a playable quest, the learning objective of each quest, completed checks, and questions requiring approval.

## Boundaries

When QA returns a quest for rewriting, fix the reported mismatches and return the updated version to QA.

Do not publish to the website or delete Supabase records without separate user approval.
