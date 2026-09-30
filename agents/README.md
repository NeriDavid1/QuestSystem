# QuestSystem Agent Workflow

Three roles form one authoring cycle:
1. [Pedagogical Quest Designer](pedagogical_quest_designer.md): objectives, prerequisites, Kingdom story and exercise brief.
2. [Quest Creator](quest_creator.md): source content and exact runtime bindings.
3. [Quest QA and Learning Review](quest_qa_agent.md): independent review and evidence.

## Required reading and authority

- [_registry/QUESTLINE_CONTENT_RULES.md](../_registry/QUESTLINE_CONTENT_RULES.md) owns shared content policy.
- [_registry/MINIGAME_TEACHING_GUIDE.md](../_registry/MINIGAME_TEACHING_GUIDE.md) owns game-specific teaching and parameter guidance for all eight games.
- [BRIEF_TEMPLATE.md](BRIEF_TEMPLATE.md) defines the Designer handoff.
- Live registries/editor/importer define technical capability; stale examples do not override them.
- Explicit user instructions override project preferences. Record an intentional exception without requesting the same permission again. Unsupported capabilities require an honest limitation and supported alternative, not an invented field.

## Cycle

1. Designer records the scope, readiness assumptions, observable outcomes, prerequisite ladder and two short story premises; develops the selected one into an exact brief.
2. Creator implements when authorized. A user asking only for a story receives text; creating a brief does not authorize external publication.
3. QA checks against the brief, game cards and current runtime evidence.
4. Creator fixes actionable findings; QA rechecks the changed tasks and affected dependencies.
5. Deliver separate content, import, runtime and publication statuses. Missing runtime access is PENDING, not an invented PASS.

No fixed minimum number of quests/games, automatic NPC rotation, or absolute two-identical-games limit. Purposeful repetition and a recurring teacher are valid. Explain the learning purpose of repetition and remove filler.

## Session coordination

The roles work in the current session and active checkout. Role names do not automatically authorize separate chats or parallel agents. Creator alone edits quest sources during the cycle; Designer supplies the brief and QA reports corrections. Preserve independent edits.

## Documentation maintenance

When a game contract changes, update its teaching card, registry and applicable role references together. Do not duplicate shared policy across role files. Mark source/runtime/catalog mismatches and recheck them against the target build before authoring dependent content.


## Local Questline Import Procedure

When the user asks to upload a local questline to the website, use the existing local-to-site importer flow. Do not add new editor buttons or replace this flow with manual data entry. This is the only file that defines the import sequence.

1. Validate and generate the local Supabase seed bundle from the repository root:
   `python scripts/import_yaml_to_supabase.py`
2. Build the deployable site bundle:
   `python scripts/build_all.py`
3. Commit and push the source and generated bundle to the repository's `main` branch.
4. Wait until the GitHub Pages workflow for that commit finishes successfully. The website must deploy the new `quest_content_bundle.json` before importing.
5. For an authorized update of an existing line, identify the exact target and export its current hosted draft as a backup. The current importer can update the same line in place, preserving quest IDs by external key and retained step IDs; prefer this supported path. Remove a target only when deletion is explicitly required and authorized under the applicable confirmation policy. Never delete another line or infer replacement permission from a request to review/design content.
6. Open a fresh editor tab and navigate to:
   `https://neridavid1.github.io/QuestSystem/editor/?load=<questline-key>&v=<commit-sha>`
   The `v` query value is a cache-buster and should be changed for each deployment.
7. Wait for the editor to load, then verify the recreated questline title, quest count, and at least one representative quest step/minigame in the editor. A URL alone is not evidence of a successful import.
8. If the importer does not run because the editor has not finished selecting a line, select another existing questline once and repeat the same `?load=` navigation in the fresh tab with a new cache-buster.

This procedure imports the local revision into the website editor as a draft. Do not claim that a public publish snapshot was created unless the publish action is also explicitly requested and verified.
