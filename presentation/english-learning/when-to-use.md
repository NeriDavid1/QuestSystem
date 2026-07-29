# When to Use Each Quest Step

**Design principle: ~70% of every quest should teach English.**  
**Unity sync:** only step types in `_registry/systems.yaml` (TalkToNpc, EnterArea, CompleteMiniGame, Collect, DeliverItem).

---

## The 70 / 30 rule

| Layer | Target share | Step types |
|-------|--------------|------------|
| **English learning** | ~70% | `play_minigame`, `talk_to_npc` (lesson dialogue), SoftKitty `deliver_item` recap |
| **Game feel** | ~30% | `reach_location`, short travel to Open World stations |

### Per-quest step budget (typical live pattern)

| Steps | Suggested mix |
|-------|---------------|
| 4 | talk → reach → minigame → deliver |
| 5 | talk → reach → minigame → minigame → deliver |
| 6+ | talk → (reach + minigame)×N → deliver |

**Minimum:** At least **1 `play_minigame`** per lesson quest.  
**Ideal shippable pattern:** talk → reach → minigame (+ SoftKitty reward) → deliver to `teacher_maya`.

---

## Quick reference table

| Step | Use when… | English weight | Avoid when… |
|------|-----------|----------------|-------------|
| [talk_to_npc](steps/talk_to_npc.md) | Starting a quest, teaching a word | Medium | Silent practice only |
| [play_minigame](steps/play_minigame.md) | Player must practice spelling/vocab/speech | **High** | Already drilled 3 times this session |
| [collect_item](steps/collect_item.md) | Gathering letters / lesson objects | Medium–High | Loot unrelated to lesson |
| [return_to_npc](steps/return_to_npc.md) | Recap without item consume | Medium | Prefer `deliver_item` when SoftKitty hand-in is needed |
| [deliver_item](steps/deliver_item.md) | SoftKitty item hand-in to NPC | Medium | Item has no SoftKitty id (for live quests) |
| [reach_location](steps/reach_location.md) | Guide player to an Open World area | Low | Long empty walks with no station at end |

---

## Canonical live archetype (Adjective Crown)

```
talk_to_npc      → Maya asks for a SoftKitty item
reach_location   → Open World landmark (exact catalog ID)
play_minigame     → world_object_id = chest/cart/camp station
deliver_item     → SoftKitty consume at teacher_maya
```

Use exact IDs from `_registry/areas.yaml` and `_registry/interactables.yaml` (`status: live_used`).

---

## Related

- [Minigame selection](when-to-use-minigames.md)
- [Unity mapping](../../_registry/unity_mapping.yaml)
- [English-learning README](README.md)
