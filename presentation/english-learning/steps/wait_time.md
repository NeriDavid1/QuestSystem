# Step: Wait Time

**Type ID:** `wait_time`  
**English-learning weight:** None — use rarely

---

## What it does

Forces a real-time or in-game wait before the next step. Included for completeness; **avoid in children's English quests** unless there is a strong design reason (e.g. "come back tomorrow" daily quest).

---

## Fields (YAML)

| Field | Required | Description |
|-------|----------|-------------|
| `seconds` | yes | Real-time wait |
| `in_game_hours` | no | In-game clock wait |

---

## Recommendation for English MMO

**Do not use** in the main tutorial or lesson quests. Children lose focus during arbitrary waits. Prefer `talk_to_npc` or a short `reach_location` for pacing instead.

## See also

- [When to use each step](../when-to-use.md)
