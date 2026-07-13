# Minigame: Letter Drawing

**ID:** `letter_drawing`  
**Category:** Motor skills + letter recognition  
**Difficulty range:** 1–4  
**Registry:** `_registry/minigames.yaml`

---

## What it is

The player **physically draws** an English letter on screen using touch or mouse. A guided outline (dotted letter) or blank canvas is shown. The game validates stroke shape and order. On success, the minigame completes.

Best for **absolute beginners** learning how English letters look and how to write them.

---

## Screen layout

```
┌─────────────────────────────────────────┐
│  צייר את האות A                         │
│  Draw the letter A                      │
├─────────────────────────────────────────┤
│                                         │
│         ╱╲                              │
│        ╱  ╲     ← dotted guide (trace)  │
│       ╱────╲                            │
│      ╱      ╲                           │
│                                         │
│   [finger/mouse draws here]             │
│                                         │
├─────────────────────────────────────────┤
│   [ ↺ Clear ]        [ ✓ Done ]        │
└─────────────────────────────────────────┘
```

---

## Variants

### 1. Trace guided (difficulty 1–2)

- Dotted or faded letter outline
- Player traces on top
- Validation: coverage % of outline + rough stroke direction
- **Best for:** First time seeing a letter (A, B, C…)

### 2. Free draw (difficulty 3–4)

- Blank canvas, prompt only: "Draw **g**"
- Validation: shape recognition (ML or template match)
- **Best for:** After tracing same letter 2–3 times in earlier quests

### 3. Uppercase vs lowercase

| Difficulty | Mode |
|------------|------|
| 1 | Uppercase only (A, B, C) |
| 2 | Lowercase only (a, b, c) |
| 3 | Mixed — prompt specifies which |
| 4 | Lowercase cursive-style (optional, much later) |

---

## Difficulty scaling

| Difficulty | Letter type | Guide | Notes |
|------------|-------------|-------|-------|
| 1 | Uppercase A–E | Full dotted trace | Very forgiving validation |
| 2 | Uppercase F–M | Dotted trace | Slightly stricter |
| 3 | Lowercase a–m | Faded guide | — |
| 4 | Lowercase n–z | Free draw | Show animation hint on fail |

**Introduce letters slowly:** one new letter per quest early on, not the whole alphabet at once.

---

## World triggers

| Interactable | Story hook |
|--------------|------------|
| Chalkboard | Teacher's classroom — draw on the board |
| Sand table | Trace in magic sand |
| Magic slate | Glowing writing surface |
| Scroll | "Sign your name with the letter **A**" |
| Floor tiles | Giant letter puzzle on ground |

---

## Success / failure rules

| Rule | Detail |
|------|--------|
| Success | Shape matches template above threshold |
| Failure | "נסה שוב! Try again!" — outline pulses |
| Clear | Reset canvas anytime |
| Hint | Ghost hand animation shows stroke order after 2 fails |

### Stroke order (optional enhancement)

For letters like **a** and **g**, teach proper stroke order with numbered arrows. Not required for MVP but valuable for school alignment.

---

## Example quest YAML

```yaml
- type: talk_to_npc
  npc_id: teacher_maya
  dialogue_id: maya_intro_letter_a

- type: play_minigame
  minigame_id: letter_drawing
  difficulty: 1
  # target_letter: "A"
  # mode: trace_guided

- type: collect_item
  item_id: letter_a
  amount: 1
  # Optional: auto-grant after minigame success
```

---

## English-learning checklist

- [ ] Letter was named and shown in talk step before drawing
- [ ] Audio plays letter name on start ("A!") and on success
- [ ] One letter per minigame round for beginners
- [ ] Celebrate with the letter appearing in inventory or on a badge
- [ ] Do not mix drawing with spelling full words yet — letter only

## Pairs well with

- `collect_item` with `letter_a` — draw it, then "own" the letter item
- `letter_ordering` — later use that letter in a word puzzle
- `word_matching` gap variant — child already knows what **o** looks like

## See also

- [Letter Ordering](letter_ordering.md)
- [When to use this minigame](../when-to-use-minigames.md)
