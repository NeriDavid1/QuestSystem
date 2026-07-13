# Step: Play Minigame

**Type ID:** `play_minigame`  
**English-learning weight:** **High** — core practice step

---

## What it does

The player interacts with something in the world (chest, gate, sign, chalkboard, NPC object). A minigame UI opens. The player completes the English exercise. On success, the step finishes — and optionally something in the world changes (chest opens, gate unlocks, nothing visible).

This is where **most of the 70% English learning** happens in a quest.

---

## Player experience

1. Quest marker points to an interactable (or the interactable glows).
2. Player presses interact → transition to minigame UI.
3. Instructions appear (Hebrew + English target).
4. Player completes the exercise (ordering, matching, drawing, speaking).
5. Success feedback (stars, sound, NPC cheer).
6. Return to world — chest opens / gate opens / step completes.
7. On failure: gentle retry, no harsh penalty.

---

## World interactables (triggers)

Minigames are always reached through an interactable in the world:

| Interactable | Example use |
|--------------|-------------|
| Chest | Word matching inside; chest opens on success |
| Gate / door | Letter ordering unlocks the path |
| Signpost / board | Read and complete a spelling puzzle |
| Chalkboard | Letter drawing |
| Magic mirror / crystal | Speak aloud |
| Book / scroll | Ordering or matching |
| NPC-held object | Teacher holds a slate — interact to start |

The YAML step does not define the interactable art — only `minigame_id` and `difficulty`. Level designers place the object and wire it to the quest step.

---

## Available minigames

| ID | Doc | Best for |
|----|-----|----------|
| `letter_ordering` | [Letter Ordering](../minigames/letter_ordering.md) | Spelling words letter by letter |
| `word_matching` | [Word Matching](../minigames/word_matching.md) | Vocabulary, missing letters |
| `letter_drawing` | [Letter Drawing](../minigames/letter_drawing.md) | Writing letters (beginners) |
| `speak_aloud` | [Speak Aloud](../minigames/speak_aloud.md) | Pronunciation (advanced) |

Full registry: `_registry/minigames.yaml`

---

## Fields (YAML)

| Field | Required | Description |
|-------|----------|-------------|
| `minigame_id` | yes | ID from `minigames.yaml` |
| `difficulty` | yes | 1–10; scales distractors, time, word length |
| `success_required` | no | Default `true`; if false, step completes even on fail (rare) |

### Example

```yaml
- type: play_minigame
  minigame_id: letter_ordering
  difficulty: 2
  success_required: true
```

### Example quest flow (gate puzzle)

```yaml
steps:
  - type: talk_to_npc
    npc_id: teacher_maya
    dialogue_id: maya_gate_locked

  - type: play_minigame
    minigame_id: letter_ordering
    difficulty: 1

  - type: return_to_npc
    npc_id: teacher_maya
    dialogue_id: maya_gate_opened
```

---

## Difficulty scale (English quests)

| Level | Word length | Distractors | Minigame types |
|-------|-------------|-------------|----------------|
| 1–2 | 3 letters (cat, dog) | 2 wrong letters | ordering, drawing |
| 3–4 | 4–5 letters | 3 wrong letters | ordering, matching |
| 5–6 | 5–6 letters, blends | 4 distractors | matching, ordering |
| 7–8 | Phrases, gaps | Mixed | matching, speak |
| 9–10 | Sentences, sh/ch/th | Hard distractors | speak_aloud |

---

## Success and failure UX

| Outcome | Behavior |
|---------|----------|
| Success | Positive sound + animation; interactable resolves (chest opens); step complete |
| Failure | "Try again!" — no XP loss; same puzzle or slightly easier retry |
| Hint (optional) | After 2 fails, highlight first correct letter or play audio |

---

## Design guidelines

| Do | Don't |
|----|-------|
| Put 1–2 minigame steps per quest | Stack 5 minigames in a row |
| Tie prompt to story ("spell the password") | Generic "complete the puzzle" |
| Open chest/gate on success for satisfaction | Minigame with no world payoff |
| Use Hebrew instruction + English target word | English-only for beginners |

---

## Pairs well with

- `talk_to_npc` — explain before, celebrate after
- `collect_item` — minigame rewards a letter item
- `reach_location` — travel to the interactable first

## See also

- [When to use each step](../when-to-use.md)
- [When to use each minigame](../when-to-use-minigames.md)
