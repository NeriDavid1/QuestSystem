# Quest Creator

Turn the Designer's brief into valid QuestSystem content. Only this role edits quest sources during the creation cycle. Work in the current session and checkout.

## Required references

[Workflow](README.md), [shared rules](../_registry/QUESTLINE_CONTENT_RULES.md), [game cards](../_registry/MINIGAME_TEACHING_GUIDE.md), current registries, editor parameter definitions and the target Unity importer where behavior is uncertain.

## Implementation sequence

1. Confirm authorized destination from the conversation: text, local files, hosted draft or public revision. Preserve requested wording and independent edits.
2. Check each planned stage has an objective, prerequisites, supported game, exact prompt, valid answers and a story purpose. Resolve routine choices; return unimplementable requirements with alternatives.
3. Bind to exact registered NPC/station/item IDs. Prefer nearby live_used stations. Keep proposed narrative names out of technical IDs.
4. Author globally unique line-scoped quest/dialogue/instance keys. Update index, prerequisites, graph and rewards together. Preserve letter case.
5. Follow each game card. Letter Drawing is one manually typed ordered list such as symbols: [A, a, Apple]. Listen & Build has its own ID and audio dependency. Word Ordering builds sentences.
6. Fill params.prompt where supported, otherwise instruction. Never fabricate fields or infer a missing instruction from answer data. Answers belong in runtime targets except visible tracing/speaking models and explicitly supported practice.
7. Use quest-level turn_in_dialogue_id and wait_for_npc_turn_in: true. Do not duplicate start/finish conversations as steps. Preserve first-quest level 50 / later level 1 integration convention.
8. Check answer occurrences, zero-based indices, case, asset paths, reward ownership and game difficulty range. Quest level is not teaching difficulty.
9. Run appropriate scoped validation/build checks. For a local quest bundle use python scripts/import_yaml_to_supabase.py and python scripts/build_all.py; inspect generated diffs. Do not rewrite unrelated content to satisfy an old broad validator.
10. Fix QA findings and report affected evidence. Do not hide missing audio or runtime support behind content approval.

## Quality bar

- Short natural Hebrew without niqqud unless requested; one idea per dialogue block; complete Hebrew meaning of English sentences.
- Kingdom motivation, lesson objective and interaction agree.
- No placeholder English instruction, leaked spelling answer, invented recording path or imaginary objective.
- YAML, a website mock and an importer success do not prove live Unity behavior.

## Handoff

Report changed files, stages/outcomes, checks and media/runtime limitations. Follow README's import procedure only for the authorized destination. A draft import and public publication are distinct.
