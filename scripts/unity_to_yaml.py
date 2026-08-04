#!/usr/bin/env python3
"""Export the live Unity QuestSystem assets back into the YAML authoring source.

Reads the OpenWorld catalogs, QuestLine registry, every QuestDefinitionSO and the
referenced minigame config/data, DialogueNode and RewardDefinitionSO assets, then
regenerates the YAML authoring files that feed the Supabase seed pipeline:

  questlines/<line>/_index.yaml            quest ordering + line metadata
  questlines/<line>/qNN_<quest_id>.yaml    quest detail (rewards + steps)
  _registry/minigame_instances/<line>.yaml full-fidelity params per play step
  _registry/dialogues/<line>.yaml          dialogue scripts referenced by steps
  _registry/npcs.yaml / areas.yaml / interactables.yaml   catalog entries

Authoring files for questlines that no longer exist in Unity are pruned
(questlines/<line>/, minigame instances and dialogue files used only by those
lines).

Run from the repository root:

    python scripts/unity_to_yaml.py [--unity-root PATH] [--root PATH]
"""

from __future__ import annotations

import argparse
import re
import shutil
import sys
from collections import OrderedDict
from pathlib import Path
from typing import Any

import yaml


def make_dumper() -> type[yaml.SafeDumper]:
    class IndentDumper(yaml.SafeDumper):
        def increase_indent(self, flow: bool = False, indentless: bool = False) -> str:
            return super().increase_indent(flow, False)

    return IndentDumper


INDENT_DUMPER = make_dumper()


def _represent_ordered_dict(dumper: yaml.SafeDumper, data: "OrderedDict[str, Any]") -> Any:
    return dumper.represent_dict(list(data.items()))


INDENT_DUMPER.add_representer(OrderedDict, _represent_ordered_dict)

REPO_ROOT = Path(__file__).resolve().parent.parent
REGISTRY = REPO_ROOT / "_registry"
QUESTLINES_DIR = REPO_ROOT / "questlines"

DEFAULT_UNITY_ROOT = Path(
    r"C:\Users\123ne\source\repos\Animal-English-World\English Kingdom\Assets\_OurAssets"
)

# Folders (relative to the Unity root) that can be referenced from quest
# definitions. Scanning these .meta files builds the GUID -> asset path index.
INDEX_ROOTS = (
    "Data/Quests",
    "Data/MiniGames",
    "Art/Prefabs/UI/GamePlay/MiniGame",
)

CATALOG_PATHS = {
    "npcs": "Data/Quests/Lines/OpenWorld/Catalogs/NpcCatalog_OpenWorld.asset",
    "areas": "Data/Quests/Lines/OpenWorld/Catalogs/AreaCatalog_OpenWorld.asset",
    "interactables": "Data/Quests/Lines/OpenWorld/Catalogs/InteractableCatalog_OpenWorld.asset",
}

INTERACTABLE_KIND = {0: "collectible", 1: "minigame", 2: "custom"}

# Unity data-SO asset name prefix -> minigame type (used to derive instance keys).
DATA_PREFIX_TO_MINIGAME = OrderedDict(
    (
        ("LetterOrderingData_", "letter_ordering"),
        ("WordOrderingData_", "word_ordering"),
        ("SpeakAloudData_", "speak_aloud"),
        ("MissingLetterMatchingData_", "word_matching"),
        ("OppositeMatchingData_", "word_matching"),
    )
)

CONFIG_CLASS_TO_MINIGAME = {
    "LetterOrderingQuestConfigSO": "letter_ordering",
    "WordOrderingQuestConfigSO": "word_ordering",
    "SpeakAloudQuestConfigSO": "speak_aloud",
    "LineMatchQuestConfigSO": "word_matching",
}

MINIGAME_VARIANT = {
    "letter_ordering": "word_spelling",
    "word_ordering": "sentence_building",
    "word_matching": "missing_letter_matching",
    "speak_aloud": "single_word",
}

# Unity QuestObjectiveType -> YAML step type
OBJECTIVE_TO_STEP = {
    1: "reach_location",
    3: "play_minigame",
    4: "deliver_item",
}

CATALOG_HEADER = {
    "npcs": [
        "NPC registry exported from Unity NpcCatalog_OpenWorld.",
        "Use the key as npc_id in quest steps (not the display name).",
    ],
    "areas": [
        "Area registry exported from Unity AreaCatalog_OpenWorld.",
        "Use these exact id values in reach_location.location_id.",
    ],
    "interactables": [
        "Interactable registry exported from Unity InteractableCatalog_OpenWorld.",
        "play_minigame.world_object_id must be a world station gameId.",
    ],
}


# --------------------------------------------------------------------------- #
# YAML / Unity helpers
# --------------------------------------------------------------------------- #


def load_yaml(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    with path.open(encoding="utf-8") as handle:
        return yaml.safe_load(handle) or {}


def load_unity_yaml(path: Path) -> dict[str, Any]:
    """Parse a Unity .asset YAML document (strips %TAG and the tagged header)."""
    lines: list[str] = []
    with path.open(encoding="utf-8-sig") as handle:
        for line in handle:
            stripped = line.rstrip("\r\n")
            if stripped.startswith("%TAG"):
                continue
            if stripped.startswith("---"):
                stripped = "---"
            lines.append(stripped)
    doc = yaml.safe_load("\n".join(lines))
    if not isinstance(doc, dict):
        return {}
    mono = doc.get("MonoBehaviour")
    return mono if isinstance(mono, dict) else {}


def guid_of(ref: Any) -> str | None:
    if isinstance(ref, dict):
        return ref.get("guid") or None
    return None


def build_guid_index(unity_root: Path) -> dict[str, Path]:
    index: dict[str, Path] = {}
    for relative in INDEX_ROOTS:
        root = unity_root / relative
        if not root.is_dir():
            continue
        for meta in root.rglob("*.meta"):
            try:
                text = meta.read_text(encoding="utf-8", errors="ignore")
            except OSError:
                continue
            match = re.search(r"^guid:\s*([0-9a-fA-F]{32})\s*$", text, re.MULTILINE)
            if match:
                index[match.group(1).lower()] = meta.parent / meta.stem
    return index


def resolve_path(guid_index: dict[str, Path], unity_root: Path, guid: str | None) -> str:
    if not guid:
        return ""
    target = guid_index.get(guid.lower())
    if not target:
        return ""
    try:
        return target.relative_to(unity_root).as_posix()
    except ValueError:
        return target.as_posix()


def decode_int_array(value: Any) -> list[int]:
    """Decode Unity's hex-serialized int array (4-byte LE count + int32 values)."""
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, int):
        return [value]
    text = str(value).strip()
    if not text:
        return []
    try:
        blob = bytes.fromhex(text)
    except ValueError:
        return []
    if len(blob) < 4:
        return []
    count = int.from_bytes(blob[:4], "little")
    result: list[int] = []
    for i in range(count):
        offset = 4 + i * 4
        if offset + 4 > len(blob):
            break
        result.append(int.from_bytes(blob[offset : offset + 4], "little"))
    return result


def to_int(value: Any) -> int | Any:
    try:
        return int(value)
    except (TypeError, ValueError):
        return value


def parse_catalog(path: Path) -> list[dict[str, Any]]:
    data = load_unity_yaml(path)
    return [entry for entry in (data.get("entries") or []) if isinstance(entry, dict)]


# --------------------------------------------------------------------------- #
# Items / rewards
# --------------------------------------------------------------------------- #


def merged_items() -> dict[str, Any]:
    result: dict[str, Any] = {}
    for source_path, section in (
        (REGISTRY / "softkitty_items.yaml", "softkitty_items"),
        (REGISTRY / "items.yaml", "items"),
    ):
        raw = load_yaml(source_path).get(section) or {}
        for entry_id, metadata in raw.items():
            result.setdefault(str(entry_id), {}).update(metadata) if isinstance(metadata, dict) else None
    return result


def build_item_reverse(items: dict[str, Any]) -> dict[int, str]:
    reverse: dict[int, str] = {}
    for key, metadata in items.items():
        if isinstance(metadata, dict):
            softkitty_id = metadata.get("softkitty_id")
            if softkitty_id is not None:
                try:
                    reverse[int(softkitty_id)] = str(key)
                except (TypeError, ValueError):
                    pass
    return reverse


def item_key(item_id: Any, item_keys: set[str], reverse: dict[int, str]) -> str:
    if isinstance(item_id, str) and item_id in item_keys:
        return item_id
    try:
        numeric = int(item_id)
    except (TypeError, ValueError):
        return str(item_id)
    return reverse.get(numeric, str(item_id))


def parse_reward_bundle(path: Path, key_fn: Any) -> list[dict[str, Any]]:
    data = load_unity_yaml(path)
    bundle = data.get("bundle") or {}
    rewards: list[dict[str, Any]] = []
    for item in bundle.get("items") or []:
        if isinstance(item, dict) and item.get("itemId") is not None:
            rewards.append(
                {
                    "id": key_fn(item["itemId"]),
                    "amount": int(item.get("count") or 1),
                }
            )
    for coin in bundle.get("legacyCoins") or []:
        if isinstance(coin, dict):
            rewards.append({"id": "coin", "amount": int(coin.get("amount") or 1)})
    for _ability in bundle.get("abilities") or []:
        rewards.append({"id": "slash_ability", "amount": 1})
    return rewards


# --------------------------------------------------------------------------- #
# Minigame config / data
# --------------------------------------------------------------------------- #


def minigame_type_for_config(config_data: dict[str, Any]) -> str | None:
    identifier = config_data.get("m_EditorClassIdentifier") or ""
    for class_name, minigame_id in CONFIG_CLASS_TO_MINIGAME.items():
        if class_name in identifier:
            return minigame_id
    return None


def instance_key_for_data(data_name: str) -> str:
    for prefix in DATA_PREFIX_TO_MINIGAME:
        if data_name.startswith(prefix):
            return data_name[len(prefix) :]
    return data_name


def extract_params(
    minigame_id: str,
    data: dict[str, Any],
    guid_index: dict[str, Path],
    unity_root: Path,
    content_fields: dict[str, list[str]],
) -> "OrderedDict[str, Any]":
    params: "OrderedDict[str, Any]" = OrderedDict()
    fields = content_fields.get(minigame_id) or []
    if minigame_id in ("letter_ordering", "word_ordering", "speak_aloud"):
        for field in fields:
            if field in ("wordRevealDatabase", "referenceClip"):
                params[field] = resolve_path(guid_index, unity_root, guid_of(data.get(field)))
            elif field == "allowFuzzyMatch":
                params[field] = bool(data.get(field))
            elif field == "silenceTimeoutSeconds":
                params[field] = data.get(field) if data.get(field) is not None else 0
            elif field in ("extraDistractorCount",):
                params[field] = int(data.get(field) or 0)
            elif field == "preFilledIndices":
                params[field] = decode_int_array(data.get(field))
            elif field in ("customDistractors", "englishWordsInOrder", "distractorWords"):
                params[field] = data.get(field) or []
            else:
                params[field] = data.get(field)
    elif minigame_id == "word_matching":
        letters = []
        for letter in data.get("letters") or []:
            if isinstance(letter, dict):
                letters.append(
                    {
                        "id": str(letter.get("id") or ""),
                        "value": str(letter.get("value") or ""),
                    }
                )
        tasks = []
        for task in data.get("wordTasks") or []:
            if isinstance(task, dict):
                image_ref = task.get("image")
                image = "" if not isinstance(image_ref, dict) else resolve_path(guid_index, unity_root, guid_of(image_ref))
                tasks.append(
                    {
                        "id": str(task.get("id") or ""),
                        "image": image,
                        "fullWord": str(task.get("fullWord") or ""),
                        "missingIndices": decode_int_array(task.get("missingIndices")),
                    }
                )
        params["letters"] = letters
        params["wordTasks"] = tasks
    return params


def default_brief(
    minigame_id: str,
    data: dict[str, Any],
    params: "OrderedDict[str, Any]",
) -> dict[str, Any]:
    instruction = str(data.get("prompt") or "")
    if minigame_id == "letter_ordering":
        target = str(params.get("targetWord") or "")
        success = f"{target.upper()} נכתב נכון"
    elif minigame_id == "speak_aloud":
        words = [str(word) for word in (params.get("targetWords") or [])]
        target = ", ".join(words)
        success = "המילים נקלטו"
    elif minigame_id == "word_ordering":
        words = [str(word) for word in (params.get("englishWordsInOrder") or [])]
        target = " ".join(words) + ("." if words else "")
        success = "המשפט סודר נכון"
    elif minigame_id == "word_matching":
        words = [
            str(task.get("fullWord"))
            for task in (params.get("wordTasks") or [])
            if isinstance(task, dict) and task.get("fullWord")
        ]
        target = ", ".join(words)
        success = "המילים הושלמו"
    else:
        target = ""
        success = "המשחק הושלם"
    return {
        "instruction": instruction,
        "tasks": [instruction] if instruction else [],
        "target": target,
        "variant": MINIGAME_VARIANT.get(minigame_id, "word_spelling"),
        "success": success,
    }


# --------------------------------------------------------------------------- #
# Quest definitions
# --------------------------------------------------------------------------- #


def parse_quest(
    asset: Path,
    unity_root: Path,
    guid_index: dict[str, Path],
    item_keys: set[str],
    item_reverse: dict[int, str],
) -> dict[str, Any] | None:
    data = load_unity_yaml(asset)
    quest_id = data.get("id")
    if not quest_id:
        return None
    rewards = data.get("rewards") or {}
    reward_items: list[dict[str, Any]] = []
    for item in rewards.get("items") or []:
        if isinstance(item, dict) and item.get("itemId") is not None:
            reward_items.append(
                {
                    "id": item_key(item["itemId"], item_keys, item_reverse),
                    "amount": int(item.get("amount") or 1),
                }
            )
    reward_def_guid = guid_of(data.get("rewardDefinition"))
    if reward_def_guid:
        reward_path = guid_index.get(reward_def_guid.lower())
        if reward_path:
            reward_items.extend(
                parse_reward_bundle(reward_path, lambda value: item_key(value, item_keys, item_reverse))
            )
    return {
        "path": asset,
        "id": quest_id,
        "displayName": data.get("displayName"),
        "levelRequired": int(data.get("levelRequired") or 0),
        "giverNpcId": data.get("giverNpcId"),
        "prerequisiteQuestId": (str(data.get("prerequisiteQuestId") or "")).strip() or None,
        "waitForNpcTurnIn": bool(data.get("waitForNpcTurnIn")),
        "rewards": {
            "xp": int(rewards.get("xp") or 0),
            "items": reward_items,
        },
        "startDialogue": data.get("startDialogue"),
        "turnInDialogue": data.get("turnInDialogue"),
        "objectives": data.get("objectives") or [],
    }


def build_steps(
    quest: dict[str, Any],
    unity_root: Path,
    guid_index: dict[str, Path],
    instances: dict[str, dict[str, Any]],
    dialogues: "OrderedDict[str, dict[str, Any]]",
    item_keys: set[str],
    item_reverse: dict[int, str],
) -> list["OrderedDict[str, Any]"]:
    steps: list["OrderedDict[str, Any]"] = []
    giver = quest["giverNpcId"]

    def add_dialogue_ref(ref: Any, speaker: str) -> str | None:
        guid = guid_of(ref)
        if not guid:
            return None
        dialogue_path = guid_index.get(guid.lower())
        if not dialogue_path:
            return None
        dialogue_data = load_unity_yaml(dialogue_path)
        key = dialogue_key(dialogue_data)
        if key and key not in dialogues:
            dialogues[key] = {
                "speaker": speaker,
                "lines": [line for line in (dialogue_data.get("dialogueText") or "").split("\n\n")],
            }
        return key

    start_key = add_dialogue_ref(quest.get("startDialogue"), giver)
    if start_key:
        steps.append(
            OrderedDict(
                (
                    ("type", "talk_to_npc"),
                    ("npc_id", giver),
                    ("dialogue_id", start_key),
                )
            )
        )

    for index, objective in enumerate(quest["objectives"]):
        if not isinstance(objective, dict):
            continue
        step_type = OBJECTIVE_TO_STEP.get(objective.get("type"))
        if step_type is None:
            print(
                f"    !! {quest['id']} objective {index} has unmapped type {objective.get('type')}",
                file=sys.stderr,
            )
            continue
        parameters: dict[str, Any] = {}
        for parameter in objective.get("parameters") or []:
            if isinstance(parameter, dict) and parameter.get("key"):
                parameters[str(parameter["key"])] = parameter.get("value")

        target_id = objective.get("targetId")
        step: "OrderedDict[str, Any]" = OrderedDict()
        step["type"] = step_type

        if step_type == "reach_location":
            step["location_id"] = target_id
        elif step_type == "play_minigame":
            config_guid = guid_of(objective.get("miniGameConfig"))
            minigame_id: str | None = None
            instance_id: str | None = None
            if config_guid:
                config_path = guid_index.get(config_guid.lower())
                if config_path:
                    config_data = load_unity_yaml(config_path)
                    minigame_id = minigame_type_for_config(config_data)
                    data_ref = config_data.get("data") or config_data.get("levelConfig")
                    data_guid = guid_of(data_ref)
                    if data_guid:
                        data_path = guid_index.get(data_guid.lower())
                        if data_path:
                            data = load_unity_yaml(data_path)
                            data_name = data.get("m_Name") or data_path.stem
                            instance_id = instance_key_for_data(str(data_name))
                            if minigame_id and instance_id:
                                instances[instance_id] = {
                                    "minigame_id": minigame_id,
                                    "data": data,
                                }
            step["minigame_id"] = minigame_id or ""
            step["world_object_id"] = target_id
            step["difficulty"] = to_int(parameters.get("difficulty"))
            step["success_required"] = True
            if instance_id:
                step["instance_id"] = instance_id
            step_reward_guid = guid_of(objective.get("stepReward"))
            if step_reward_guid:
                reward_path = guid_index.get(step_reward_guid.lower())
                if reward_path:
                    rewards = parse_reward_bundle(reward_path, lambda value: item_key(value, item_keys, item_reverse))
                    if rewards:
                        step["reward_item_id"] = rewards[0]["id"]
                        step["reward_amount"] = rewards[0]["amount"]
        elif step_type == "deliver_item":
            step["npc_id"] = target_id
            step["item_id"] = item_key(objective.get("requiredItemId") or 0, item_keys, item_reverse)
            step["amount"] = int(objective.get("count") or 1)
            delivered_key = add_dialogue_ref(objective.get("dialogue"), target_id)
            if delivered_key:
                step["dialogue_id"] = delivered_key

        display_text = objective.get("displayText")
        if display_text:
            step["display_text"] = display_text
        steps.append(step)

    turn_in_key = add_dialogue_ref(quest.get("turnInDialogue"), giver)
    if turn_in_key:
        steps.append(
            OrderedDict(
                (
                    ("type", "return_to_npc"),
                    ("npc_id", giver),
                    ("dialogue_id", turn_in_key),
                )
            )
        )
    return steps


def dialogue_key(dialogue_data: dict[str, Any]) -> str:
    name = str(dialogue_data.get("m_Name") or "")
    if name.startswith("Dialogue_"):
        return name[len("Dialogue_") :]
    return name


# --------------------------------------------------------------------------- #
# Line processing + file writing
# --------------------------------------------------------------------------- #


def active_lines(unity_root: Path, guid_index: dict[str, Path]) -> "OrderedDict[str, dict[str, Any]]":
    registry_path = unity_root / "Data/Quests/Lines/OpenWorld/QuestLineRegistry_OpenWorld.asset"
    registry = load_unity_yaml(registry_path)
    lines: "OrderedDict[str, dict[str, Any]]" = OrderedDict()
    for reference in registry.get("questLines") or []:
        guid = guid_of(reference)
        if not guid:
            continue
        questline_path = guid_index.get(guid.lower())
        if not questline_path:
            continue
        questline_data = load_unity_yaml(questline_path)
        folder = questline_path.parent.name
        lines[folder] = {
            "line_id": questline_data.get("lineId") or folder,
            "npc_id": questline_data.get("npcId"),
            "display_name": questline_data.get("displayName"),
            "theme": questline_data.get("theme"),
            "unity_path": questline_path,
        }
    return lines


def write_yaml(path: Path, doc: Any, comment_lines: list[str] | None = None) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    header = "".join(f"# {line}\n" for line in (comment_lines or []))
    body = yaml.dump(
        doc,
        Dumper=INDENT_DUMPER,
        allow_unicode=True,
        sort_keys=False,
        default_flow_style=False,
    )
    path.write_text(header + body, encoding="utf-8")


def process_line(
    line_key: str,
    line_meta: dict[str, Any],
    unity_root: Path,
    guid_index: dict[str, Path],
    content_fields: dict[str, list[str]],
    item_keys: set[str],
    item_reverse: dict[int, str],
) -> None:
    quest_folder = QUESTLINES_DIR / line_key
    quest_folder.mkdir(parents=True, exist_ok=True)
    existing_index = load_yaml(quest_folder / "_index.yaml")
    index_meta = existing_index.get("questline") or {}

    quests = []
    for asset in sorted(line_meta["unity_path"].parent.glob("QuestDefinition_*.asset")):
        parsed = parse_quest(asset, unity_root, guid_index, item_keys, item_reverse)
        if parsed:
            quests.append(parsed)
    quests.sort(key=lambda quest: quest["id"])
    if not quests:
        print(f"  !! no QuestDefinitionSO assets found for {line_key}")
        return

    instances: dict[str, dict[str, Any]] = {}
    dialogues: "OrderedDict[str, dict[str, Any]]" = OrderedDict()
    quest_entries: list["OrderedDict[str, Any]"] = []

    for quest in quests:
        quest_id = quest["id"]
        existing_detail = load_yaml(quest_folder / f"{quest_id}.yaml")
        detail = existing_detail.get("quest") or {}
        name = detail.get("name") or quest["displayName"]
        summary = detail.get("summary") or ""
        steps = build_steps(
            quest,
            unity_root,
            guid_index,
            instances,
            dialogues,
            item_keys,
            item_reverse,
        )
        doc = OrderedDict()
        doc["quest"] = OrderedDict(
            (
                ("id", quest_id),
                ("name", name),
                ("level_required", quest["levelRequired"]),
                ("giver_npc", quest["giverNpcId"]),
                ("prerequisite", quest["prerequisiteQuestId"] or None),
                ("summary", summary),
                ("wait_for_npc_turn_in", bool(quest["waitForNpcTurnIn"])),
            )
        )
        doc["rewards"] = quest["rewards"]
        doc["steps"] = steps
        write_yaml(quest_folder / f"{quest_id}.yaml", doc)
        quest_entries.append(
            OrderedDict(
                (
                    ("id", quest_id),
                    ("name", name),
                    ("level", quest["levelRequired"]),
                    ("prerequisite", quest["prerequisiteQuestId"] or None),
                    ("rewards", quest["rewards"]),
                )
            )
        )
        print(f"  {line_key}/{quest_id}: {len(steps)} steps")

    levels = [quest["levelRequired"] for quest in quests]
    index_doc = OrderedDict()
    index_doc["questline"] = OrderedDict(
        (
            ("id", line_key),
            ("npc_id", index_meta.get("npc_id") or line_meta.get("npc_id")),
            ("display_name", index_meta.get("display_name") or line_meta.get("display_name") or line_key),
            ("theme", index_meta.get("theme") or line_meta.get("theme") or ""),
            ("quest_count", len(quests)),
            ("level_range", [min(levels), max(levels)]),
        )
    )
    index_doc["quests"] = quest_entries
    write_yaml(quest_folder / "_index.yaml", index_doc)

    # minigame instances (preserve authored briefs, refresh params from Unity)
    existing_instances = load_yaml(REGISTRY / "minigame_instances" / f"{line_key}.yaml").get("instances") or {}
    instances_doc = OrderedDict()
    instances_doc["instances"] = OrderedDict()
    for key in sorted(instances):
        info = instances[key]
        params = extract_params(info["minigame_id"], info["data"], guid_index, unity_root, content_fields)
        existing = existing_instances.get(key)
        if isinstance(existing, dict):
            brief = {
                field: existing.get(field)
                for field in ("instruction", "tasks", "target", "variant", "success")
            }
        else:
            brief = default_brief(info["minigame_id"], info["data"], params)
        entry = OrderedDict()
        entry["minigame_id"] = info["minigame_id"]
        for field in ("instruction", "tasks", "target", "variant", "success"):
            entry[field] = brief.get(field)
        entry["params"] = params
        instances_doc["instances"][key] = entry
    write_yaml(
        REGISTRY / "minigame_instances" / f"{line_key}.yaml",
        instances_doc,
        [
            f"Per-step minigame briefs — {line_key}",
            "`minigame_id` is the catalog kind; `params` mirrors the Unity Data SO fields.",
        ],
    )

    # dialogues
    dialogues_doc = OrderedDict()
    dialogues_doc["dialogues"] = OrderedDict()
    for key, dialogue in dialogues.items():
        dialogues_doc["dialogues"][key] = OrderedDict(
            (
                ("speaker", dialogue["speaker"]),
                ("lines", dialogue["lines"]),
            )
        )
    write_yaml(
        REGISTRY / "dialogues" / f"{line_key}.yaml",
        dialogues_doc,
        [f"Dialogue scripts exported from Unity — {line_key}"],
    )


def write_catalogs(unity_root: Path, catalogs: dict[str, list[dict[str, Any]]]) -> None:
    for kind, entries in catalogs.items():
        section = kind
        existing = load_yaml(REGISTRY / f"{kind}.yaml").get(section) or {}
        doc = OrderedDict()
        doc[section] = OrderedDict()
        for entry in entries:
            entry_id = entry.get("id")
            meta = {}
            if isinstance(existing.get(entry_id), dict):
                meta = dict(existing[entry_id])
            if not meta:
                meta["name"] = entry.get("displayName") or entry_id
            if kind == "interactable" and "kind" not in meta:
                meta["kind"] = INTERACTABLE_KIND.get(entry.get("kind"), "minigame")
            if kind in ("areas", "interactables") and "status" not in meta:
                meta["status"] = "catalog_stub"
            doc[section][entry_id] = meta
        write_yaml(REGISTRY / f"{kind}.yaml", doc, CATALOG_HEADER[kind])


def prune_obsolete(active: set[str]) -> list[str]:
    removed: list[str] = []
    for folder in sorted(QUESTLINES_DIR.iterdir()):
        if folder.is_dir() and folder.name not in active:
            shutil.rmtree(folder)
            removed.append(f"questlines/{folder.name}/")
    for path in sorted((REGISTRY / "minigame_instances").glob("*.yaml")):
        if path.stem not in active:
            path.unlink()
            removed.append(str(path.relative_to(REPO_ROOT)))
    generated_dialogues = {f"{line}.yaml" for line in active}
    for path in sorted((REGISTRY / "dialogues").glob("*.yaml")):
        if path.name not in generated_dialogues:
            path.unlink()
            removed.append(str(path.relative_to(REPO_ROOT)))
    return removed


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--unity-root", type=Path, default=DEFAULT_UNITY_ROOT)
    parser.add_argument("--root", type=Path, default=REPO_ROOT)
    return parser.parse_args()


def main() -> int:
    global REPO_ROOT, REGISTRY, QUESTLINES_DIR
    args = parse_args()
    REPO_ROOT = args.root.resolve()
    REGISTRY = REPO_ROOT / "_registry"
    QUESTLINES_DIR = REPO_ROOT / "questlines"
    unity_root = args.unity_root.resolve()

    print(f"Unity root: {unity_root}")
    guid_index = build_guid_index(unity_root)
    print(f"GUID index: {len(guid_index)} assets")

    lines = active_lines(unity_root, guid_index)
    print(f"Active questlines: {', '.join(lines)}")

    content_fields = {
        str(minigame_id): [str(field) for field in (metadata.get("content_fields") or [])]
        for minigame_id, metadata in (load_yaml(REGISTRY / "minigames.yaml").get("minigames") or {}).items()
        if isinstance(metadata, dict)
    }

    items = merged_items()
    item_keys = set(items)
    item_reverse = build_item_reverse(items)
    print(f"Items: {len(item_keys)} ({len(item_reverse)} with softkitty ids)")

    catalogs = {kind: parse_catalog(unity_root / relative) for kind, relative in CATALOG_PATHS.items()}
    for kind, entries in catalogs.items():
        print(f"  catalog {kind}: {len(entries)} entries")

    for line_key in sorted(lines):
        process_line(
            line_key,
            lines[line_key],
            unity_root,
            guid_index,
            content_fields,
            item_keys,
            item_reverse,
        )

    write_catalogs(unity_root, catalogs)

    removed = prune_obsolete(set(lines))
    for path in removed:
        print(f"  pruned {path}")

    print("Export complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
