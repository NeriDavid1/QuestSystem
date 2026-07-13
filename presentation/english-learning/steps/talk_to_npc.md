# Step: Talk to NPC

**Type ID:** `talk_to_npc`  
**English-learning weight:** Medium (story + vocabulary exposure)

---

## What it does

The player walks up to an NPC and starts a dialogue. The NPC speaks — often telling a story, giving instructions, or teaching a new English word. Think MapleStory-style quest givers: short scenes with personality, not walls of text.

The step completes when the player finishes reading (or auto-plays through) the dialogue.

---

## Player experience

1. Quest marker points to the NPC.
2. Player presses interact → dialogue UI opens.
3. NPC lines appear (with optional voice-over in English).
4. Player taps/clicks through lines.
5. Step completes; next step activates.

---

## English-learning role

Dialogue is one of the main ways children **hear and see English in context** without pressure. Use it to:

- Introduce the target word before a minigame ("I lost my **dog**! Can you help?")
- Teach a letter sound through story ("The **A** key opens the gate…")
- Recap what they learned after a minigame ("You spelled **dog**! Well done!")

**Rule of thumb:** Every talk step should expose at least one new English word or phrase tied to the quest's lesson.

---

## Fields (YAML)

| Field | Required | Description |
|-------|----------|-------------|
| `npc_id` | yes | Registry ID from `npcs.yaml` |
| `dialogue_id` | yes | Unique dialogue script ID |
| `optional_flag` | no | Sets a story flag after dialogue (branching quests) |

### Example

```yaml
- type: talk_to_npc
  npc_id: teacher_maya
  dialogue_id: maya_intro_letter_a
```

---

## Dialogue writing tips

| Do | Don't |
|----|-------|
| Keep lines short (1–2 sentences for young learners) | Write long paragraphs |
| Bold or highlight the lesson word in UI | Hide the English word only in Hebrew |
| Mix Hebrew instructions with English target words early on | Use only Hebrew with no English exposure |
| Give the NPC a clear emotion (worried, excited) | Make every NPC sound the same |
| End with a clear call to action ("Go to the chest!") | End vaguely with no next-step hint |

---

## Story examples (English-learning quests)

**Introducing a word:**
> Maya: "שלום! אני מאיה. Today we learn the word **cat**. חתול באנגלית זה **cat**. Can you find the letters?"

**Setting up a minigame:**
> Old Gatekeeper: "This gate is locked. The password is an English word… **dog**. תרשום את המילה על הלוח."

**After success:**
> Maya: "מעולה! You said **dog** perfectly! בוא נמשיך."

---

## Pairs well with

- `play_minigame` — NPC explains, then player practices
- `collect_item` — NPC tells player what to find
- `return_to_npc` — bookend: talk at start, return at end

## See also

- [When to use each step](../when-to-use.md)
- [Return to NPC](return_to_npc.md)
