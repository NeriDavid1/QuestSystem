# The Nouns Festival — local QA report

## Roles completed

- Designer: checked the quest flow, level/prerequisite order, NPC ownership, and task variety.
- Creator: replaced the incomplete exported content with authored local tasks and dialogues.
- QA: rebuilt the bundle and checked source, import, export, and uniqueness constraints.

## Result

- q02 now contains 3 playable minigame steps after its opening dialogue.
- q03–q06 contain playable steps with progress dialogues between task groups.
- 22 festival minigame instances are authored locally; no empty instruction, task, target, success, or prompt fields remain.
- Every quest contains one `speak_aloud` exercise. q02–q05 use three-word phrases, and q06 uses one simple five-word sentence. Every speaking prompt includes the Hebrew meaning and the speaking action.
- The festival uses unique target vocabulary, including simple final-quest words: candle, mirror, shell, lion, zebra, panda, monkey, drum, tent, flag, bell, pilot, nurse, artist, harbor, moon, star, boat, cloud, house, train, and plane.
- No target vocabulary overlaps the other registered quest minigames.
- No `return_to_npc` or `reach_location` step is present in this questline.
- All festival quests have `wait_for_npc_turn_in: false`.
- No more than two identical minigame types occur consecutively.

## Build verification

- Every quest now ends with a return conversation at the NPC who owns that quest. Intermediate quests point to the next story NPC; the final Village Head dialogue closes the questline without sending the learner onward.
- Import: 0 errors, 0 warnings.
- Bundle rebuilt: `supabase/seed/quest_content_bundle.json`.
- Presentation rebuilt: `presentation/viewer.html`.
- Automated tests: 20 passed.

Runtime Unity playthrough was not performed in this pass; this report covers local authoring, import, generated bundle, presentation build, and static QA.
