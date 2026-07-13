# Step: Return to NPC

**Type ID:** `return_to_npc`  
**English-learning weight:** Medium (recap + reward moment)

---

## What it does

After completing objectives elsewhere, the player goes back to an NPC to turn in the quest or continue the story. Dialogue plays — usually praise, story continuation, and reward handoff.

Completes when the return dialogue finishes.

---

## Player experience

1. Quest log updates: "Return to **Maya**".
2. Marker points to NPC.
3. Player talks → completion dialogue + rewards (if end of quest).

---

## English-learning role

Use return dialogue to **recap the English lesson**:

- Repeat the target word 2–3 times in context
- Ask a soft recall question ("What is חתול in English? **Cat!**")
- Preview the next lesson word

This reinforces memory without another minigame.

---

## Fields (YAML)

| Field | Required | Description |
|-------|----------|-------------|
| `npc_id` | yes | Registry ID |
| `dialogue_id` | yes | Turn-in / continuation dialogue |

### Example

```yaml
- type: return_to_npc
  npc_id: teacher_maya
  dialogue_id: maya_lesson_complete
```

---

## Pairs well with

- `play_minigame` — practice then report back
- `collect_item` + `deliver_item` — gather then return
- End of every short quest loop: talk → do → **return**

## See also

- [Talk to NPC](talk_to_npc.md)
- [When to use each step](../when-to-use.md)
