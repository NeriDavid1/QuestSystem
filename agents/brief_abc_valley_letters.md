# ABC Valley letters: review of The Alphabet Adventure and the minigame pattern for the valley

Status: **draft for review**. Nothing is generated yet. When this pattern is approved it drives the task minigames
of `abc_valley` (step type `custom`, `tasks[].mode = minigame`).

Learner: about 6 to 9 years old, starts from zero English. Reads short Hebrew. Goal: by the end of the valley the
child recognises A-N, knows each letter's name and its main sound, can find it at the start of a known word, can
trace it, and can build a few short real words from letters already learned. It stays a game: short games, many
small wins, no long tests.

---

## Part 1 - The Alphabet Adventure: what to keep, what to change

Source: the live draft `the_alphabet_adventure` (7 quests, A-D + 3 homework) and its brief
`reports/alphabet_adventure_brief_2026-09-30.md`.

### Keep

- **Name versus sound.** "A is called ei, but at the start of apple it sounds different" is exactly what beginners miss.
- **b / d contrast with a concrete cue.** "b has the tall line on the left of the belly, d on the right", practised
  after both letters are known.
- **Distractors are letters already learned.** They grow quest by quest (B is avoided in the C quest, and so on).
- **Real decodable words at the end.** `dad` and `bad` are spelled only from letters already taught, and changing
  the first letter changes the meaning.
- **A story reason for every lesson,** plus short homework that revisits it.

### Change (most important first)

1. **Too much talking, too abstract.**
   - Start dialogues run 8 to 9 long lines.
   - They use phonetic symbols a child cannot read (`/æ/`, `/eɪ/`) and grammar terms ("אות תנועה", "ניקוד").
   - One line is wrong: "A היא אות ניקוד באנגלית". English vowels are letters, not niqqud.
   - They add disclaimers ("זה תרגול זיהוי, לא מילה", "אין צורך לקרוא את כל המילה") and walk through every station
     before the game. Our own content rules forbid that.
   - **Better:** 2-4 short lines, one idea each: the letter's name, its shape picture, its sound in one anchor word.
     The letter card (`displayLetter`) carries the visual.
2. **Two sounds of A on day one, and "C has other sounds too".** This is overload for a first lesson.
   - **Better:** one anchor sound per letter (apple, bee, cat). Extra sounds come later, as their own small event.
3. **Every quest starts with tracing.** That is production before recognition.
   - **Better:** see it, find it, hear it, then trace it, then use it.
4. **Easy to pass without knowing.**
   - The miner needs only 2 catches.
   - The first listening task has 2 choices, which is a 50% guess.
   - Each skill appears once per letter.
   - **Better:** keep each game short, but use 3 choices after the first exposure and ask for 3-4 correct catches.
     The letter then shows up again in later quests (spaced review), not only in homework.
5. **Review lives only in homework.**
   - **Better:** every letter quest ends with one short mixed task that brings back earlier letters.
6. **Words with letters not yet taught.** Examples: tracing `apple`; gaps in `bag` and `cat` where g and t are
   unknown. The brief labels them exposure, but they add noise for a child.
   - **Better:** picture word plus first-letter gap now; full spelling only from known letters.
7. **Syllable blending (ba, ca, da) with Hebrew transliteration.**
   - It is an early decoding step without a real audio model for the syllable.
   - In the valley we get real decodable words from D onward (`bad, dad, cab, bed, fed, beg, dig, hid, kid, lid, jam,
     him, man, hen`), so we blend into real words instead.
8. **Leftover data.** About 15 test instances (`the_alphabet_adventure_q01_a_a_minigame_2_copy...`,
   `q02_b_b_minigame_copy...`) have mixed-up fields, e.g. a drawing instance with Fruit Slice params. They should be
   deleted from the database.

---

## Part 2 - The pattern: the "letter ladder"

Every letter gets the same five short rungs. The NPC does the teaching in the quest dialogue; the games are only
practice.

| Rung | Skill | Game | Content rule | Pass bar |
|---|---|---|---|---|
| 1. Find it | Recognise both forms | Dwarf Miner | targets `[X, x]`; distractors 2-3 letters already learned. For A: 2 very different shapes such as O and S | 4 correct, 3 mistakes allowed |
| 2. Hear it | First sound of the anchor word → letter | Listen & Build | `targetWord` = the lowercase letter; `promptAudio` = anchor word clip; choices = new letter + 2 learned (A: + 1) | the single tile |
| 3. Trace it | Formation of both forms | Letter Drawing | `symbols: [X, x]`. The b/d pair is traced together in the D quest | trace both |
| 4. Use it | Letter at the start of a word in a picture | Word Matching | 2 picture words with an initial gap: the anchor word plus a review word that starts with an earlier letter. Pool = the two answers + 1 learned letter | both gaps |
| 5. Gold | Mixed review / first real words | Letter Ordering (from D) or Fruit Slice (A-C) | A-C: short Fruit Slice chain of the new letter among earlier ones. From D: spell a real word from known letters, with a Hebrew meaning prompt | finish the word |

Rules for every rung:
- Hebrew prompts are short, never give away the English answer, and never use phonetic symbols.
- Lowercase in the listening, ordering and slicing games, because the runtime lowercases anyway.
- Distractors come only from letters already taught. Exception: A, which has none yet.
- Confusable pairs appear together only after both are learned: b/d after D, E/F after F, C/G after G, M/N after N,
  I/l/L after L.

### Dosage, so it stays a game
- **About 5 games per letter quest.** Every other task spot gets `none`: the chest opens, the egg is collected, and the
  action itself is the fun.
- **Fun quests** (fun1 raid, fun2 ridge, fun3 stones): no minigames. They are the reward.
- **Homework quests:** one game per delivery, each a mixed review of the block (hw1 = A-D, hw2 = E-H).
- **hw3 bells and hw2 picking** are already letter games, built as choice rounds. They stay as they are.

---

## Part 3 - Mapping onto the valley

**Built 2026-10-01:** the final per-spot plan is `PLAN` in `scripts/abc_valley_task_minigames.py`. It has 70 games
over 17 quests, plus 25 spots deliberately without a game; intro and story spots are left as built. The script
checks every pool, distractor and asset path before it writes anything. The table below was the starting proposal;
differences in the build:

- **G is practised with girl,** matching the "ג" sound Tobias says.
- **K never offers c as a choice,** because Pip teaches that C says ק too.
- **M is practised inside the N quest:** hearing *moon*, tracing M/m and building *man*.
- **The C and F quests end with a short lesson review** (A-C, D-F) on their last spot.
- **hw1 reviews A-D by listening, hw2 reviews E-H with pictures.**
- **Spots where the object hops away or starts a ride get no game.**

Slots = task spots in the quest's task-set steps. INT = spots where the object hops away or starts a ride; they get
no minigame, because the interceptor runs first.

| Quest | Letter, anchor word | Usable slots | Plan |
|---|---|---|---|
| a_shards | A - apple | 5 chests + golden chest | Chests 1-4 = rungs 1-4, chest 5 = none, golden = gold |
| b_weeds | B - bee | weeds 1, 2, 4 (3, 5 INT) + seed | Weeds = rungs 1, 2, 4; seed = rung 3 (trace); gold folds into the hw1 review |
| c_cave | C - cat | 5 lanterns + big candle | Lanterns 1-4 = rungs 1-4, lantern 5 = none, candle = gold |
| d_drum | D - drum / dog | 6 X's + gold X | X 1-4 = rungs, X 5-6 = none, gold X = gold (spell `dad`) |
| hw1_mail | review A-D | 4 deliveries | One Listen & Build per letter, with the word given to that NPC |
| e_eggs | E - egg | 6 eggs + golden egg | Eggs 1-4 = rungs, 5-6 none, golden = `bed` |
| f_shards | F - fish | 6 shards + assemble | Shards 1-4 = rungs, 5-6 none, assemble = `fed` |
| g_tree | G - (see decision 3) | 6 trees | Trees 1-4 = rungs, tree 5 = C/G contrast, tree 6 = `bag` |
| hw2_stand | review E-H | 4 deliveries | One review game per delivery |
| h_waterfall | H - hat | 7 fish spots | Spots 1-4 = rungs, 5-6 none, 7 = `had` |
| i_ice | I - (see decision 3) | 4 ice walls + 2 Mira ice | Walls = rungs, Mira 1 = `big`, Mira 2 = none |
| j_jars | J - jam | jars 1, 3, 5, 7 (2, 4, 6 INT) | Jars = rungs, gold = `jab` in the hw3 slot or skipped |
| k_keys | K - key / kite | 4 key chests + kite 2 + fly | Chests = rungs, kite frame = `kid`, others none |
| l_fireflies | L - light / lemon | swarms 1, 3, 4, 6 (2, 5 INT) + release | Swarms = rungs, release = `lid` |
| m_museum | M - moon | none (museum step) | **No slots.** M is practised in the N quest (decision 4) |
| n_noodles | N - net | 5 ingredients + stir | Ingredients = rungs + M review, stir = `man` |

Audio for "Hear it" exists for most anchor words: apple, bee, cat, dog, drum, egg, fish, hat, ice, key, kite,
lemon, moon, net, girl, gate. Pictures for "Use it" exist for many: Apple, Bee, Cat, Dog, Egg, Fish, Hat, Grapes,
Lemon, Honey, Kiwi, Melon, Onion. Each one is checked before use; a missing asset means a different word, never an
invented path.

---

## Decided (2026-10-01)

- **Teaching dialogue = the valley quests' own NPC dialogue** (in Unity). The Alphabet Adventure dialogue is not
  reused; the games only practise what the valley NPC taught.
- **A lesson covers about 3 letters.**
- **Order: recognise before producing.** Find, hear, trace, use.
- **Pass bars mix easy and real checks.** A guessable round is fine sometimes (e.g. the first 2-choice listening
  in A), but each letter also has real checks (3 choices, 4 catches, b/d traps).
- **Mixed review stays in the homework quests for now.**
- **Samples:** `abc_a_shards` and `abc_d_drum`, authored with `scripts/abc_valley_task_minigames.py` (PLAN) and live
  in the editor. The rest of the valley follows once they are approved.

## Part 4 - Open decisions

1. **Dose:** about 5 games per letter quest (ladder + gold) with the remaining spots empty. Or lighter: 3 rungs
   (find, hear, use) + gold.
2. **Dependency:** Listen & Build and the new Letter Tracing exist only on the Unity branch
   `replace-the-Drawing-with-Kirill-drawing-system` and on QuestSystem `origin/main`. They are not merged into the
   ABC Valley branches yet. Either wait for that merge, or start now with Miner / Matching / Ordering / Slice and add
   Hear it and Trace it after the merge.
3. **Two anchor words to review in the Unity dialogue** (your content, I would not change it myself):
   - **G is taught with "giant".** That is the soft g (j sound). For a first G, a hard g word such as `girl`, `gate`
     or `grapes` matches the "ג" the NPC says. Audio exists for girl and gate.
   - **I is taught with insect and ice together,** two sounds in one lesson. Keep ice in the story but practise the
     short i, or accept the two sounds here.
4. **M has no task spots.** Practise it inside the N quest (M/N contrast) or leave it to the museum.
5. **Cleanup:** delete the leftover `_copy` test instances of The Alphabet Adventure from the database.
