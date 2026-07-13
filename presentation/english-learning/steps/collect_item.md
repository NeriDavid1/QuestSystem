# Step: Collect Item

**Type ID:** `collect_item`  
**English-learning weight:** Medium–High (especially for letter/word items)

---

## What it does

The player must gather a specific item (or items) from the world. Items can be:

- **Physical loot** — dropped by enemies, found in the world
- **Letter tiles** — the letter `A`, `B`, `C`… used to complete a word
- **Quest objects** — a key, a book, a word card
- **NPC handouts** — sometimes given via a short interact, then counted as collected

The step completes when the player's inventory reaches `amount` of `item_id`.

---

## Player experience

1. Quest UI shows: "Collect **Letter A** × 1" (icon + English label).
2. Player explores, fights, talks, or opens interactables.
3. Item appears in inventory with English name visible.
4. Counter updates until goal is met.
5. Step completes.

---

## English-learning role

Collect steps are excellent for **letter and word reinforcement**:

- Collecting **Letter A** teaches recognition of the glyph
- Collecting **Word Card: Dog** reinforces spelling before a minigame
- Multiple letters (A + G) set up a later ordering minigame

Show the **English item name** in the quest log and inventory. Hebrew hint optional underneath for beginners.

---

## Fields (YAML)

| Field | Required | Description |
|-------|----------|-------------|
| `item_id` | yes | Registry ID from `items.yaml` |
| `amount` | yes | How many to collect (min 1) |

### Example — letter item

```yaml
- type: collect_item
  item_id: letter_a
  amount: 1
```

### Example — word card

```yaml
- type: collect_item
  item_id: word_card_dog
  amount: 1
```

---

## Item types for English quests

| Item type | Example ID | Learning goal |
|-----------|------------|---------------|
| Single letter | `letter_a`, `letter_d` | Letter recognition |
| Letter set | `letters_dog` (bundle) | Spelling prep |
| Word card | `word_card_cat` | Vocabulary |
| Sound token | `sound_sh` | Phonics (שש → sh) |
| Picture card | `picture_dog` | Word-picture link |

Register new items in `_registry/items.yaml` before using them in quests.

---

## Where items come from

| Source | Typical flow |
|--------|--------------|
| Enemy drop | `defeat_enemy` → `collect_item` |
| World pickup | `reach_location` → interact → item added |
| NPC gift | `talk_to_npc` with flag → auto-grant item |
| Minigame reward | `play_minigame` success → item granted |
| Chest / interactable | Interact opens UI; item inside |

---

## Design guidelines

| Do | Don't |
|----|-------|
| Use English names on item icons | Use only Hebrew item names |
| Make letters visually distinct (big, colorful) | Use tiny identical icons |
| Give a clear map marker for first collection quests | Hide items with no hints |
| Chain letters into a word across steps | Random letters with no lesson link |

---

## Story examples

- "Find the **Letter A** — it fell near the apple tree."
- "The goblin dropped three **word cards**. Pick them up!"
- "Maya gave you a **key**. Now find the other two pieces."

---

## Pairs well with

- `deliver_item` — collect then bring to NPC
- `play_minigame` — collected letters used in ordering puzzle
- `defeat_enemy` — fight first, collect drops

## See also

- [When to use each step](../when-to-use.md)
- [Deliver Item](deliver_item.md)
