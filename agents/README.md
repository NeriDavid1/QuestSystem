# QuestSystem Agent Workflow

The project uses three specialized roles:

1. **Pedagogical Quest Designer** — designs the learning objective, story, and progression.
2. **Quest Creator** — converts the approved brief into YAML and technical project links.
3. **Quest QA & Variety Agent** — checks content, parameters, builds, imports, and minigame variety.

## Workflow

1. **Pedagogical Quest Designer** receives a topic, requirements, or an existing story and creates or adapts a pedagogical plan.
2. **Quest Creator** creates the questline and quests from the approved plan.
3. **Quest QA & Variety Agent** checks technical, pedagogical, and gameplay integrity.
4. If QA finds a mismatch, QA returns the work to **Quest Creator** with exact corrections.
5. After the correction, QA runs the checks again. The loop continues until the quest passes.

The number of quests and minigames is determined by the user brief or pedagogical plan; no fixed minimum is applied automatically.

Identical minigame types may not appear more than twice in a row. QA checks this together with learning-goal alignment.

Shared content rules are stored in _registry/QUESTLINE_CONTENT_RULES.md.

## Session and workspace coordination

All three roles run in the same user session and the same active working tree: Pedagogical Quest Designer, Quest Creator, and Quest QA & Variety Agent. They are sequential responsibilities in one collaboration, not separate repository branches. Do not create a branch, worktree, or separate chat for an agent. The Quest Creator is the only role that edits quest source files; the Designer provides the plan and the QA Agent reports findings back to the Creator. Keep the agreed repository branch and working context throughout the cycle.

## Local Questline Import Procedure

When the user asks to upload a local questline to the website, use the existing local-to-site importer flow. Do not add new editor buttons or replace this flow with manual data entry.

1. Validate and generate the local Supabase seed bundle from the repository root:
   `python scripts/import_yaml_to_supabase.py`
2. Build the deployable site bundle:
   `python scripts/build_all.py`
3. Commit and push the source and generated bundle to the repository's `main` branch.
4. Wait until the GitHub Pages workflow for that commit finishes successfully. The website must deploy the new `quest_content_bundle.json` before importing.
5. Open a fresh editor tab and navigate to:
   `https://neridavid1.github.io/QuestSystem/editor/?load=<questline-key>&v=<commit-sha>`
   The `v` query value is a cache-buster and should be changed for each deployment.
6. Wait for the editor to load, then verify the questline title, quest count, and at least one representative quest step/minigame in the editor. A URL alone is not evidence of a successful import.
7. If the importer does not run because the editor has not finished selecting a line, select another existing questline once and repeat the same `?load=` navigation in the fresh tab with a new cache-buster.
8. If an old empty or duplicate database record blocks replacement, stop and ask the user to delete that exact record. Never delete a questline silently.

This procedure imports the local revision into the website editor as a draft. Do not claim that a public publish snapshot was created unless the publish action is also explicitly requested and verified.
