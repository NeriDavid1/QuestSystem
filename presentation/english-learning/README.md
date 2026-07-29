# English-Learning Quest Design

**MMO quest lines that teach children English**  
**Target: ~70% of each quest is active English learning**  
**Synced to Unity OpenWorld catalogs — see [`_registry/unity_mapping.yaml`](../../_registry/unity_mapping.yaml)**

This folder is the design bible for quest steps and minigames. Use it for presentations, authoring, and implementation handoff.

---

## Start here

| I want to… | Read |
|------------|------|
| Pick the right step for a quest beat | [When to use each step](when-to-use.md) |
| Pick the right minigame for a lesson | [When to use each minigame](when-to-use-minigames.md) |
| Understand one step type in depth | [Steps](#quest-steps) below |
| Understand one minigame in depth | [Minigames](#minigames) below |
| Machine-readable minigame IDs | [`_registry/minigames.yaml`](../../_registry/minigames.yaml) |
| Step YAML schemas | [`_registry/systems.yaml`](../../_registry/systems.yaml) |
| Unity ID map | [`_registry/unity_mapping.yaml`](../../_registry/unity_mapping.yaml) |

---

## Design pillars

1. **Learn by doing** — minigames carry most of the lesson; story supports, not replaces.
2. **Hebrew in, English out** — instructions in Hebrew; target words always in English.
3. **MapleStory warmth** — NPCs tell short, emotional stories that embed vocabulary.
4. **MMO feel** — travel and world stations (chests, carts, camps) — never at the expense of the lesson.
5. **Gentle failure** — unlimited retries, hints, no punishment for wrong answers.

---

## Typical quest loop (live Adjective Crown pattern)

```
NPC story (introduce word)
    → reach_location (Open World area)
    → play_minigame on world station (chest/cart/camp)
    → SoftKitty step reward
    → deliver_item to teacher_maya
```

---

## Quest steps

| Step | Unity objective | Doc | Role |
|------|-----------------|-----|------|
| `talk_to_npc` | TalkToNpc | [talk_to_npc.md](steps/talk_to_npc.md) | Story + introduce words |
| `return_to_npc` | TalkToNpc | [return_to_npc.md](steps/return_to_npc.md) | Recap & reward |
| `reach_location` | EnterArea | [reach_location.md](steps/reach_location.md) | Travel pacing |
| `play_minigame` | CompleteMiniGame | [play_minigame.md](steps/play_minigame.md) | **Core practice** |
| `collect_item` | Collect | [collect_item.md](steps/collect_item.md) | Letters & word cards |
| `deliver_item` | DeliverItem | [deliver_item.md](steps/deliver_item.md) | SoftKitty hand-in |

---

## Minigames

| Minigame ID | Unity config | Doc | What the child does |
|-------------|--------------|-----|---------------------|
| `letter_ordering` | LetterOrderingQuestConfigSO | [letter_ordering.md](minigames/letter_ordering.md) | Arrange letters → spell word |
| `word_ordering` | WordOrderingQuestConfigSO | (see minigames.yaml) | Arrange words → sentence |
| `word_matching` | LineMatchQuestConfigSO | [word_matching.md](minigames/word_matching.md) | Match words / opposites |
| `letter_drawing` | DrawingQuestConfigSO | [letter_drawing.md](minigames/letter_drawing.md) | Trace/draw a letter |
| `speak_aloud` | SpeakAloudQuestConfigSO | [speak_aloud.md](minigames/speak_aloud.md) | Say word into microphone |

---

## Example: Adjective Crown q01 (live)

```yaml
steps:
  - type: talk_to_npc
    npc_id: teacher_maya
    dialogue_id: adjective_knight_oak_log_request

  - type: reach_location
    location_id: The Oathstone Bridge

  - type: play_minigame
    minigame_id: letter_ordering
    world_object_id: WoodenCart3_The_Oath_stone_Bridge
    difficulty: 1
    reward_item_id: oak_log
    reward_amount: 1

  - type: deliver_item
    npc_id: teacher_maya
    item_id: oak_log
    amount: 1
    dialogue_id: adjective_knight_oak_log_delivered
```

---

## Related

- [Boss overview](../overview.md)
- [Quest authoring rules](../../.cursor/rules/quest-authoring.mdc)
