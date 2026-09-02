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

Shared content rules are stored in _registry/NOUN_CONTENT_RULES.md.
