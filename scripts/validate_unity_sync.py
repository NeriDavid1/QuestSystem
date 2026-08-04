#!/usr/bin/env python3
"""Validate the live Unity QuestSystem assets against the YAML/DB authoring source.

The Unity project ships authored ScriptableObjects under
`Assets/_OurAssets/Data/Quests/Lines/<line>/QuestDefinition_*.asset`. The
workspace authoring source is the YAML questlines + `_registry` that feed the
Supabase database (see import_yaml_to_supabase.py). This script cross-checks the
two so the web editor and the runtime quest system stay in sync.

What is compared per quest (when the quest exists on both sides):

* level_required          -> QuestDefinitionSO.levelRequired
* giver                   -> QuestDefinitionSO.giverNpcId
* prerequisites           -> QuestDefinitionSO.prerequisiteQuestId
* quest xp/item rewards   -> QuestDefinitionSO.rewards
* step count + order      -> QuestDefinitionSO.objectives (by Unity objective type)
* step target ids         -> objective.targetId (npc/area/interactable)
* deliver item            -> objective.requiredItemId (SoftKitty id via _registry/items.yaml)
* wait_for_npc_turn_in    -> QuestDefinitionSO.waitForNpcTurnIn
* play_minigame params    -> nested Data SO fields vs minigame_instances.params

Mismatches are reported to `reports/unity_sync_report.json` and on stdout. The
exit code is non-zero when any `error`-severity issue is reported (or when
`--fail-on` is set higher).

Run from the repository root:

    python scripts/validate_unity_sync.py [--unity-path PATH] [--fail-on warning]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))

from import_yaml_to_supabase import build_bundle, load_yaml, merged_items  # noqa: E402
from unity_to_yaml import (  # noqa: E402
    CONFIG_CLASS_TO_MINIGAME,
    extract_params,
    guid_of,
    minigame_type_for_config,
)

ROOT = Path(__file__).resolve().parent.parent
REGISTRY = ROOT / "_registry"
REPORT_PATH = ROOT / "reports" / "unity_sync_report.json"

DEFAULT_OUR_ASSETS = Path(
    r"C:\Users\123ne\source\repos\Animal-English-World\English Kingdom\Assets\_OurAssets"
)

# Unity QuestObjectiveType enum (EnglishKingdom.QuestSystem.QuestObjectiveType)
QUEST_OBJECTIVE_NAMES = {
    0: "TalkToNpc",
    1: "EnterArea",
    2: "Collect",
    3: "CompleteMiniGame",
    4: "DeliverItem",
    5: "Custom",
}

# YAML step type -> Unity QuestObjectiveType (mirrors _registry/unity_mapping.yaml)
STEP_TO_OBJECTIVE = {
    "talk_to_npc": "TalkToNpc",
    "return_to_npc": "TalkToNpc",
    "reach_location": "EnterArea",
    "play_minigame": "CompleteMiniGame",
    "collect_item": "Collect",
    "deliver_item": "DeliverItem",
}

DEFAULT_UNITY_ROOT = str(DEFAULT_OUR_ASSETS / "Data" / "Quests" / "Lines")

CONTENT_FIELD_NAMES = {
    "data",
    "levelConfig",
    "letterPath",
}


def load_unity_yaml(path: Path) -> dict[str, Any]:
    """Parse a Unity .asset YAML document (strips %TAG and the tagged document header)."""
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


def build_guid_index(unity_root: Path) -> dict[str, Path]:
    """Map asset guid -> path by scanning .meta files under a Unity folder."""
    import re as _re

    index: dict[str, Path] = {}
    scan_roots = [unity_root]
    # Also index minigame content when validating Lines-only trees.
    our_assets = unity_root
    for _ in range(4):
        if our_assets.name == "_OurAssets":
            break
        our_assets = our_assets.parent
    if our_assets.name == "_OurAssets":
        for relative in ("Data/MiniGames", "Art/Prefabs/UI/GamePlay/MiniGame", "Data/Quests"):
            candidate = our_assets / relative
            if candidate.is_dir() and candidate not in scan_roots:
                scan_roots.append(candidate)

    for root in scan_roots:
        for meta in root.rglob("*.meta"):
            try:
                text = meta.read_text(encoding="utf-8", errors="ignore")
            except OSError:
                continue
            match = _re.search(r"^guid:\s*([0-9a-fA-F]{32})\s*$", text, _re.MULTILINE)
            if match:
                index[match.group(1).lower()] = meta.parent / meta.stem
    return index


def load_minigame_instances() -> dict[str, dict[str, Any]]:
    """Map instance key -> authored brief + params."""
    instances: dict[str, dict[str, Any]] = {}
    instance_dir = REGISTRY / "minigame_instances"
    for path in sorted(instance_dir.glob("*.yaml")):
        for key, raw in (load_yaml(path).get("instances") or {}).items():
            if isinstance(raw, dict):
                instances[str(key)] = raw
    return instances


def content_fields_by_minigame() -> dict[str, list[str]]:
    catalog = load_yaml(REGISTRY / "minigames.yaml").get("minigames") or {}
    return {
        str(minigame_id): [str(field) for field in (meta.get("content_fields") or [])]
        for minigame_id, meta in catalog.items()
        if isinstance(meta, dict)
    }


def normalize_param_value(value: Any) -> Any:
    if isinstance(value, list):
        return [normalize_param_value(item) for item in value]
    if isinstance(value, dict):
        return {str(key): normalize_param_value(item) for key, item in value.items()}
    if isinstance(value, float) and value.is_integer():
        return int(value)
    return value


def params_equal(left: Any, right: Any) -> bool:
    return normalize_param_value(left) == normalize_param_value(right)


def extract_unity_minigame_params(
    config_guid: str | None,
    guid_index: dict[str, Path],
    our_assets: Path,
    content_fields: dict[str, list[str]],
) -> tuple[str | None, dict[str, Any]]:
    if not config_guid:
        return None, {}
    config_path = guid_index.get(config_guid.lower())
    if not config_path or not config_path.is_file():
        return None, {}
    config_data = load_unity_yaml(config_path)
    minigame_id = minigame_type_for_config(config_data)
    if not minigame_id:
        identifier = str(config_data.get("m_EditorClassIdentifier") or "")
        for class_name, mapped in CONFIG_CLASS_TO_MINIGAME.items():
            if class_name in identifier:
                minigame_id = mapped
                break
    content_guid = None
    for field in CONTENT_FIELD_NAMES:
        content_guid = guid_of(config_data.get(field))
        if content_guid:
            break
    if not content_guid:
        return minigame_id, {}
    content_path = guid_index.get(content_guid.lower())
    if not content_path or not content_path.is_file():
        return minigame_id, {}
    content_data = load_unity_yaml(content_path)
    return minigame_id, extract_params(minigame_id or "", content_data, guid_index, our_assets, content_fields)

def parse_reward_definition(path: Path) -> list[dict[str, Any]]:
    """Extract item rewards granted by a RewardDefinitionSO asset bundle."""
    data = load_unity_yaml(path)
    bundle = data.get("bundle") or {}
    rewards: list[dict[str, Any]] = []
    for item in bundle.get("items") or []:
        if isinstance(item, dict) and item.get("itemId") is not None:
            rewards.append(
                {
                    "itemId": item["itemId"],
                    "amount": int(item.get("count") or item.get("amount") or 1),
                }
            )
    for coin in bundle.get("legacyCoins") or []:
        if isinstance(coin, dict):
            rewards.append({"itemId": "coin", "amount": int(coin.get("amount") or 1)})
    for _ability in bundle.get("abilities") or []:
        rewards.append({"itemId": "slash_ability", "amount": 1})
    return rewards


def parse_quest_definition(path: Path, guid_index: dict[str, Path] | None = None) -> dict[str, Any] | None:
    """Extract the authoring-relevant fields from a QuestDefinitionSO .asset."""
    data = load_unity_yaml(path)
    quest_id = data.get("id")
    if not quest_id:
        return None

    objectives: list[dict[str, Any]] = []
    for objective in data.get("objectives") or []:
        if not isinstance(objective, dict):
            continue
        parameters: dict[str, str] = {}
        for parameter in objective.get("parameters") or []:
            if isinstance(parameter, dict) and parameter.get("key"):
                parameters[str(parameter["key"])] = str(parameter.get("value") or "")
        step_reward = objective.get("stepReward")
        mini_game_config = objective.get("miniGameConfig")
        objectives.append(
            {
                "type": objective.get("type"),
                "typeName": QUEST_OBJECTIVE_NAMES.get(objective.get("type"), "Unknown"),
                "targetId": objective.get("targetId"),
                "count": objective.get("count", 1),
                "requiredItemId": objective.get("requiredItemId") or 0,
                "stepRewardGuid": step_reward.get("guid") if isinstance(step_reward, dict) else None,
                "miniGameConfigGuid": mini_game_config.get("guid") if isinstance(mini_game_config, dict) else None,
                "parameters": parameters,
            }
        )

    rewards = data.get("rewards") or {}
    reward_definition_items: list[dict[str, Any]] = []
    reward_definition = data.get("rewardDefinition")
    if isinstance(reward_definition, dict) and reward_definition.get("guid") and guid_index:
        reward_path = guid_index.get(str(reward_definition["guid"]).lower())
        if reward_path and reward_path.is_file():
            reward_definition_items = parse_reward_definition(reward_path)
    return {
        "path": str(path.relative_to(Path(DEFAULT_UNITY_ROOT))),
        "id": quest_id,
        "displayName": data.get("displayName"),
        "levelRequired": data.get("levelRequired"),
        "giverNpcId": data.get("giverNpcId"),
        "prerequisiteQuestId": (data.get("prerequisiteQuestId") or "").strip() or None,
        "waitForNpcTurnIn": bool(data.get("waitForNpcTurnIn")),
        "rewardsXp": rewards.get("xp") or 0,
        "rewardsItems": [
            {
                "itemId": item.get("itemId"),
                "amount": item.get("amount") or 1,
            }
            for item in (rewards.get("items") or [])
            if isinstance(item, dict) and item.get("itemId")
        ],
        "rewardDefinitionItems": reward_definition_items,
        "objectives": objectives,
    }


def collect_unity_quests(unity_root: Path) -> dict[str, dict[str, Any]]:
    """Map `{line_key}/{quest_id}` -> parsed QuestDefinitionSO from .asset files."""
    quests: dict[str, dict[str, Any]] = {}
    if not unity_root.is_dir():
        return quests
    guid_index = build_guid_index(unity_root)
    for asset in sorted(unity_root.glob("*/QuestDefinition_*.asset")):
        definition = parse_quest_definition(asset, guid_index=guid_index)
        if not definition:
            continue
        line_key = asset.parent.name
        quests[f"{line_key}/{definition['id']}"] = definition
    return quests


def bundle_quest_key(line_key: str, quest_key: str) -> str:
    return f"{line_key}/{quest_key}"


def expected_objective_target(step_type: str, payload: dict[str, Any]) -> str | None:
    if step_type in ("talk_to_npc", "return_to_npc", "deliver_item"):
        value = payload.get("npc_id")
        return str(value) if value else None
    if step_type == "reach_location":
        value = payload.get("location_id")
        return str(value) if value else None
    if step_type == "play_minigame":
        value = payload.get("world_object_id")
        return str(value) if value else None
    if step_type == "collect_item":
        value = payload.get("item_id")
        return str(value) if value else None
    return None


def is_dialogue_only_step(step: dict[str, Any], step_type: str) -> bool:
    """A step that only drives dialogue (no objective) in the Unity runtime.

    The first talk_to_npc step maps to QuestDefinitionSO.startDialogue and a
    trailing return_to_npc step maps to turnInDialogue; neither becomes an
    objective in the asset.
    """
    payload = step.get("payload") or {}
    has_reward = any(
        (payload.get(field) is not None and payload.get(field) != "")
        for field in ("reward_item_id", "reward_amount", "count")
    )
    return bool(payload.get("dialogue_id")) and not has_reward


def runtime_steps(bundle_steps: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Strip the intro start-dialogue step and the trailing turn-in step.

    Unity models those two conversations on the QuestDefinitionSO itself
    (startDialogue / turnInDialogue), so only the remaining steps map 1:1 to
    the `objectives` list.
    """
    steps = list(bundle_steps)
    while steps and steps[0].get("type") == "talk_to_npc" and is_dialogue_only_step(steps[0], "talk_to_npc"):
        steps.pop(0)
    while steps and steps[-1].get("type") == "return_to_npc" and is_dialogue_only_step(steps[-1], "return_to_npc"):
        steps.pop()
    return steps


def step_summary(steps: list[dict[str, Any]]) -> list[str]:
    return [
        "{}{}".format(
            step.get("type"),
            ":" + str(step.get("payload", {}).get("difficulty", "")) if step.get("type") == "play_minigame" else "",
        )
        for step in steps
    ]


def softkitty_id_for(item_id: str, items: dict[str, dict[str, Any]]) -> int | None:
    entry = items.get(item_id) or {}
    raw = entry.get("softkitty_id")
    if raw is None:
        return None
    try:
        return int(raw)
    except (TypeError, ValueError):
        return None


def resolve_item_key(item_id: Any, items: dict[str, dict[str, Any]]) -> str:
    """Map a Unity item id (numeric softkitty id or authoring key) to the YAML key."""
    if isinstance(item_id, str):
        if item_id in items:
            return item_id
        try:
            numeric = int(item_id)
        except ValueError:
            return item_id
        item_id = numeric
    if isinstance(item_id, int):
        for key, meta in items.items():
            raw = meta.get("softkitty_id") if isinstance(meta, dict) else None
            if raw is None:
                continue
            try:
                if int(raw) == item_id:
                    return key
            except (TypeError, ValueError):
                continue
    return str(item_id)


def compare_quest(
    line_key: str,
    bundle_quest: dict[str, Any],
    unity_quest: dict[str, Any],
    items: dict[str, dict[str, Any]],
    *,
    instances: dict[str, dict[str, Any]] | None = None,
    guid_index: dict[str, Path] | None = None,
    our_assets: Path | None = None,
    content_fields: dict[str, list[str]] | None = None,
) -> list[dict[str, Any]]:
    """Compare one quest on both sides and return a list of issues."""
    issues: list[dict[str, Any]] = []
    quest_label = f"{line_key}/{bundle_quest['key']}"
    instances = instances or {}
    guid_index = guid_index or {}
    our_assets = our_assets or DEFAULT_OUR_ASSETS
    content_fields = content_fields or {}

    def issue(severity: str, code: str, message: str, **context: Any) -> None:
        issues.append(
            {
                "severity": severity,
                "code": code,
                "message": message,
                "quest": quest_label,
                "context": context,
            }
        )

    # Identity / requirements
    if int(unity_quest["levelRequired"]) != int(bundle_quest["level_required"]):
        issue(
            "error",
            "level_mismatch",
            "level_required differs between authoring source and Unity asset.",
            yaml=bundle_quest["level_required"],
            unity=unity_quest["levelRequired"],
        )

    yaml_giver = bundle_quest.get("giver_external_id")
    unity_giver = unity_quest["giverNpcId"]
    if (yaml_giver or None) != (unity_giver or None):
        issue(
            "error",
            "giver_mismatch",
            "Quest giver NPC differs between authoring source and Unity asset.",
            yaml=yaml_giver,
            unity=unity_giver,
        )

    yaml_prereqs = sorted(bundle_quest.get("prerequisites") or [])
    unity_prereq = unity_quest["prerequisiteQuestId"]
    unity_prereqs = [unity_prereq] if unity_prereq else []
    if yaml_prereqs != unity_prereqs:
        issue(
            "warning",
            "prerequisite_mismatch",
            "Prerequisites differ between authoring source and Unity asset.",
            yaml=yaml_prereqs,
            unity=unity_prereqs,
        )

    # Rewards
    yaml_xp = 0
    yaml_items: dict[str, int] = {}
    for reward in bundle_quest.get("rewards") or []:
        if reward["reward_type"] == "xp":
            yaml_xp += int(reward.get("xp_amount") or 0)
        elif reward["reward_type"] == "item":
            key = str(reward.get("item_external_id") or "")
            if key:
                yaml_items[key] = yaml_items.get(key, 0) + int(reward.get("amount") or 1)
    if yaml_xp != int(unity_quest["rewardsXp"]):
        issue(
            "error",
            "xp_reward_mismatch",
            "Quest XP reward differs between authoring source and Unity asset.",
            yaml=yaml_xp,
            unity=unity_quest["rewardsXp"],
        )
    # Item rewards may be granted inline, via a RewardDefinitionSO asset, or
    # through a mix of both; resolve all sources into the authoring key space.
    unity_items: dict[str, int] = {}
    for item in unity_quest["rewardsItems"]:
        key = resolve_item_key(item["itemId"], items)
        unity_items[key] = unity_items.get(key, 0) + int(item["amount"] or 1)
    for item in unity_quest.get("rewardDefinitionItems") or []:
        key = resolve_item_key(item["itemId"], items)
        unity_items[key] = unity_items.get(key, 0) + int(item["amount"] or 1)
    if yaml_items and yaml_items != unity_items:
        issue(
            "warning",
            "item_reward_mismatch",
            "Quest item rewards differ between authoring source and Unity asset (including rewardDefinition grants).",
            yaml=yaml_items,
            unity=unity_items,
        )

    # wait_for_npc_turn_in (authoring field may be absent in older YAML -> skip)
    yaml_turn_in = bundle_quest.get("wait_for_npc_turn_in")
    if yaml_turn_in is not None and bool(yaml_turn_in) != bool(unity_quest["waitForNpcTurnIn"]):
        issue(
            "error",
            "turnin_mismatch",
            "wait_for_npc_turn_in differs between authoring source and Unity asset.",
            yaml=yaml_turn_in,
            unity=unity_quest["waitForNpcTurnIn"],
        )

    # Steps (intro talk and trailing turn-in are represented on the asset itself)
    bundle_steps = runtime_steps(bundle_quest.get("steps") or [])
    unity_objectives = unity_quest["objectives"]
    if len(bundle_steps) != len(unity_objectives):
        issue(
            "error",
            "step_count_mismatch",
            "Step count differs between authoring source and Unity asset.",
            yaml=len(bundle_steps),
            unity=len(unity_objectives),
            yaml_steps=step_summary(bundle_steps),
            unity_steps=[obj["typeName"] for obj in unity_objectives],
        )

    for index, (bundle_step, unity_objective) in enumerate(zip(bundle_steps, unity_objectives)):
        step_type = str(bundle_step.get("type") or "")
        payload = bundle_step.get("payload") or {}
        expected_objective = STEP_TO_OBJECTIVE.get(step_type)
        actual_objective = unity_objective["typeName"]
        if expected_objective and expected_objective != actual_objective:
            issue(
                "error",
                "objective_type_mismatch",
                f"Step {index + 1} maps to Unity objective {expected_objective} but the asset declares {actual_objective}.",
                step_index=index,
                step_type=step_type,
                yaml=expected_objective,
                unity=actual_objective,
            )
            continue

        expected_target = expected_objective_target(step_type, payload)
        actual_target = unity_objective["targetId"]
        if expected_target and actual_target and expected_target != actual_target:
            issue(
                "error",
                "target_id_mismatch",
                f"Step {index + 1} target differs between authoring source and Unity asset.",
                step_index=index,
                step_type=step_type,
                yaml=expected_target,
                unity=actual_target,
            )

        if step_type == "deliver_item":
            item_id = str(payload.get("item_id") or "")
            expected_item = softkitty_id_for(item_id, items)
            actual_item = int(unity_objective["requiredItemId"] or 0)
            if expected_item is not None and actual_item and expected_item != actual_item:
                issue(
                    "error",
                    "deliver_item_mismatch",
                    f"Step {index + 1} deliver item softkitty id differs between authoring source and Unity asset.",
                    step_index=index,
                    item=item_id,
                    yaml=expected_item,
                    unity=actual_item,
                )
            yaml_amount = int(payload.get("amount") or 1)
            unity_count = int(unity_objective["count"] or 1)
            if yaml_amount != unity_count:
                issue(
                    "error",
                    "deliver_count_mismatch",
                    f"Step {index + 1} deliver amount differs between authoring source and Unity asset.",
                    step_index=index,
                    yaml=yaml_amount,
                    unity=unity_count,
                )

        if step_type == "play_minigame":
            yaml_difficulty = payload.get("difficulty")
            unity_difficulty = unity_objective["parameters"].get("difficulty")
            if yaml_difficulty is not None and unity_difficulty is not None and str(yaml_difficulty) != str(unity_difficulty):
                issue(
                    "warning",
                    "difficulty_mismatch",
                    f"Step {index + 1} minigame difficulty differs between authoring source and Unity asset.",
                    step_index=index,
                    yaml=yaml_difficulty,
                    unity=unity_difficulty,
                )

            instance_key = str(payload.get("instance_key") or payload.get("instance_id") or "")
            authored = instances.get(instance_key) if instance_key else None
            authored_params = (authored or {}).get("params") if isinstance(authored, dict) else None
            unity_minigame_id, unity_params = extract_unity_minigame_params(
                unity_objective.get("miniGameConfigGuid"),
                guid_index,
                our_assets,
                content_fields,
            )
            if isinstance(authored_params, dict) and unity_params:
                mismatched = []
                for key, unity_value in unity_params.items():
                    if key not in authored_params:
                        mismatched.append(key)
                        continue
                    if not params_equal(authored_params.get(key), unity_value):
                        mismatched.append(key)
                if mismatched:
                    issue(
                        "warning",
                        "minigame_params_mismatch",
                        f"Step {index + 1} minigame params differ between YAML and Unity Data SO.",
                        step_index=index,
                        instance_key=instance_key,
                        fields=mismatched,
                        yaml_minigame_id=(authored or {}).get("minigame_id"),
                        unity_minigame_id=unity_minigame_id,
                    )
            elif instance_key and not authored:
                issue(
                    "warning",
                    "minigame_instance_missing",
                    f"Step {index + 1} references minigame instance '{instance_key}' which is not in YAML.",
                    step_index=index,
                    instance_key=instance_key,
                )

    return issues


def validate(unity_root: Path) -> dict[str, Any]:
    bundle = build_bundle()
    unity_quests = collect_unity_quests(unity_root)
    items = merged_items()
    instances = load_minigame_instances()
    guid_index = build_guid_index(unity_root)
    content_fields = content_fields_by_minigame()
    our_assets = unity_root
    for _ in range(4):
        if our_assets.name == "_OurAssets":
            break
        our_assets = our_assets.parent
    if our_assets.name != "_OurAssets":
        our_assets = DEFAULT_OUR_ASSETS
    issues: list[dict[str, Any]] = []
    compared = 0

    bundle_by_key = {}
    for line in bundle["questlines"]:
        for quest in line["quests"]:
            bundle_by_key[bundle_quest_key(line["key"], quest["key"])] = (line["key"], quest)

    unity_paths: set[str] = set()
    for key, unity_quest in unity_quests.items():
        unity_paths.add(key)
        if key not in bundle_by_key:
            issues.append(
                {
                    "severity": "error",
                    "code": "quest_not_in_source",
                    "message": "QuestDefinition asset exists in Unity but has no matching YAML authoring file.",
                    "quest": key,
                    "context": {"path": unity_quest["path"]},
                }
            )
            continue
        line_key, bundle_quest = bundle_by_key[key]
        issues.extend(
            compare_quest(
                line_key,
                bundle_quest,
                unity_quest,
                items,
                instances=instances,
                guid_index=guid_index,
                our_assets=our_assets,
                content_fields=content_fields,
            )
        )
        compared += 1

    for key in sorted(set(bundle_by_key) - unity_paths):
        line_key, bundle_quest = bundle_by_key[key]
        issues.append(
            {
                "severity": "info",
                "code": "quest_not_in_unity",
                "message": "Quest is authored in YAML/DB but has no QuestDefinitionSO asset in Unity yet.",
                "quest": key,
                "context": {"source_path": bundle_quest.get("source_path")},
            }
        )

    counts = {
        "compared_quests": compared,
        "unity_quests": len(unity_quests),
        "source_quests": len(bundle_by_key),
        "errors": sum(1 for item in issues if item["severity"] == "error"),
        "warnings": sum(1 for item in issues if item["severity"] == "warning"),
        "info": sum(1 for item in issues if item["severity"] == "info"),
    }
    report = {
        "schema_version": 1,
        "unity_path": str(unity_root),
        "counts": counts,
        "issues": issues,
    }
    return report

def print_report(report: dict[str, Any]) -> None:
    counts = report["counts"]
    print("Unity <-> authoring sync validation")
    print("  unity path :", report["unity_path"])
    print(
        "  compared   : {compared_quests} quests (unity {unity_quests}, source {source_quests})".format(
            **counts
        )
    )
    print(
        "  issues     : {errors} errors, {warnings} warnings, {info} info".format(**counts)
    )
    for item in report["issues"]:
        print(f"  [{item['severity']:>7}] {item['quest']}: {item['message']}")
        context = {key: value for key, value in item["context"].items() if value is not None}
        if context:
            print(f"           {json.dumps(context, ensure_ascii=False)}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--unity-path",
        default=str(Path(DEFAULT_UNITY_ROOT)),
        help="Path to the Unity Data/Quests/Lines folder.",
    )
    parser.add_argument(
        "--report",
        default=str(REPORT_PATH),
        help="Where to write the JSON report.",
    )
    parser.add_argument(
        "--fail-on",
        choices=["error", "warning", "info", "none"],
        default="error",
        help="Minimum severity that makes the script exit non-zero (default: error).",
    )
    args = parser.parse_args()

    unity_root = Path(args.unity_path)
    report = validate(unity_root)
    report_path = Path(args.report)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print_report(report)

    severity_rank = {"error": 3, "warning": 2, "info": 1, "none": 0}
    threshold = severity_rank[args.fail_on]
    worst = severity_rank.get(report["counts"]["errors"] and "error" or "info", 0)
    if report["counts"]["errors"]:
        worst = severity_rank["error"]
    elif report["counts"]["warnings"]:
        worst = severity_rank["warning"]
    elif report["counts"]["info"]:
        worst = severity_rank["info"]
    return 1 if worst >= threshold else 0


if __name__ == "__main__":
    raise SystemExit(main())
