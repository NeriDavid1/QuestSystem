# English-Learning Quest Design

**MMO quest lines that teach children English**  
**Target: ~70% of each quest is active English learning**

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

---

## Design pillars

1. **Learn by doing** — minigames carry most of the lesson; story supports, not replaces.
2. **Hebrew in, English out** — instructions in Hebrew; target words always in English.
3. **MapleStory warmth** — NPCs tell short, emotional stories that embed vocabulary.
4. **MMO feel** — travel, chests, gates, light combat — but never at the expense of the lesson.
5. **Gentle failure** — unlimited retries, hints, no punishment for wrong answers.

---

## Typical quest loop

```
NPC story (introduce word)
    → travel / light combat (optional)
    → interact with object (chest, gate, board)
    → MINIGAME (practice English)
    → world payoff (chest opens, etc.)
    → return to NPC (recap + reward)
```

---

## Quest steps

Each step type has its own document.

| Step | Doc | Role in English MMO |
|------|-----|---------------------|
| `talk_to_npc` | [talk_to_npc.md](steps/talk_to_npc.md) | Story + introduce words |
| `play_minigame` | [play_minigame.md](steps/play_minigame.md) | **Core practice** |
| `collect_item` | [collect_item.md](steps/collect_item.md) | Letters & word cards |
| `deliver_item` | [deliver_item.md](steps/deliver_item.md) | Hand in lesson items |
| `return_to_npc` | [return_to_npc.md](steps/return_to_npc.md) | Recap & reward |
| `reach_location` | [reach_location.md](steps/reach_location.md) | Travel pacing |
| `defeat_enemy` | [defeat_enemy.md](steps/defeat_enemy.md) | Action + letter drops |
| `wait_time` | [wait_time.md](steps/wait_time.md) | Avoid in kids' quests |

---

## Minigames

| Minigame ID | Doc | What the child does |
|-------------|-----|---------------------|
| `letter_ordering` | [letter_ordering.md](minigames/letter_ordering.md) | Arrange letters → spell word (תרשום כלב → d-o-g) |
| `word_matching` | [word_matching.md](minigames/word_matching.md) | Match words ↔ photos, or letter ↔ d_g |
| `letter_drawing` | [letter_drawing.md](minigames/letter_drawing.md) | Trace/draw a letter on screen |
| `speak_aloud` | [speak_aloud.md](minigames/speak_aloud.md) | Say word into microphone |

---

## Example: "Maya's Lost Dog" (Level 2)

```yaml
steps:
  - type: talk_to_npc
    npc_id: teacher_maya
    dialogue_id: maya_lost_dog          # introduces "dog"

  - type: reach_location
    location_id: garden_gate

  - type: play_minigame
    minigame_id: letter_ordering        # תרשום כלב → dog
    difficulty: 1                       # gate opens on success

  - type: return_to_npc
    npc_id: teacher_maya
    dialogue_id: maya_found_dog         # recap "dog"
```

**English share:** ~75% (talk + ordering + recap)

---

## Folder layout

```
presentation/english-learning/
  README.md                 ← you are here
  when-to-use.md            ← step selection guide
  when-to-use-minigames.md  ← minigame selection guide
  steps/                    ← one doc per quest step type
  minigames/                ← one doc per minigame
```

---

## Related

- [Boss overview (existing quest lines)](../overview.md)
- [Quest authoring rules](../../.cursor/rules/quest-authoring.mdc)
