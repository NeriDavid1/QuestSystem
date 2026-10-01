#!/usr/bin/env python3
"""Author the letter-ladder minigames of ABC Valley custom steps (see agents/brief_abc_valley_letters.md).

PLAN maps quest -> objective index -> task index -> a minigame instance (or "none"). Running the script:

  1. writes the instances into _registry/minigame_instances/abc_valley.yaml,
  2. sets tasks[].mode / minigame_id / instance_key in questlines/abc_valley/<quest>.yaml,
  3. with --sql PATH, writes SQL that upserts those instances and updates only the planned quests' custom
     steps in the live database (the rest of the line is untouched).

Tasks not in PLAN keep `mode: scene`. Unity gets the choices through "Sync Custom Step Minigames"; after
that, unity_to_yaml.py --line abc_valley reads them back from QuestObjectiveDefinition.taskMiniGames.

    python scripts/abc_valley_task_minigames.py --sql reports/_abc_valley_live/task_minigames
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import OrderedDict
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))

from unity_to_yaml import load_yaml, write_yaml  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
LINE = "abc_valley"
INSTANCES_PATH = ROOT / "_registry" / "minigame_instances" / f"{LINE}.yaml"
WORDS_AUDIO = "_OurAssets/Art/Audio/Voice/Words"
PICTURES = "Art/Sprites/LineMatch/Words"

NONE = "none"


# ---- instance builders (one per ladder rung) --------------------------------


def find_it(letter: str, distractors: list[str], required: int, prompt: str) -> dict[str, Any]:
    """Rung 1: catch both forms of the letter in the Dwarf Miner."""
    return {
        "minigame_id": "dwarf_miner",
        "instruction": prompt,
        "target": f"{letter.upper()}, {letter.lower()}",
        "variant": "word_category",
        "success": f"מצאתם את {letter.upper()} בשתי הצורות שלה.",
        "params": {
            "prompt": prompt,
            "categoryLabel": f"האות {letter.upper()}",
            "targetWords": [letter.upper(), letter.lower()],
            "distractorWords": distractors,
            "requiredCorrect": required,
            "allowedMistakes": 3,
        },
    }


def hear_it(target: str, audio: str, distractors: list[str], prompt: str, success: str) -> dict[str, Any]:
    """Rung 2 (and gold words): hear a recorded word, build its first letter or the whole word."""
    return {
        "minigame_id": "listening_letter_ordering",
        "instruction": prompt,
        "target": target,
        "variant": "listening_spelling",
        "success": success,
        "params": {
            "prompt": prompt,
            "targetWord": target,
            "promptAudio": audio,
            "hintMode": "AudioOnly",
            # Equal to the custom pool: no random unknown letters are added.
            "extraDistractorCount": len(distractors),
            "customDistractors": distractors,
        },
    }


def trace_it(symbols: list[str], instruction: str) -> dict[str, Any]:
    """Rung 3: trace the letter forms (one round per symbol, case kept)."""
    return {
        "minigame_id": "letter_drawing",
        "instruction": instruction,
        "target": ", ".join(symbols),
        "variant": "trace_guided",
        "success": "ציירתם לפי הדוגמה.",
        "params": {"symbols": symbols},
    }


def use_it(words: list[tuple[str, str]], pool: list[str]) -> dict[str, Any]:
    """Rung 4: complete the first letter of picture words. `pool` is already shuffled."""
    instruction = "השלימו את האות החסרה בתחילת כל מילה. התמונה עוזרת."
    return {
        "minigame_id": "word_matching",
        "instruction": instruction,
        "target": ", ".join(word for word, _ in words),
        "variant": "missing_letter_matching",
        "success": "השלמתם את האות הראשונה בכל מילה.",
        "params": {
            "letters": [{"id": f"tile_{i + 1}", "value": value} for i, value in enumerate(pool)],
            "wordTasks": [
                {"id": f"word_{i + 1}", "fullWord": word, "missingIndices": [0], "image": f"{PICTURES}/{picture}"}
                for i, (word, picture) in enumerate(words)
            ],
        },
    }


FIRST_SOUND = "הקשיבו למילה. באיזו אות היא מתחילה?"
LOOK_ALIKE = "היזהרו מאותיות שדומות לה."
TRACE_BOTH = "ציירו את האות לפי הקווים - פעם גדולה ופעם קטנה."


def word(name: str) -> str:
    return f"{WORDS_AUDIO}/{name}.mp3"


def find_letter(letter: str, distractors: list[str]) -> dict[str, Any]:
    return find_it(letter, distractors, 4, f"אספו רק את האות {letter.upper()} - גדולה וקטנה. {LOOK_ALIKE}")


def first_sound(letter: str, audio_word: str, distractors: list[str]) -> dict[str, Any]:
    return hear_it(letter, word(audio_word), distractors, FIRST_SOUND, f"שמעתם את {letter.upper()} בתחילת המילה.")


def build_word(target: str, meaning: str, distractors: list[str]) -> dict[str, Any]:
    """Gold: hear a real word made only of learned letters and build it."""
    return hear_it(target, word(target), distractors, f"הקשיבו ובנו את המילה {meaning} באנגלית.",
                   f"בניתם את המילה {target}.")


def spell_word(target: str, meaning: str, distractors: list[str]) -> dict[str, Any]:
    """Gold without a recording: spell a real word of learned letters from its Hebrew meaning."""
    prompt = f"סדרו את האותיות וכתבו את המילה {meaning} באנגלית."
    return {
        "minigame_id": "letter_ordering",
        "instruction": prompt,
        "target": target,
        "variant": "word_spelling",
        "success": f"כתבתם את המילה {target}.",
        "params": {"prompt": prompt, "targetWord": target, "extraDistractorCount": len(distractors),
                   "customDistractors": distractors},
    }


A = ("Apple", "Food/Fruit/Apple.png")
ANT = ("Ant", "Animal/Ant.png")
BEE = ("Bee", "Animal/Bee.png")
BANANA = ("Banana", "Food/Fruit/Banana.png")
CAT = ("Cat", "Animal/Cat.png")
DOG = ("Dog", "Animal/Dog.png")
DOLL = ("Doll", "Doll.png")
EGG = ("Egg", "Egg.png")
FISH = ("Fish", "Animal/Fish.png")
GRAPES = ("Grapes", "Food/Fruit/Grapes.png")
HAT = ("Hat", "Hat.png")
JAM = ("Jam", "Food/Sweets/Jam.png")
KIWI = ("Kiwi", "Food/Fruit/Kiwi.png")
LEMON = ("Lemon", "Food/Fruit/Lemon.png")


def pictures(*items: tuple[str, str]) -> list[tuple[str, str]]:
    return [(name.lower(), path) for name, path in items]


# quest -> objective index -> task index -> instance or NONE.
# Not listed: the task keeps its scene setup (`scene`); no-minigame and story spots stay as built.
# Distractors are letters already taught (A has none yet). Pools are ordered so no letter sits opposite its word.
PLAN: dict[str, dict[int, dict[int, Any]]] = {
    # A - Tobias: two sides meeting at the peak with a path in the middle; "אַ... apple".
    # First letter ever: no learned letters yet, so foils are clearly different shapes (O, S).
    # Chest 2 is a 2-choice warm-up (a guess is fine here); the golden chest is the real 3-choice check.
    "abc_a_shards": {
        1: {
            0: find_it("a", ["O", "S"], 3, "אספו רק את האות A - גם A גדולה וגם a קטנה."),
            1: hear_it("a", f"{WORDS_AUDIO}/apple.mp3", ["s"], FIRST_SOUND, "שמעתם את A בתחילת המילה."),
            2: trace_it(["A", "a"], "ציירו את האות לפי הקווים - פעם גדולה ופעם קטנה."),
            3: NONE,
            4: use_it([("ant", "Animal/Ant.png"), ("apple", "Food/Fruit/Apple.png")], ["o", "a", "a"]),
        },
        4: {
            0: hear_it("a", f"{WORDS_AUDIO}/ant.mp3", ["o", "s"], "הקשיבו למילה חדשה. באיזו אות היא מתחילה?",
                       "זיהיתם את A גם במילה חדשה."),
        },
    },
    # D - Pip: a straight line and a big round belly, a drum from the side; "ד-ד-ד... drum".
    # A, B, C are known: b is the foil that matters (b/d), c and C keep the choice honest.
    # The gold X is the first real word, built only from learned letters: dad.
    "abc_d_drum": {
        1: {
            0: find_it("d", ["B", "b", "C", "c"], 4, "אספו רק את האות D - גדולה וקטנה. היזהרו מאותיות שדומות לה."),
            1: hear_it("d", f"{WORDS_AUDIO}/drum.mp3", ["b", "c"], FIRST_SOUND, "שמעתם את D בתחילת המילה."),
            2: NONE,
            3: trace_it(["D", "d", "b", "d"], "ציירו D גדולה ו-d קטנה, ואחר כך b ו-d. שימו לב לאיזה צד הבטן פונה."),
            4: NONE,
            5: use_it(pictures(DOG, BEE), ["b", "c", "d"]),
        },
        2: {
            0: hear_it("dad", "_OurAssets/Art/Audio/Museum sounds/SOUNDS FOR MUSEUM new/DAD.mp3", ["b", "c"],
                       "הקשיבו ובנו את המילה אבא באנגלית.", "בניתם את המילה הראשונה שלכם: dad."),
        },
    },
    # B - Bruno: a straight line and two bellies; "בּ, כמו bee". Weeds 3 and 5 hop away (no game).
    "abc_b_weeds": {
        1: {
            0: find_it("b", ["A", "a"], 3, "אספו רק את האות B - גדולה וקטנה."),
            1: first_sound("b", "bee", ["a", "o"]),
            2: NONE,
            3: use_it(pictures(BEE, A), ["a", "b", "o"]),
            4: NONE,
        },
        2: {0: trace_it(["B", "b"], TRACE_BOTH)},
    },
    # C - Noa: a circle open on one side; "ק, כמו cave / candle". The big candle closes lesson 1 (A-C).
    "abc_c_cave": {
        1: {
            0: find_letter("c", ["A", "a", "B", "b"]),
            1: first_sound("c", "candle", ["a", "b"]),
            2: trace_it(["C", "c"], TRACE_BOTH),
            3: NONE,
            4: use_it(pictures(CAT, A), ["a", "b", "c"]),
        },
        2: {0: use_it(pictures(A, BANANA, CAT), ["c", "a", "b"])},
    },
    # Homework 1 - review A-D: every delivered letter is one listening round with all four letters.
    "abc_hw1_mail": {
        1: {
            0: first_sound("a", "apple", ["b", "c", "d"]),
            1: first_sound("b", "ball", ["d", "a", "c"]),
            2: first_sound("c", "cat", ["a", "d", "b"]),
            3: first_sound("d", "dog", ["b", "a", "c"]),
        },
    },
    # E - Tobias: one wall and three shelves (the coop); "אֶ, כמו egg". Golden egg: spell bed (no recording).
    "abc_e_eggs": {
        1: {
            0: find_letter("e", ["C", "c", "A", "a"]),
            1: first_sound("e", "egg", ["a", "d"]),
            2: trace_it(["E", "e"], TRACE_BOTH),
            3: NONE,
            4: use_it(pictures(EGG, DOLL), ["d", "a", "e"]),
            5: NONE,
        },
        2: {0: spell_word("bed", "מיטה", ["a", "c"])},
    },
    # F - Mira: like E without the bottom shelf; "ףףף... כמו fire". Assembling the A closes lesson 2 (D-F).
    "abc_f_shards": {
        1: {
            0: find_letter("f", ["E", "e", "D", "d"]),
            1: first_sound("f", "fire", ["e", "d"]),
            2: trace_it(["F", "f", "E", "e"], "ציירו F ו-f, ואחר כך E ו-e. שימו לב למדף התחתון."),
            3: NONE,
            4: use_it(pictures(FISH, EGG), ["e", "c", "f"]),
            5: NONE,
        },
        2: {0: use_it(pictures(DOG, EGG, FISH), ["e", "f", "b", "d"])},
    },
    # G - Tobias: like C with a little table inside; "ג". Practised with girl (the ג sound). Tree 6: build bag.
    "abc_g_tree": {
        1: {
            0: find_letter("g", ["C", "c", "B", "b"]),
            1: first_sound("g", "girl", ["c", "d"]),
            2: trace_it(["G", "g", "C", "c"], "ציירו G ו-g, ואחר כך C ו-c. שימו לב לשולחן הקטן של G."),
            3: NONE,
            4: use_it(pictures(GRAPES, CAT), ["c", "d", "g"]),
            5: build_word("bag", "תיק", ["d", "c"]),
        },
    },
    # Fun quest: the summit chest is a reward, no game.
    "abc_fun2_ridge": {3: {0: NONE}},
    # H - Pip: a ladder with one rung; "הָה... כמו hat". Seven fishing spots: five games, two free.
    "abc_h_waterfall": {
        1: {
            0: find_letter("h", ["B", "b", "D", "d"]),
            1: first_sound("h", "hat", ["b", "f"]),
            2: trace_it(["H", "h"], TRACE_BOTH),
            3: NONE,
            4: use_it(pictures(HAT, DOG), ["d", "b", "h"]),
            5: NONE,
            6: first_sound("h", "horse", ["b", "d", "f"]),
        },
    },
    # Homework 2 - review E-H: each delivered item is its picture with the first letter missing.
    "abc_hw2_stand": {
        2: {
            0: use_it(pictures(EGG), ["a", "e", "f"]),
            1: use_it(pictures(FISH), ["h", "f", "e"]),
            2: use_it(pictures(GRAPES), ["c", "h", "g"]),
            3: use_it(pictures(HAT), ["b", "h", "f"]),
        },
    },
    # I - Pip: one straight line; "אִ ... ice says its own name". Mira's first block: build big.
    "abc_i_ice": {
        1: {
            0: find_letter("i", ["H", "h", "F", "f"]),
            1: first_sound("i", "ice", ["a", "e"]),
            2: trace_it(["I", "i"], TRACE_BOTH),
            3: NONE,
        },
        2: {0: build_word("big", "גדול", ["d", "e"]), 1: NONE},
    },
    # J - Bruno: a line that curls down (a hook); "ג', כמו jump". Jars 2, 4 and 6 hop away (no game).
    "abc_j_jars": {
        1: {
            0: find_letter("j", ["I", "i", "G", "g"]),
            1: NONE,
            2: first_sound("j", "jump", ["d", "i"]),
            3: NONE,
            4: trace_it(["J", "j"], TRACE_BOTH),
            5: NONE,
            6: use_it(pictures(JAM, GRAPES), ["g", "i", "j"]),
        },
    },
    # K - Pip: a line and two arms (a kite); "ק, כמו key". c is never a choice: Pip teaches that C says ק too.
    "abc_k_keys": {
        1: {
            0: find_letter("k", ["H", "h", "F", "f"]),
            1: first_sound("k", "key", ["h", "g"]),
            2: trace_it(["K", "k"], TRACE_BOTH),
            3: use_it(pictures(KIWI, HAT), ["h", "f", "k"]),
        },
        4: {0: build_word("kid", "ילד", ["h", "b"]), 1: NONE},
        5: {0: NONE},
    },
    # Fun quest: the treasure is a reward, no game.
    "abc_fun3_stones": {2: {0: NONE}},
    # L - Noa: thumb and finger, a line and a leg; "ל, כמו light". Swarms 2 and 5 fly off (no game).
    "abc_l_fireflies": {
        1: {
            0: find_letter("l", ["I", "i", "J", "j"]),
            1: NONE,
            2: first_sound("l", "light", ["i", "h"]),
            3: trace_it(["L", "l", "I", "i"], "ציירו L ו-l, ואחר כך I ו-i. שימו לב: l קטנה היא קו ארוך."),
            4: NONE,
            5: use_it(pictures(LEMON, KIWI), ["k", "i", "l"]),
        },
        2: {0: build_word("like", "אוהב", ["j", "h"])},
    },
    # N - Bruno: like M that gave up one mountain; "נ, כמו noodles". M has no task spots (museum),
    # so M is practised here too; the stir builds man (m + a + n).
    "abc_n_noodles": {
        1: {
            0: find_letter("n", ["M", "m", "H", "h"]),
            1: first_sound("n", "net", ["m", "h"]),
            2: trace_it(["N", "n", "M", "m"], "ציירו N ו-n, ואחר כך M ו-m. ספרו את ההרים."),
            3: first_sound("m", "moon", ["n", "b"]),
            4: NONE,
        },
        2: {0: build_word("man", "איש", ["h", "e"])},
    },
}


UNITY_OUR_ASSETS = Path(r"C:\Users\123ne\source\repos\Animal-English-World\English Kingdom\Assets\_OurAssets")


def check(key: str, spec: dict[str, Any]) -> list[str]:
    """Answer letters are offered, distractors never repeat an answer letter, and every asset path exists."""
    params, problems = spec["params"], []
    game = spec["minigame_id"]
    if game in ("listening_letter_ordering", "letter_ordering"):
        if set(params["customDistractors"]) & set(params["targetWord"]):
            problems.append("a distractor is also in the target word")
        if params["extraDistractorCount"] != len(params["customDistractors"]):
            problems.append("extraDistractorCount must equal the custom pool")
    if game == "word_matching":
        pool = [letter["value"] for letter in params["letters"]]
        for task in params["wordTasks"]:
            needed = task["fullWord"][0]
            if needed not in pool:
                problems.append(f"{task['fullWord']}: '{needed}' is not in the pool")
        answers = [task["fullWord"][0] for task in params["wordTasks"]]
        if len(set(pool)) == len(pool) and len(answers) == len(set(answers)):
            for row, task in enumerate(params["wordTasks"]):
                if row < len(pool) and pool[row] == task["fullWord"][0]:
                    problems.append(f"{task['fullWord']}: its letter sits opposite it")
    if game == "dwarf_miner" and set(params["targetWords"]) & set(params["distractorWords"]):
        problems.append("targets and distractors overlap")
    if UNITY_OUR_ASSETS.is_dir():
        paths = [params.get("promptAudio")] + [task.get("image") for task in params.get("wordTasks", [])]
        for path in filter(None, paths):
            relative = path.removeprefix("_OurAssets/")
            if not (UNITY_OUR_ASSETS / relative).is_file():
                problems.append(f"missing asset {path}")
    return [f"{key}: {problem}" for problem in problems]


def instance_key(quest: str, objective: int, task: int) -> str:
    return f"{LINE}__{quest}__o{objective}_t{task}"


def ordered_instance(spec: dict[str, Any]) -> "OrderedDict[str, Any]":
    entry: "OrderedDict[str, Any]" = OrderedDict()
    entry["minigame_id"] = spec["minigame_id"]
    entry["instruction"] = spec["instruction"]
    entry["tasks"] = [spec["instruction"]]
    entry["target"] = spec["target"]
    entry["variant"] = spec["variant"]
    entry["success"] = spec["success"]
    entry["params"] = spec["params"]
    return entry


def plan_tasks(quest: str) -> list[tuple[int, int]]:
    return [(objective, task) for objective, tasks in PLAN[quest].items() for task in tasks]


def seen_tasks(quest_doc: dict[str, Any]) -> set[tuple[int, int]]:
    return {
        (int(step["unity_objective_index"]), int(task["index"]))
        for step in quest_doc.get("steps") or []
        if step.get("type") == "custom" and step.get("reactor") == "task_set"
        for task in step.get("tasks") or []
    }


def apply(quests: list[str]) -> dict[str, "OrderedDict[str, Any]"]:
    doc = load_yaml(INSTANCES_PATH)
    instances: "OrderedDict[str, Any]" = OrderedDict(sorted((doc.get("instances") or {}).items()))
    written: dict[str, OrderedDict[str, Any]] = {}

    for quest in quests:
        quest_path = ROOT / "questlines" / LINE / f"{quest}.yaml"
        quest_doc = load_yaml(quest_path)
        for step in quest_doc.get("steps") or []:
            if step.get("type") != "custom" or step.get("reactor") != "task_set":
                continue
            plan = PLAN[quest].get(int(step["unity_objective_index"]), {})
            for task in step.get("tasks") or []:
                for field in ("minigame_id", "instance_key"):
                    task.pop(field, None)
                choice = plan.get(int(task["index"]))
                if choice is None:
                    task["mode"] = "scene"
                elif choice == NONE:
                    task["mode"] = "none"
                else:
                    key = instance_key(quest, int(step["unity_objective_index"]), int(task["index"]))
                    if task.get("intercepted"):
                        raise SystemExit(f"{quest} {key}: intercepted spot cannot play a minigame")
                    problems = check(key, choice)
                    if problems:
                        raise SystemExit("\n".join(problems))
                    task["mode"] = "minigame"
                    task["minigame_id"] = choice["minigame_id"]
                    task["instance_key"] = key
                    instances[key] = written[key] = ordered_instance(choice)
        unused = set(plan_tasks(quest)) - seen_tasks(quest_doc)
        if unused:
            raise SystemExit(f"{quest}: PLAN names tasks the quest does not have: {sorted(unused)}")
        write_yaml(quest_path, quest_doc)

    write_yaml(
        INSTANCES_PATH,
        {"instances": OrderedDict(sorted(instances.items()))},
        [f"Per-step minigame briefs — {LINE}", "`minigame_id` is the catalog kind; `params` mirrors the Unity Data SO fields."],
    )
    return written


def sql_text(value: Any) -> str:
    return "'" + str(value).replace("'", "''") + "'"


def live_sql(quests: list[str], written: dict[str, OrderedDict[str, Any]]) -> str:
    """Upsert the planned instances, then rewrite the planned quests' custom step payloads from the YAML."""
    import import_yaml_to_supabase as importer  # noqa: PLC0415 - heavy import only for --sql

    bundle = importer.build_bundle()
    line = next(line for line in bundle["questlines"] if line["key"] == LINE)
    rows = [
        {"key": key, "locale": "he", "instruction": entry["instruction"], "tasks": entry["tasks"],
         "target": entry["target"], "variant": entry["variant"], "success": entry["success"],
         "minigame_id": entry["minigame_id"], "params": entry["params"],
         "source_path": str(INSTANCES_PATH.relative_to(ROOT)), "source_metadata": {}}
        for key, entry in written.items()
    ]
    # One upsert per quest keeps every statement small enough for the database tool.
    statements = [
        importer.insert_minigames_sql({"minigame_instances": [row for row in rows if f"__{quest}__" in row["key"]]}).strip()
        for quest in quests
        if any(f"__{quest}__" in row["key"] for row in rows)
    ]
    for quest in line["quests"]:
        if quest["key"] not in quests:
            continue
        for step in quest["steps"]:
            if step["type"] != "custom":
                continue
            statements.append(
                "update public.quest_steps set payload = "
                f"{sql_text(json.dumps(step['payload'], ensure_ascii=False, sort_keys=True))}::jsonb, updated_at = now() "
                f"where key = {sql_text(step['key'])} and quest_id = {importer.quest_lookup(LINE, quest['key'])};"
            )
    return "\n".join(statements) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--quests", nargs="+", default=sorted(PLAN), choices=sorted(PLAN))
    parser.add_argument("--sql", type=Path, help="Also write SQL for the live database into this folder (~20 KB chunks).")
    args = parser.parse_args()

    written = apply(args.quests)
    print(f"{len(written)} minigame instances for {', '.join(args.quests)}")
    if args.sql:
        import import_yaml_to_supabase as importer  # noqa: PLC0415

        args.sql.mkdir(parents=True, exist_ok=True)
        for old in args.sql.glob("*.sql"):
            old.unlink()
        chunks = importer.split_sql_statements(live_sql(args.quests, written), max_chars=20000)
        for index, chunk in enumerate(chunks, start=1):
            (args.sql / f"{index:02d}.sql").write_text(chunk, encoding="utf-8")
        print(f"sql: {args.sql} ({len(chunks)} files)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
