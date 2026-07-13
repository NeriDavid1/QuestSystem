# Step: Defeat Enemy

**Type ID:** `defeat_enemy`  
**English-learning weight:** Low–Medium (action break; English via labels and callouts)

---

## What it does

The player must defeat a number of enemies in the world. Combat is real-time (or simple tap-to-attack) — this step is the **action** part of the quest, not the main lesson.

The step completes when the kill count is reached.

---

## Player experience

1. Quest marker or NPC direction sends player to a combat area.
2. Enemies spawn or are already present (e.g. "Slime", "Letter Goblin").
3. Player fights until `amount` enemies are defeated.
4. Step completes; loot may drop for a following `collect_item` step.

---

## English-learning role

Combat should be **~30% of a quest at most**. It gives energy and variety, but does not teach English by itself. Layer English in lightly:

- Enemy names in English: **Slime**, **Bat**, **Word Snatcher**
- Floating callouts when hit: the lesson word flashes ("**cat**!")
- Victory line from NPC: "You beat the **B** monsters!"

Do **not** rely on combat alone to teach spelling or vocabulary. Always pair with a minigame or talk step.

---

## Fields (YAML)

| Field | Required | Description |
|-------|----------|-------------|
| `enemy_id` | yes | Enemy type ID (e.g. `training_slime`, `letter_goblin`) |
| `amount` | yes | How many to defeat (min 1) |

### Example

```yaml
- type: defeat_enemy
  enemy_id: letter_goblin
  amount: 3
```

---

## Design guidelines

| Guideline | Why |
|-----------|-----|
| Use weak, friendly enemies for young learners | Reduces frustration; keeps focus on English |
| Tie enemy theme to the lesson when possible | Letter Goblin drops letter **A** items |
| Keep `amount` low (1–5) for early quests | Short fights; more time for minigames |
| Avoid combat-only quests | Breaks the 70% English-learning target |
| Add English name plates above enemies | Passive reading practice during fight |

---

## Story framing examples

- "The **Word Snatchers** stole the letters! Defeat them to get the pieces back."
- "Practice your sword on **training dummies** — they won't hurt you."
- "Three **slimes** block the path to the library. Clear them!"

---

## Pairs well with

- `collect_item` — enemies drop lesson items (letter tiles, word cards)
- `talk_to_npc` — NPC sends player to fight, then praises them
- `reach_location` — go to arena, then fight

## See also

- [When to use each step](../when-to-use.md)
- [Collect Item](collect_item.md)
