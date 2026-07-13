# Minigame: Letter Ordering

**ID:** `letter_ordering`  
**Category:** Spelling  
**Difficulty range:** 1–6  
**Registry:** `_registry/minigames.yaml`

---

## What it is

A UI shows an instruction (usually in Hebrew) telling the player what English word to spell. Scrambled **letter tiles** appear — the correct letters plus **2 distractor letters**. The player drags or taps letters into slots in the correct order. When the word is spelled correctly, the minigame ends successfully.

---

## Screen layout

```
┌─────────────────────────────────────────┐
│  תרשום: כלב                             │  ← instruction (Hebrew)
│  Spell: ___ ___ ___                     │  ← optional English hint
├─────────────────────────────────────────┤
│  [ d ] [ o ] [ g ] [ x ] [ a ]          │  ← letter pool (3 correct + 2 distractors)
├─────────────────────────────────────────┤
│  [ _ ] [ _ ] [ _ ]                       │  ← answer slots
├─────────────────────────────────────────┤
│            [ ✓ Check ]                  │
└─────────────────────────────────────────┘
```

On success: green flash, "מעולה! **dog**!", chest/gate opens if wired.

---

## Variants

### 1. Word spelling (primary)

| Field | Example |
|-------|---------|
| Instruction (HE) | תרשום כלב |
| Target word (EN) | dog |
| Letters shown | d, o, g, + 2 distractors (e.g. x, a) |
| Slots | 3 |

**Learning goal:** Map Hebrew word → English spelling.

### 2. Sound-to-letters (phonics)

| Field | Example |
|-------|---------|
| Instruction (HE) | איזה אותיות באנגלית עושות את הצליל של שש? |
| Target answer | sh |
| Letters shown | s, h, + distractors |
| Slots | 2 |

**Learning goal:** Connect Hebrew phonics intuition to English digraphs (sh, ch, th).

### 3. Story-themed prompt

Instruction references the quest instead of a plain translation:

> "The gate password is the animal Maya lost. תרשום את שם החיה באנגלית."

Target: `dog` (player deduces from story).

---

## Difficulty scaling

| Difficulty | Word length | Distractors | Extra |
|------------|-------------|-------------|-------|
| 1 | 3 letters | 2 | Show first letter hint after 2 fails |
| 2 | 3–4 letters | 2 | — |
| 3 | 4–5 letters | 3 | No first-letter hint |
| 4 | 5 letters | 3 | Timer (optional, generous) |
| 5 | 6 letters | 4 | — |
| 6 | Digraphs (sh, ch) | 3 | Phonics variant |

---

## World triggers

| Interactable | Story hook |
|--------------|------------|
| Locked gate | "Spell the password to open" |
| Chest | "The lock shows scrambled letters" |
| Signpost | "Arrange the letters to read the sign" |
| NPC slate | Teacher asks you to spell on her board |
| Book | "Fix the torn word on the page" |

---

## Success / failure rules

| Rule | Detail |
|------|--------|
| Success | All slots filled in correct order → step complete |
| Wrong order | Shake animation, slots clear or keep wrong ones red |
| Retry | Unlimited retries for children |
| Hint | After 2 failures: first letter snaps into place OR audio plays the word |

---

## Example quest YAML

```yaml
- type: talk_to_npc
  npc_id: teacher_maya
  dialogue_id: maya_lost_dog

- type: play_minigame
  minigame_id: letter_ordering
  difficulty: 1
  # Runtime payload (design doc / future field):
  # prompt_he: "תרשום כלב"
  # target_word: "dog"
  # distractors: ["x", "a"]

- type: return_to_npc
  npc_id: teacher_maya
  dialogue_id: maya_found_dog
```

---

## English-learning checklist

- [ ] Instruction uses Hebrew the child understands
- [ ] Target word was introduced in prior `talk_to_npc` step
- [ ] English word shown on success (read + hear)
- [ ] Distractors are plausible (not random symbols)
- [ ] Word length matches player level (3 letters for beginners)

## See also

- [When to use this minigame](../when-to-use-minigames.md)
- [Play Minigame step](../steps/play_minigame.md)
- [Word Matching](word_matching.md) — use when pictures are involved
