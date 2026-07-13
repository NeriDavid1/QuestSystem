# When to Use Each Quest Step

**Design principle: ~70% of every quest should teach English.**  
The remaining ~30% is story, travel, and light combat — enough to feel like an MMO, not enough to drown the lesson.

---

## The 70 / 30 rule

| Layer | Target share | Step types |
|-------|--------------|------------|
| **English learning** | ~70% | `play_minigame`, `talk_to_npc` (lesson dialogue), `collect_item` (letters/words) |
| **Game feel** | ~30% | `defeat_enemy`, `reach_location`, short travel, cosmetic rewards |

### Per-quest step budget (typical 4–6 step quest)

| Steps | Suggested mix |
|-------|---------------|
| 4 | talk → minigame → minigame OR collect → return |
| 5 | talk → reach → minigame → collect → return |
| 6 | talk → reach → defeat (1) → collect → minigame → return |

**Minimum:** At least **1 `play_minigame`** per lesson quest.  
**Ideal:** **1 talk + 1–2 minigames + 1 return** as the English core.

---

## Quick reference table

| Step | Use when… | English weight | Avoid when… |
|------|-----------|----------------|-------------|
| [talk_to_npc](steps/talk_to_npc.md) | Starting a quest, teaching a word, story moment | Medium | You need silent practice only |
| [play_minigame](steps/play_minigame.md) | Player must **practice** spelling, vocab, writing, speech | **High** | Lesson already drilled 3 times this session |
| [collect_item](steps/collect_item.md) | Gathering **letters**, word cards, lesson objects | Medium–High | Generic loot unrelated to lesson |
| [return_to_npc](steps/return_to_npc.md) | Quest end, recap, reward, next-lesson teaser | Medium | Mid-quest with no new dialogue |
| [deliver_item](steps/deliver_item.md) | Bring a lesson item to NPC after collecting | Low–Medium | Item has no English label |
| [reach_location](steps/reach_location.md) | Guide player to classroom, chest, arena | Low | Long empty walks with no activity at end |
| [defeat_enemy](steps/defeat_enemy.md) | Action break, drop lesson letters | Low–Medium | Quest has no minigame and no vocab tie-in |
| [wait_time](steps/wait_time.md) | Almost never in kids' quests | None | Always prefer something interactive |

---

## Quest archetypes

### Archetype A: "First word" (Level 1–2)

**Goal:** Introduce one English word (e.g. dog).

```
talk_to_npc     → Maya introduces "dog"
play_minigame   → letter_ordering (spell dog)
return_to_npc   → Maya recaps "dog"
```

**English share:** ~85%

---

### Archetype B: "First letter" (Level 1)

**Goal:** Introduce letter A.

```
talk_to_npc     → Maya shows "A"
play_minigame   → letter_drawing (trace A)
collect_item    → receive letter_a
deliver_item    → bring letter_a to Maya
return_to_npc   → praise + preview letter B
```

**English share:** ~80%

---

### Archetype C: "Vocabulary set" (Level 3–5)

**Goal:** Learn 3 animals.

```
talk_to_npc     → intro cat, dog, fish
reach_location  → go to market
play_minigame   → word_matching (3 words ↔ 3 photos)
return_to_npc   → quiz dialogue ("What is חתול?")
```

**English share:** ~75%

---

### Archetype D: "Action quest" (Level 5+)

**Goal:** Mix combat with letter loot, still end on English.

```
talk_to_npc     → Word Snatchers stole letters
reach_location  → forest zone
defeat_enemy    → 3 letter goblins
collect_item    → letters_d, o, g
play_minigame   → letter_ordering (spell dog from collected letters)
return_to_npc   → story continues
```

**English share:** ~60% — acceptable if minigame is the climax.

---

### Archetype E: "Speak when ready" (Level 8+)

**Goal:** Pronunciation practice.

```
talk_to_npc     → hear NPC say "dog" twice
play_minigame   → word_matching (dog ↔ image) — warm-up
play_minigame   → speak_aloud (say dog)
return_to_npc   → graduation dialogue
```

**English share:** ~90%

---

## Step sequencing rules

| Rule | Why |
|------|-----|
| **Talk before minigame** | Introduce the word before testing |
| **Return after minigame** | Recap locks in memory |
| **Collect before ordering** | Physical letter items reinforce glyphs before spelling |
| **Matching before speaking** | Recognition before production |
| **Drawing before ordering** | Know the letter shape before spelling words |
| **Never: defeat → defeat → defeat** | No English in combat-only chains |
| **Never: minigame without prior exposure** | Child won't know the target word |

---

## MapleStory-style story without losing the lesson

Story steps (`talk_to_npc`) should **embed** the English target:

| Weak story | Strong story |
|------------|--------------|
| "Go to the cave." | "My **dog** ran into the cave! Find the word **dog** on the gate." |
| "Kill slimes." | "Slimes ate the letter **A**! Get it back." |
| "Good job." | "You spelled **dog**! You're a real Word Hero." |

Every story beat should name the lesson word at least once.

---

## Interactable → step mapping

When placing objects in the world:

| World object | Step type | Minigame |
|--------------|-----------|----------|
| Friendly NPC quest giver | `talk_to_npc` / `return_to_npc` | — |
| Locked gate / chest | `play_minigame` | `letter_ordering` |
| Market stall / board | `play_minigame` | `word_matching` |
| Classroom chalkboard | `play_minigame` | `letter_drawing` |
| Echo stone / teacher listen | `play_minigame` | `speak_aloud` |
| Glowing letter on ground | `collect_item` | — |
| Training yard | `defeat_enemy` | — |

---

## Level progression (which steps dominate)

| Player level | Primary steps | Minigames unlocked |
|--------------|---------------|-------------------|
| 1–3 | talk, drawing, collect | `letter_drawing`, easy `letter_ordering` |
| 4–6 | talk, matching, collect | `word_matching`, `letter_ordering` |
| 7–9 | talk, reach, light combat | harder matching, phonics ordering |
| 10+ | full mix | `speak_aloud` introduced |
| 15+ | story-heavy with speak | all minigames, phrases |

---

## Document index

### Step docs
- [talk_to_npc](steps/talk_to_npc.md)
- [play_minigame](steps/play_minigame.md)
- [collect_item](steps/collect_item.md)
- [deliver_item](steps/deliver_item.md)
- [return_to_npc](steps/return_to_npc.md)
- [reach_location](steps/reach_location.md)
- [defeat_enemy](steps/defeat_enemy.md)
- [wait_time](steps/wait_time.md)

### Minigame docs
- [When to use each minigame](when-to-use-minigames.md)
- [letter_ordering](minigames/letter_ordering.md)
- [word_matching](minigames/word_matching.md)
- [letter_drawing](minigames/letter_drawing.md)
- [speak_aloud](minigames/speak_aloud.md)
