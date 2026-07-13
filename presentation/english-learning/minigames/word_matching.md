# Minigame: Word Matching

**ID:** `word_matching`  
**Category:** Vocabulary  
**Difficulty range:** 1–8  
**Registry:** `_registry/minigames.yaml`

---

## What it is

A split UI: **left side** shows words or letter fragments; **right side** shows pictures or matching pieces. The player draws lines or taps pairs to connect matches. When all pairs are correct, the minigame completes.

Two main variants share the same minigame shell:

1. **Word ↔ Image** — vocabulary (dog ↔ photo of dog)
2. **Letter ↔ Gap** — missing letter (o ↔ d_g)

---

## Variant A: Word to image

### Screen layout

```
┌─────────────────────────────────────────┐
│  התאם מילה לתמונה                       │
│  Match the word to the picture!         │
├──────────────────┬──────────────────────┤
│   cat            │   [🐱 photo]         │
│   dog            │   [🐶 photo]         │
│   fish           │   [🐟 photo]         │
└──────────────────┴──────────────────────┘
```

Player connects `cat` → cat photo, `dog` → dog photo, `fish` → fish photo.

### Rules

| Pairs | Difficulty |
|-------|------------|
| 2 | Tutorial (difficulty 1) |
| 3 | Standard early quest (difficulty 2–3) |
| 4–5 | Mid game (difficulty 4–6) |
| 6+ | Advanced (difficulty 7–8) |

Use **clear photos** — literal, child-friendly, no ambiguous images.

---

## Variant B: Missing letter

### Screen layout

```
┌─────────────────────────────────────────┐
│  מצא את האות החסרה                      │
│  Find the missing letter!               │
├──────────────────┬──────────────────────┤
│   o              │   d_g                │
│   a              │   c_t                  │
│   i              │   f_sh                 │
└──────────────────┴──────────────────────┘
```

Player matches `o` → `d_g` (dog), `a` → `c_t` (cat), etc.

### Learning goal

Child sees the **shape of a word with a gap** and picks the letter that completes it. Bridges from single letters to whole-word reading.

---

## Variant C: Word to translation (optional, later levels)

| Left | Right |
|------|-------|
| dog | כלב |
| cat | חתול |

Use only after basic vocabulary is established — not for absolute beginners.

---

## Difficulty scaling

| Difficulty | Variant | Details |
|------------|---------|---------|
| 1–2 | Image | 2 pairs, very common words (cat, dog) |
| 3–4 | Image | 3 pairs |
| 3–4 | Gap | 2–3 gaps, single missing letter |
| 5–6 | Image | 4 pairs, similar words (ship/sheep) |
| 5–6 | Gap | 3–4 gaps, middle letter missing |
| 7–8 | Mixed | Image + gap in same round |
| 7–8 | Translation | Hebrew ↔ English pairs |

---

## World triggers

| Interactable | Story hook |
|--------------|------------|
| Market stall | "Match the labels to the goods" |
| Chest | "Sort the picture cards inside" |
| Bulletin board | "Pin each word to the right photo" |
| Shelf / library | "Put books next to their covers" |
| Puzzle board | Standalone matching table in world |

---

## Success / failure rules

| Rule | Detail |
|------|--------|
| Success | All pairs matched correctly |
| Wrong pair | Line turns red, resets that pair only |
| Retry | Unlimited |
| Hint | After 2 wrong full attempts, one pair auto-connects |

---

## Example quest YAML

```yaml
- type: reach_location
  location_id: market_square

- type: play_minigame
  minigame_id: word_matching
  difficulty: 2
  # Runtime payload:
  # variant: word_to_image
  # pairs: [{ word: "dog", image: "dog_01" }, ...]

- type: return_to_npc
  npc_id: merchant_lina
  dialogue_id: lina_market_lesson_done
```

### Missing-letter example

```yaml
- type: play_minigame
  minigame_id: word_matching
  difficulty: 3
  # variant: letter_to_gap
  # pairs: [{ letter: "o", gap: "d_g" }, { letter: "a", gap: "c_t" }]
```

---

## English-learning checklist

- [ ] Words were introduced earlier in dialogue or a previous quest
- [ ] Images are unambiguous and age-appropriate
- [ ] For gap variant: gap position varies (not always middle letter)
- [ ] Audio on match: hear the full word when pair is correct
- [ ] Max 3–4 pairs for young children per round

## See also

- [Letter Ordering](letter_ordering.md) — full word spelling, not matching
- [When to use this minigame](../when-to-use-minigames.md)
