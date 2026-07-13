# Step: Deliver Item

**Type ID:** `deliver_item`  
**English-learning weight:** Low–Medium (vocabulary via item name + dialogue)

---

## What it does

The player brings a specific item (and amount) to an NPC. Often includes a short dialogue when handing over. Completes when the NPC receives the items.

---

## Player experience

1. Quest log: "Bring **Letter A** to **Maya**".
2. Player travels to NPC with item in inventory.
3. Interact → delivery dialogue → items removed from inventory.
4. Step completes.

---

## English-learning role

- Reinforces **English item names** in the quest objective
- Delivery dialogue can use the word in a sentence: "Yes! This is **A** — the first letter!"

Best when the item itself is a lesson object (letter, word card).

---

## Fields (YAML)

| Field | Required | Description |
|-------|----------|-------------|
| `npc_id` | yes | Who receives the item |
| `item_id` | yes | What to deliver |
| `amount` | yes | How many |
| `dialogue_id` | no | Dialogue on hand-in |

### Example

```yaml
- type: deliver_item
  npc_id: teacher_maya
  item_id: letter_a
  amount: 1
  dialogue_id: maya_receives_letter_a
```

---

## Pairs well with

- `collect_item` — classic gather → deliver loop
- `defeat_enemy` — drop → collect → deliver

## See also

- [Collect Item](collect_item.md)
- [When to use each step](../when-to-use.md)
