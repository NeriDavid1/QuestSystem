#!/usr/bin/env python3
"""Build a deterministic Supabase seed bundle from the YAML authoring source.

This script deliberately does not connect to Supabase. It produces:

* a JSON bundle that is easy to inspect and archive;
* ordered SQL batches that can be applied through the Supabase MCP;
* an import report containing conflicts that require an editor decision.

The generated SQL preserves exact Unity-facing IDs and uses natural keys for
idempotent upserts. Run it from the repository root:

    python scripts/import_yaml_to_supabase.py
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parent.parent
REGISTRY = ROOT / "_registry"
QUESTLINES_DIR = ROOT / "questlines"

IMPORTER_VERSION = "1.0.0"
HEBREW_RE = re.compile(r"[\u0590-\u05FF]")
HTML_TAG_RE = re.compile(r"<\s*/?\s*([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>")
ALLOWED_RICH_TAGS = {"strong", "em", "i", "br"}
STEP_ID_RE = re.compile(r"[^a-z0-9]+")


def load_yaml(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    with path.open(encoding="utf-8") as handle:
        return yaml.safe_load(handle) or {}


def normalize(value: Any) -> Any:
    """Return JSON-safe data with stable string keys."""
    if isinstance(value, dict):
        return {str(key): normalize(item) for key, item in value.items()}
    if isinstance(value, list):
        return [normalize(item) for item in value]
    if isinstance(value, tuple):
        return [normalize(item) for item in value]
    return value


def canonical_json(value: Any) -> str:
    return json.dumps(normalize(value), ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def slug(value: Any) -> str:
    text = str(value or "").strip().lower()
    text = STEP_ID_RE.sub("_", text).strip("_")
    return text or "value"


def sql_literal(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def json_sql(value: Any) -> str:
    return f"{sql_literal(canonical_json(value))}::jsonb"


def dollar_json(value: Any) -> str:
    payload = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    return f"$seed${payload}$seed$::jsonb"


def yaml_section(path: Path, section: str) -> dict[str, Any]:
    raw = load_yaml(path).get(section, {})
    return raw if isinstance(raw, dict) else {}


def merged_items() -> dict[str, Any]:
    """Match build_catalog.py's SoftKitty-first item merge."""
    result: dict[str, Any] = {}
    for source_path, section in (
        (REGISTRY / "softkitty_items.yaml", "softkitty_items"),
        (REGISTRY / "items.yaml", "items"),
    ):
        for entry_id, metadata in yaml_section(source_path, section).items():
            key = str(entry_id)
            existing = result.setdefault(key, {})
            if isinstance(metadata, dict):
                existing.update(normalize(metadata))
            elif not existing:
                existing["name"] = str(metadata)
    return result


def conflict(
    conflicts: list[dict[str, Any]],
    kind: str,
    severity: str,
    message: str,
    path: str,
    **context: Any,
) -> None:
    conflicts.append(
        {
            "kind": kind,
            "severity": severity,
            "message": message,
            "path": path,
            "context": normalize(context),
        }
    )


def catalog_bundle() -> tuple[list[dict[str, Any]], dict[str, set[str]]]:
    sources = {
        "area": (REGISTRY / "areas.yaml", "areas"),
        "npc": (REGISTRY / "npcs.yaml", "npcs"),
        "interactable": (REGISTRY / "interactables.yaml", "interactables"),
        "minigame": (REGISTRY / "minigames.yaml", "minigames"),
    }
    entries: list[dict[str, Any]] = []
    ids_by_kind: dict[str, set[str]] = {}

    for kind, (path, section) in sources.items():
        raw_entries = yaml_section(path, section)
        ids_by_kind[kind] = {str(entry_id) for entry_id in raw_entries}
        for entry_id, metadata in raw_entries.items():
            normalized = normalize(metadata)
            if not isinstance(normalized, dict):
                normalized = {"name": str(normalized)}
            external_id = str(entry_id)
            entries.append(
                {
                    "kind": kind,
                    "external_id": external_id,
                    "name": str(normalized.get("name") or external_id),
                    "description": normalized.get("description"),
                    "status": normalized.get("status"),
                    "image_path": normalized.get("image"),
                    "metadata": normalized,
                }
            )

    item_entries = merged_items()
    ids_by_kind["item"] = set(item_entries)
    for entry_id, metadata in item_entries.items():
        normalized = metadata if isinstance(metadata, dict) else {"name": str(metadata)}
        entries.append(
            {
                "kind": "item",
                "external_id": entry_id,
                "name": str(normalized.get("name") or entry_id),
                "description": normalized.get("description"),
                "status": normalized.get("status"),
                "image_path": normalized.get("image"),
                "metadata": normalize(normalized),
            }
        )

    entries.sort(key=lambda entry: (entry["kind"], entry["external_id"].lower(), entry["external_id"]))
    return entries, ids_by_kind


def step_type_bundle() -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]]]:
    raw = yaml_section(REGISTRY / "systems.yaml", "step_types")
    definitions: list[dict[str, Any]] = []
    by_id: dict[str, dict[str, Any]] = {}
    for step_id, metadata in raw.items():
        if not isinstance(metadata, dict):
            continue
        fields = []
        for field_name, field_meta in (metadata.get("fields") or {}).items():
            if isinstance(field_meta, dict):
                fields.append({"name": str(field_name), **normalize(field_meta)})
            else:
                fields.append({"name": str(field_name), "type": str(field_meta)})
        definition = {
            "id": str(step_id),
            "unity_objective": metadata.get("unity_objective"),
            "description": metadata.get("description", ""),
            "fields": fields,
            "metadata": normalize(
                {
                    key: value
                    for key, value in metadata.items()
                    if key not in {"unity_objective", "description", "fields"}
                }
            ),
        }
        definitions.append(definition)
        by_id[str(step_id)] = definition
    definitions.sort(key=lambda definition: definition["id"])
    return definitions, by_id


def dialogue_bundle(conflicts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    dialogues: list[dict[str, Any]] = []
    dialogue_dir = REGISTRY / "dialogues"
    for path in sorted(dialogue_dir.glob("*.yaml")):
        for key, raw_dialogue in (load_yaml(path).get("dialogues") or {}).items():
            if not isinstance(raw_dialogue, dict):
                conflict(
                    conflicts,
                    "invalid_dialogue",
                    "error",
                    "Dialogue entry must be a mapping.",
                    str(path.relative_to(ROOT)),
                    dialogue_id=str(key),
                )
                continue
            lines = raw_dialogue.get("lines") or []
            if not isinstance(lines, list):
                lines = [str(lines)]
            line_records = []
            for index, raw_line in enumerate(lines):
                content = str(raw_line)
                tags = {tag.lower() for tag in HTML_TAG_RE.findall(content)}
                unsafe_tags = sorted(tags - ALLOWED_RICH_TAGS)
                if unsafe_tags:
                    conflict(
                        conflicts,
                        "unsafe_dialogue_markup",
                        "warning",
                        "Dialogue contains markup outside the editor safe allow-list.",
                        str(path.relative_to(ROOT)),
                        dialogue_id=str(key),
                        line_order=index,
                        tags=unsafe_tags,
                    )
                locale = "he" if HEBREW_RE.search(content) else "en"
                line_records.append(
                    {
                        "locale": locale,
                        "line_order": index,
                        "content": content,
                        "line_format": "safe_rich_text" if tags and not unsafe_tags else "plain_text",
                    }
                )
            dialogues.append(
                {
                    "key": str(key),
                    "speaker_external_id": raw_dialogue.get("speaker"),
                    "source_path": str(path.relative_to(ROOT)),
                    "source_metadata": normalize(
                        {
                            key_name: value
                            for key_name, value in raw_dialogue.items()
                            if key_name not in {"speaker", "lines"}
                        }
                    ),
                    "lines": line_records,
                }
            )
    dialogues.sort(key=lambda dialogue: dialogue["key"])
    return dialogues


GENERIC_MINI_KEY_FIELDS = {
    "instruction",
    "tasks",
    "target",
    "variant",
    "success",
    "params",
    "minigame_id",
}
CATALOG_MINIGAME_IDS = {
    "letter_ordering",
    "word_ordering",
    "speak_aloud",
    "word_matching",
    "letter_drawing",
}


def infer_minigame_id(params: dict[str, Any], variant: Any = None) -> str | None:
    """Infer catalog kind from Unity-shaped params or a legacy variant=external_id."""
    if not isinstance(params, dict):
        params = {}
    if "targetWord" in params:
        return "letter_ordering"
    if "englishWordsInOrder" in params:
        return "word_ordering"
    if "targetWords" in params or "targetPhrase" in params:
        return "speak_aloud"
    if "letters" in params or "wordTasks" in params:
        return "word_matching"
    if "strokes" in params or ("letter" in params and "previewImage" in params):
        return "letter_drawing"
    if isinstance(variant, str) and variant in CATALOG_MINIGAME_IDS:
        return variant
    return None


def minigame_bundle() -> list[dict[str, Any]]:
    instances: list[dict[str, Any]] = []
    instance_dir = REGISTRY / "minigame_instances"
    for path in sorted(instance_dir.glob("*.yaml")):
        for key, raw_instance in (load_yaml(path).get("instances") or {}).items():
            raw_instance = raw_instance if isinstance(raw_instance, dict) else {}
            content_values = {
                "instruction": raw_instance.get("instruction"),
                "tasks": normalize(raw_instance.get("tasks") or []),
                "target": raw_instance.get("target"),
                "variant": raw_instance.get("variant"),
                "success": raw_instance.get("success"),
            }
            params = normalize(raw_instance.get("params") or {})
            if not isinstance(params, dict):
                params = {}
            explicit_id = raw_instance.get("minigame_id")
            minigame_id = (
                str(explicit_id)
                if isinstance(explicit_id, str) and explicit_id in CATALOG_MINIGAME_IDS
                else infer_minigame_id(params, content_values.get("variant"))
            )
            instances.append(
                {
                    "key": str(key),
                    "locale": "he"
                    if HEBREW_RE.search(canonical_json(content_values))
                    else "en",
                    **content_values,
                    "minigame_id": minigame_id,
                    "params": params,
                    "source_path": str(path.relative_to(ROOT)),
                    "source_metadata": normalize(
                        {
                            key_name: value
                            for key_name, value in raw_instance.items()
                            if key_name not in GENERIC_MINI_KEY_FIELDS
                        }
                    ),
                }
            )
    instances.sort(key=lambda instance: (instance["key"], instance["locale"]))
    return instances


def quest_file_for(folder: Path, quest_id: str) -> Path | None:
    candidates = sorted(folder.glob(f"{quest_id}*.yaml"))
    return candidates[0] if candidates else None


def quest_step_key(quest_id: str, step: dict[str, Any], occurrence: int) -> str:
    digest = hashlib.sha1(canonical_json(step).encode("utf-8")).hexdigest()[:8]
    return f"{slug(quest_id)}_{slug(step.get('type'))}_{digest}_{occurrence + 1}"


def reward_records(
    rewards: Any,
    scope: str,
    step_id: str | None = None,
    source_path: str | None = None,
) -> list[dict[str, Any]]:
    if not isinstance(rewards, dict):
        return []
    result: list[dict[str, Any]] = []
    xp = rewards.get("xp")
    if xp is not None:
        result.append(
            {
                "scope": scope,
                "step_key": step_id,
                "reward_type": "xp",
                "xp_amount": int(xp or 0),
                "item_external_id": None,
                "amount": None,
                "source_metadata": {"source_path": source_path},
            }
        )
    for item in rewards.get("items") or []:
        if not isinstance(item, dict) or not item.get("id"):
            continue
        result.append(
            {
                "scope": scope,
                "step_key": step_id,
                "reward_type": "item",
                "xp_amount": None,
                "item_external_id": str(item["id"]),
                "amount": int(item.get("amount") or 1),
                "source_metadata": {"source_path": source_path},
            }
        )
    return result


def reference_kind(field_name: str) -> str | None:
    return {
        "npc_id": "npc",
        "location_id": "area",
        "world_object_id": "interactable",
        "item_id": "item",
        "reward_item_id": "item",
        "minigame_id": "minigame",
    }.get(field_name)


def build_bundle() -> dict[str, Any]:
    conflicts: list[dict[str, Any]] = []
    catalogs, catalog_ids = catalog_bundle()
    step_types, step_type_by_id = step_type_bundle()
    dialogues = dialogue_bundle(conflicts)
    minigames = minigame_bundle()
    dialogue_ids = {dialogue["key"] for dialogue in dialogues}
    minigame_instance_by_key = {
        f"{instance['key']}": instance for instance in minigames
    }

    questlines: list[dict[str, Any]] = []
    for folder in sorted(QUESTLINES_DIR.iterdir()):
        if not folder.is_dir():
            continue
        index_path = folder / "_index.yaml"
        if not index_path.exists():
            continue
        index = load_yaml(index_path)
        meta = index.get("questline") or {}
        questline_key = str(meta.get("id") or folder.name)
        quests_by_id = {
            str(entry.get("id")): entry
            for entry in (index.get("quests") or [])
            if isinstance(entry, dict) and entry.get("id")
        }
        source_mapping = (load_yaml(REGISTRY / "unity_mapping.yaml").get("questlines") or {}).get(
            questline_key, {}
        )
        line = {
            "key": questline_key,
            "display_name": str(meta.get("display_name") or folder.name),
            "theme": meta.get("theme"),
            "default_giver_external_id": meta.get("npc_id"),
            "status": "draft",
            "level_min": (meta.get("level_range") or [None, None])[0],
            "level_max": (meta.get("level_range") or [None, None])[-1],
            "source_path": str(index_path.relative_to(ROOT)),
            "source_metadata": normalize(
                {
                    "source_status": source_mapping.get("status"),
                    "source_note": source_mapping.get("note"),
                    "catalog_set": source_mapping.get("catalog_set"),
                    "quest_count": meta.get("quest_count"),
                }
            ),
            "quests": [],
        }

        for position, entry in enumerate(index.get("quests") or []):
            if not isinstance(entry, dict) or not entry.get("id"):
                continue
            quest_id = str(entry["id"])
            detail_path = quest_file_for(folder, quest_id)
            detail_data = load_yaml(detail_path) if detail_path else {}
            detail = detail_data.get("quest") or {}
            detail_rewards = detail_data.get("rewards") or {}
            index_rewards = entry.get("rewards")
            if isinstance(index_rewards, dict) and canonical_json(index_rewards) != canonical_json(detail_rewards):
                conflict(
                    conflicts,
                    "duplicated_rewards",
                    "warning",
                    "Quest index and detail file contain different rewards; index values are canonical.",
                    str(index_path.relative_to(ROOT)),
                    questline=questline_key,
                    quest_id=quest_id,
                    index_rewards=index_rewards,
                    detail_rewards=detail_rewards,
                )
            for field_name in ("name", "level", "prerequisite"):
                index_value = entry.get(field_name)
                detail_field = "level_required" if field_name == "level" else field_name
                detail_value = detail.get(detail_field)
                if (
                    index_value is not None
                    and detail_value is not None
                    and canonical_json(index_value) != canonical_json(detail_value)
                ):
                    conflict(
                        conflicts,
                        "duplicated_quest_metadata",
                        "warning",
                        f"Quest index and detail file differ for {field_name}; index value is canonical.",
                        str(index_path.relative_to(ROOT)),
                        questline=questline_key,
                        quest_id=quest_id,
                        field=field_name,
                        index_value=index_value,
                        detail_value=detail_value,
                    )

            steps_raw = detail_data.get("steps") or []
            if not isinstance(steps_raw, list):
                steps_raw = []
            giver = detail.get("giver_npc") or meta.get("npc_id")
            if not detail.get("giver_npc"):
                conflict(
                    conflicts,
                    "inherited_quest_giver",
                    "info",
                    "Quest does not define giver_npc; questline giver was inherited.",
                    str(detail_path.relative_to(ROOT)) if detail_path else str(index_path.relative_to(ROOT)),
                    questline=questline_key,
                    quest_id=quest_id,
                    inherited_giver=giver,
                )

            quest = {
                "key": quest_id,
                "position": position,
                "name": str(entry.get("name") or detail.get("name") or quest_id),
                "level_required": int(entry.get("level") if entry.get("level") is not None else detail.get("level_required") or 0),
                "giver_external_id": giver,
                "summary": detail.get("summary") or "",
                "wait_for_npc_turn_in": bool(detail.get("wait_for_npc_turn_in", False)),
                "start_dialogue_id": (
                    str(steps_raw[0].get("dialogue_id"))
                    if len(steps_raw) > 1
                    and isinstance(steps_raw[0], dict)
                    and steps_raw[0].get("type") == "talk_to_npc"
                    and steps_raw[0].get("dialogue_id")
                    else None
                ),
                "status": detail.get("status") or ("complete" if len(steps_raw) > 1 else "draft"),
                "prerequisites": [],
                "steps": [],
                "rewards": [],
                "source_path": str(detail_path.relative_to(ROOT)) if detail_path else None,
                "source_metadata": normalize(
                    {
                        "source_index_path": str(index_path.relative_to(ROOT)),
                        "source_detail": detail_data.get("quest", {}),
                    }
                ),
            }
            prerequisite = entry.get("prerequisite")
            if prerequisite is None:
                prerequisite = detail.get("prerequisite")
            if isinstance(prerequisite, list):
                quest["prerequisites"] = [str(item) for item in prerequisite if item]
            elif prerequisite:
                quest["prerequisites"] = [str(prerequisite)]
            for prerequisite_id in quest["prerequisites"]:
                if prerequisite_id not in quests_by_id:
                    conflict(
                        conflicts,
                        "missing_prerequisite",
                        "error",
                        "Prerequisite does not exist in the same questline.",
                        quest["source_path"] or str(index_path.relative_to(ROOT)),
                        questline=questline_key,
                        quest_id=quest_id,
                        prerequisite=prerequisite_id,
                    )

            canonical_rewards = index_rewards if isinstance(index_rewards, dict) else detail_rewards
            quest["rewards"] = reward_records(
                canonical_rewards,
                "quest",
                source_path=quest["source_path"],
            )

            occurrences: dict[str, int] = {}
            for step_position, raw_step in enumerate(steps_raw):
                if not isinstance(raw_step, dict):
                    conflict(
                        conflicts,
                        "invalid_step",
                        "error",
                        "Step must be a mapping.",
                        quest["source_path"] or str(index_path.relative_to(ROOT)),
                        questline=questline_key,
                        quest_id=quest_id,
                        position=step_position,
                    )
                    continue
                if (
                    step_position == 0
                    and len(steps_raw) > 1
                    and raw_step.get("type") == "talk_to_npc"
                    and raw_step.get("dialogue_id") == quest["start_dialogue_id"]
                ):
                    # The first NPC conversation is the quest opening dialogue,
                    # not a separate learning step. Keeping it here would make
                    # the editor show the same dialogue twice.
                    continue
                step_type = str(raw_step.get("type") or "")
                if step_type not in step_type_by_id:
                    conflict(
                        conflicts,
                        "unknown_step_type",
                        "error",
                        "Step type is not defined in systems.yaml.",
                        quest["source_path"] or str(index_path.relative_to(ROOT)),
                        questline=questline_key,
                        quest_id=quest_id,
                        step_type=step_type,
                    )
                occurrence = occurrences.get(step_type, 0)
                occurrences[step_type] = occurrence + 1
                stable_key = quest_step_key(quest_id, raw_step, occurrence)
                payload = normalize({key: value for key, value in raw_step.items() if key != "type"})
                step_metadata: dict[str, Any] = {
                    "source_position": step_position,
                    "source_path": quest["source_path"],
                }

                for field_name, field_value in raw_step.items():
                    kind = reference_kind(str(field_name))
                    if kind and field_value and str(field_value) not in catalog_ids.get(kind, set()):
                        conflict(
                            conflicts,
                            "missing_catalog_reference",
                            "error",
                            "Step references an ID that is not present in the imported catalog.",
                            quest["source_path"] or str(index_path.relative_to(ROOT)),
                            questline=questline_key,
                            quest_id=quest_id,
                            step_position=step_position,
                            field=field_name,
                            value=field_value,
                            expected_kind=kind,
                        )
                for dialogue_field in ("dialogue_id",):
                    dialogue_id = raw_step.get(dialogue_field)
                    if dialogue_id and str(dialogue_id) not in dialogue_ids:
                        conflict(
                            conflicts,
                            "missing_dialogue_reference",
                            "error",
                            "Step references a dialogue that is not imported.",
                            quest["source_path"] or str(index_path.relative_to(ROOT)),
                            questline=questline_key,
                            quest_id=quest_id,
                            step_position=step_position,
                            dialogue_id=dialogue_id,
                        )

                if step_type == "play_minigame":
                    explicit_instance_id = raw_step.get("instance_id")
                    legacy_instance_id = f"{quest_id}_s{step_position}"
                    instance_id = str(explicit_instance_id or legacy_instance_id)
                    if instance_id in minigame_instance_by_key:
                        payload["instance_key"] = instance_id
                    else:
                        candidates = sorted(
                            key
                            for key in minigame_instance_by_key
                            if key.startswith(f"{quest_id}_s")
                        )
                        step_metadata["legacy_instance_key"] = instance_id
                        step_metadata["instance_candidates"] = candidates
                        if candidates:
                            conflict(
                                conflicts,
                                "minigame_key_mismatch",
                                "warning",
                                "Minigame brief exists under a different legacy step key.",
                                quest["source_path"] or str(index_path.relative_to(ROOT)),
                                questline=questline_key,
                                quest_id=quest_id,
                                step_position=step_position,
                                expected_key=instance_id,
                                candidates=candidates,
                            )
                        else:
                            conflict(
                                conflicts,
                                "missing_minigame_instance",
                                "warning",
                                "Play-minigame step has no matching brief.",
                                quest["source_path"] or str(index_path.relative_to(ROOT)),
                                questline=questline_key,
                                quest_id=quest_id,
                                step_position=step_position,
                                expected_key=instance_id,
                            )

                step = {
                    "key": stable_key,
                    "position": step_position,
                    "type": step_type,
                    "payload": payload,
                    "source_metadata": step_metadata,
                    "rewards": [],
                }
                if raw_step.get("reward_item_id"):
                    reward = {
                        "scope": "step",
                        "step_key": stable_key,
                        "reward_type": "item",
                        "xp_amount": None,
                        "item_external_id": str(raw_step["reward_item_id"]),
                        "amount": int(raw_step.get("reward_amount") or 1),
                        "source_metadata": {
                            "source_path": quest["source_path"],
                            "source_field": "reward_item_id",
                        },
                    }
                    step["rewards"].append(reward)
                    if step_type not in {"play_minigame"}:
                        conflict(
                            conflicts,
                            "ambiguous_step_reward",
                            "warning",
                            "Step reward fields are not defined for this step type; kept as a step reward and preserved in payload.",
                            quest["source_path"] or str(index_path.relative_to(ROOT)),
                            questline=questline_key,
                            quest_id=quest_id,
                            step_type=step_type,
                            step_key=stable_key,
                        )
                quest["steps"].append(step)
            line["quests"].append(quest)
        questlines.append(line)

    document_questlines = []
    for line in questlines:
        document_questlines.append(
            {
                "key": line["key"],
                "display_name": line["display_name"],
                "theme": line["theme"],
                "default_giver_external_id": line["default_giver_external_id"],
                "quests": line["quests"],
            }
        )

    bundle = {
        "schema_version": 1,
        "importer_version": IMPORTER_VERSION,
        "source_root": str(ROOT),
        "catalog_entries": catalogs,
        "step_type_definitions": step_types,
        "dialogues": dialogues,
        "minigame_instances": minigames,
        "questlines": questlines,
        "conflicts": conflicts,
        "counts": {
            "catalog_entries": len(catalogs),
            "step_type_definitions": len(step_types),
            "dialogues": len(dialogues),
            "dialogue_lines": sum(len(dialogue["lines"]) for dialogue in dialogues),
            "minigame_instances": len(minigames),
            "questlines": len(questlines),
            "quests": sum(len(line["quests"]) for line in questlines),
            "steps": sum(len(quest["steps"]) for line in questlines for quest in line["quests"]),
            "errors": sum(1 for item in conflicts if item["severity"] == "error"),
            "warnings": sum(1 for item in conflicts if item["severity"] == "warning"),
            "info": sum(1 for item in conflicts if item["severity"] == "info"),
        },
        "revision_documents": document_questlines,
    }
    bundle["source_digest"] = hashlib.sha256(canonical_json(bundle).encode("utf-8")).hexdigest()
    return bundle


def insert_catalog_sql(bundle: dict[str, Any], kind: str | None = None) -> str:
    entries = [
        entry
        for entry in bundle["catalog_entries"]
        if kind is None or entry["kind"] == kind
    ]
    payload = json.dumps(
        entries,
        ensure_ascii=False,
        separators=(",", ":"),
    )
    return (
        "insert into public.catalog_entries "
        "(kind, external_id, name, description, status, image_path, metadata) "
        "select kind, external_id, name, description, status, image_path, metadata "
        f"from jsonb_to_recordset($seed${payload}$seed$::jsonb) as entries("
        "kind text, external_id text, name text, description text, status text, "
        "image_path text, metadata jsonb) "
        "on conflict (kind, external_id) do update set "
        "name = excluded.name, description = excluded.description, status = excluded.status, "
        "image_path = excluded.image_path, metadata = excluded.metadata, updated_at = now();\n"
    )


def insert_step_types_sql(bundle: dict[str, Any]) -> str:
    statements = []
    for definition in bundle["step_type_definitions"]:
        statements.append(
            "insert into public.step_type_definitions "
            "(id, unity_objective, description, fields, metadata) values "
            f"({sql_literal(definition['id'])}, {sql_literal(definition['unity_objective'])}, "
            f"{sql_literal(definition['description'])}, {json_sql(definition['fields'])}, "
            f"{json_sql(definition['metadata'])}) "
            "on conflict (id) do update set unity_objective = excluded.unity_objective, "
            "description = excluded.description, fields = excluded.fields, metadata = excluded.metadata, "
            "updated_at = now();"
        )
    return "\n".join(statements) + "\n"


def insert_dialogues_sql(bundle: dict[str, Any], source_path: str | None = None) -> str:
    selected_dialogues = [
        dialogue
        for dialogue in bundle["dialogues"]
        if source_path is None or dialogue["source_path"] == source_path
    ]
    dialogue_rows = [
        {
            key: dialogue[key]
            for key in ("key", "speaker_external_id", "source_path", "source_metadata")
        }
        for dialogue in selected_dialogues
    ]
    line_rows = [
        {
            "dialogue_key": dialogue["key"],
            **line,
        }
        for dialogue in selected_dialogues
        for line in dialogue["lines"]
    ]
    return (
        "insert into public.dialogues (key, speaker_external_id, source_path, source_metadata) "
        f"select key, speaker_external_id, source_path, source_metadata from jsonb_to_recordset({dollar_json(dialogue_rows)}) "
        "as entries(key text, speaker_external_id text, source_path text, source_metadata jsonb) "
        "on conflict (key) do update set speaker_external_id = excluded.speaker_external_id, "
        "source_path = excluded.source_path, source_metadata = excluded.source_metadata, updated_at = now();\n"
        "insert into public.dialogue_lines "
        "(dialogue_id, locale, line_order, content, line_format) "
        f"select dialogues.id, lines.locale, lines.line_order, lines.content, lines.line_format "
        f"from jsonb_to_recordset({dollar_json(line_rows)}) as lines("
        "dialogue_key text, locale text, line_order integer, content text, line_format text) "
        "join public.dialogues on dialogues.key = lines.dialogue_key "
        "on conflict (dialogue_id, locale, line_order) do update set "
        "content = excluded.content, line_format = excluded.line_format;\n"
    )


def insert_minigames_sql(bundle: dict[str, Any], source_path: str | None = None) -> str:
    instances = [
        instance
        for instance in bundle["minigame_instances"]
        if source_path is None or instance["source_path"] == source_path
    ]
    return (
        "insert into public.minigame_instances "
        "(key, locale, instruction, tasks, target, variant, success, minigame_id, params, source_path, source_metadata) "
        f"select key, locale, instruction, tasks, target, variant, success, minigame_id, params, source_path, source_metadata "
        f"from jsonb_to_recordset({dollar_json(instances)}) as entries("
        "key text, locale text, instruction text, tasks jsonb, target text, variant text, "
        "success text, minigame_id text, params jsonb, source_path text, source_metadata jsonb) "
        "on conflict (key, locale) do update set instruction = excluded.instruction, "
        "tasks = excluded.tasks, target = excluded.target, variant = excluded.variant, "
        "success = excluded.success, minigame_id = excluded.minigame_id, params = excluded.params, "
        "source_path = excluded.source_path, "
        "source_metadata = excluded.source_metadata, updated_at = now();\n"
    )


def questline_lookup(key: str) -> str:
    return f"(select id from public.questlines where key = {sql_literal(key)})"


def quest_lookup(line_key: str, quest_key: str) -> str:
    return (
        "(select id from public.quests where questline_id = "
        f"{questline_lookup(line_key)} and key = {sql_literal(quest_key)})"
    )


def step_lookup(line_key: str, quest_key: str, step_key: str) -> str:
    return (
        "(select id from public.quest_steps where quest_id = "
        f"{quest_lookup(line_key, quest_key)} and key = {sql_literal(step_key)})"
    )


def insert_questlines_sql(bundle: dict[str, Any]) -> str:
    statements = []
    for line in bundle["questlines"]:
        statements.append(
            "insert into public.questlines "
            "(key, display_name, theme, default_giver_external_id, status, level_min, level_max, source_path, source_metadata) values "
            f"({sql_literal(line['key'])}, {sql_literal(line['display_name'])}, "
            f"{sql_literal(line['theme'])}, {sql_literal(line['default_giver_external_id'])}, "
            f"{sql_literal(line['status'])}, {sql_literal(line['level_min'])}, "
            f"{sql_literal(line['level_max'])}, {sql_literal(line['source_path'])}, "
            f"{json_sql(line['source_metadata'])}) "
            "on conflict (key) do update set display_name = excluded.display_name, theme = excluded.theme, "
            "default_giver_external_id = excluded.default_giver_external_id, status = excluded.status, "
            "level_min = excluded.level_min, level_max = excluded.level_max, "
            "source_path = excluded.source_path, source_metadata = excluded.source_metadata, updated_at = now();"
        )
    return "\n".join(statements) + "\n"


def insert_quests_sql(bundle: dict[str, Any]) -> str:
    statements = []
    for line in bundle["questlines"]:
        for quest in line["quests"]:
            statements.append(
                "insert into public.quests "
                "(questline_id, key, position, name, level_required, giver_external_id, summary, wait_for_npc_turn_in, status, source_path, source_metadata) values "
                f"({questline_lookup(line['key'])}, {sql_literal(quest['key'])}, {quest['position']}, "
                f"{sql_literal(quest['name'])}, {quest['level_required']}, "
                f"{sql_literal(quest['giver_external_id'])}, {sql_literal(quest['summary'])}, "
                f"{'true' if quest['wait_for_npc_turn_in'] else 'false'}, "
                f"{sql_literal(quest['status'])}, {sql_literal(quest['source_path'])}, "
                f"{json_sql(quest['source_metadata'])}) "
                "on conflict (questline_id, key) do update set position = excluded.position, "
                "name = excluded.name, level_required = excluded.level_required, "
                "giver_external_id = excluded.giver_external_id, summary = excluded.summary, "
                "wait_for_npc_turn_in = excluded.wait_for_npc_turn_in, "
                "status = excluded.status, source_path = excluded.source_path, "
                "source_metadata = excluded.source_metadata, updated_at = now();"
            )
    return "\n".join(statements) + "\n"


def insert_steps_sql(bundle: dict[str, Any]) -> str:
    statements = []
    for line in bundle["questlines"]:
        for quest in line["quests"]:
            for step in quest["steps"]:
                statements.append(
                    "insert into public.quest_steps "
                    "(quest_id, key, position, step_type, payload, source_metadata) values "
                    f"({quest_lookup(line['key'], quest['key'])}, {sql_literal(step['key'])}, "
                    f"{step['position']}, {sql_literal(step['type'])}, {json_sql(step['payload'])}, "
                    f"{json_sql(step['source_metadata'])}) "
                    "on conflict (quest_id, key) do update set position = excluded.position, "
                    "step_type = excluded.step_type, payload = excluded.payload, "
                    "source_metadata = excluded.source_metadata, updated_at = now();"
                )
    return "\n".join(statements) + "\n"


def insert_edges_and_rewards_sql(bundle: dict[str, Any]) -> str:
    statements = []
    for line in bundle["questlines"]:
        for quest in line["quests"]:
            for prerequisite in quest["prerequisites"]:
                statements.append(
                    "insert into public.quest_prerequisites (quest_id, prerequisite_quest_id) values "
                    f"({quest_lookup(line['key'], quest['key'])}, "
                    f"{quest_lookup(line['key'], prerequisite)}) on conflict do nothing;"
                )
            for reward in quest["rewards"]:
                if reward["scope"] == "quest":
                    statements.append(
                        "insert into public.quest_rewards "
                        "(scope, quest_id, reward_type, xp_amount, item_external_id, amount, source_metadata) values "
                        f"('quest', {quest_lookup(line['key'], quest['key'])}, "
                        f"{sql_literal(reward['reward_type'])}, {sql_literal(reward['xp_amount'])}, "
                        f"{sql_literal(reward['item_external_id'])}, {sql_literal(reward['amount'])}, "
                        f"{json_sql(reward['source_metadata'])});"
                    )
            for step in quest["steps"]:
                for reward in step["rewards"]:
                    statements.append(
                        "insert into public.quest_rewards "
                        "(scope, step_id, reward_type, xp_amount, item_external_id, amount, source_metadata) values "
                        f"('step', {step_lookup(line['key'], quest['key'], step['key'])}, "
                        f"{sql_literal(reward['reward_type'])}, {sql_literal(reward['xp_amount'])}, "
                        f"{sql_literal(reward['item_external_id'])}, {sql_literal(reward['amount'])}, "
                        f"{json_sql(reward['source_metadata'])});"
                    )
    return "\n".join(statements) + "\n"


def insert_revisions_sql(bundle: dict[str, Any]) -> str:
    statements = []
    for document in bundle["revision_documents"]:
        line = next(line for line in bundle["questlines"] if line["key"] == document["key"])
        validation = {
            "schema_version": bundle["schema_version"],
            "source_digest": bundle["source_digest"],
            "conflict_count": sum(
                1
                for item in bundle["conflicts"]
                if item.get("context", {}).get("questline") == line["key"]
            ),
            "imported": True,
        }
        statements.append(
            "insert into public.questline_revisions "
            "(questline_id, version, schema_version, status, document, validation_summary) values "
            f"({questline_lookup(line['key'])}, 1, {bundle['schema_version']}, 'draft', "
            f"{json_sql(document)}, {json_sql(validation)}) "
            "on conflict (questline_id, version) do update set schema_version = excluded.schema_version, "
            "status = excluded.status, document = excluded.document, "
            "validation_summary = excluded.validation_summary;"
        )
    return "\n".join(statements) + "\n"


def reset_sql() -> str:
    return """-- Generated by import_yaml_to_supabase.py --reset
delete from public.questline_revisions;
delete from public.audit_log;
delete from public.quest_rewards;
delete from public.quest_prerequisites;
delete from public.quest_steps;
delete from public.quests;
delete from public.questlines;
delete from public.dialogue_lines;
delete from public.dialogues;
delete from public.minigame_instances;
delete from public.catalog_entries;
"""


_DOLLAR_TAG_RE = re.compile(r"\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$")


def split_sql_statements(sql: str, max_chars: int = 90000) -> list[str]:
    """Split generated SQL without splitting semicolons inside string literals.

    Handles both single-quoted literals (with '' escapes) and PostgreSQL
    dollar-quoted strings ($tag$ ... $tag$, e.g. the `$seed$` JSON payloads),
    so `;` inside JSON text does not break statements apart.
    """
    statements: list[str] = []
    current: list[str] = []
    in_string = False
    dollar_tag: str | None = None
    index = 0
    length = len(sql)
    while index < length:
        char = sql[index]
        if dollar_tag:
            if sql.startswith(dollar_tag, index):
                current.append(dollar_tag)
                index += len(dollar_tag)
                dollar_tag = None
            else:
                current.append(char)
                index += 1
            continue
        current.append(char)
        if char == "'":
            if in_string and index + 1 < length and sql[index + 1] == "'":
                current.append(sql[index + 1])
                index += 1
            else:
                in_string = not in_string
        elif char == "$":
            match = _DOLLAR_TAG_RE.match(sql, index)
            if match:
                tag = match.group(0)
                dollar_tag = tag
                current.append(tag[1:])
                index += len(tag) - 1
        elif char == ";" and not in_string:
            statement = "".join(current).strip()
            if statement:
                statements.append(statement)
            current = []
        index += 1
    remainder = "".join(current).strip()
    if remainder:
        statements.append(remainder)

    chunks: list[str] = []
    chunk: list[str] = []
    chunk_size = 0
    for statement in statements:
        statement_with_newline = statement + "\n"
        if chunk and chunk_size + len(statement_with_newline) > max_chars:
            chunks.append("".join(chunk))
            chunk = []
            chunk_size = 0
        chunk.append(statement_with_newline)
        chunk_size += len(statement_with_newline)
    if chunk:
        chunks.append("".join(chunk))
    return chunks


def write_outputs(bundle: dict[str, Any], output_dir: Path, report_path: Path, sql_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    sql_dir.mkdir(parents=True, exist_ok=True)
    report_path.parent.mkdir(parents=True, exist_ok=True)

    bundle_path = output_dir / "quest_content_bundle.json"
    bundle_path.write_text(json.dumps(bundle, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    report_path.write_text(
        json.dumps(
            {
                "importer_version": bundle["importer_version"],
                "source_digest": bundle["source_digest"],
                "counts": bundle["counts"],
                "conflicts": bundle["conflicts"],
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    dialogue_batches = {
        f"03_dialogues_{path.stem}.sql": insert_dialogues_sql(
            bundle, str(path.relative_to(ROOT))
        )
        for path in sorted((REGISTRY / "dialogues").glob("*.yaml"))
    }
    minigame_batches = {
        f"04_minigames_{path.stem}.sql": insert_minigames_sql(
            bundle, str(path.relative_to(ROOT))
        )
        for path in sorted((REGISTRY / "minigame_instances").glob("*.yaml"))
    }

    batches = {
        "00_reset.sql": reset_sql(),
        "01_catalog_area.sql": insert_catalog_sql(bundle, "area"),
        "01_catalog_npc.sql": insert_catalog_sql(bundle, "npc"),
        "01_catalog_interactable.sql": insert_catalog_sql(bundle, "interactable"),
        "01_catalog_item.sql": insert_catalog_sql(bundle, "item"),
        "01_catalog_minigame.sql": insert_catalog_sql(bundle, "minigame"),
        "02_step_types.sql": insert_step_types_sql(bundle),
        **dialogue_batches,
        **minigame_batches,
        "05_questlines.sql": insert_questlines_sql(bundle),
        "06_quests.sql": insert_quests_sql(bundle),
        "07_steps.sql": insert_steps_sql(bundle),
        "08_edges_rewards.sql": insert_edges_and_rewards_sql(bundle),
        "09_revisions.sql": insert_revisions_sql(bundle),
    }
    for prefix in ("01_catalog", "02_step_types", "03_dialogues", "04_minigames"):
        for old_file in sql_dir.glob(f"{prefix}*.sql"):
            old_file.unlink()
    for filename, content in batches.items():
        chunks = split_sql_statements(content)
        if len(chunks) == 1:
            for old_file in sql_dir.glob(f"{Path(filename).stem}_*.sql"):
                old_file.unlink()
            (sql_dir / filename).write_text(chunks[0], encoding="utf-8")
            continue
        (sql_dir / filename).unlink(missing_ok=True)
        for old_file in sql_dir.glob(f"{Path(filename).stem}_*.sql"):
            old_file.unlink()
        for index, chunk in enumerate(chunks, start=1):
            chunk_name = f"{Path(filename).stem}_{index:03d}.sql"
            (sql_dir / chunk_name).write_text(chunk, encoding="utf-8")

    print(json.dumps(bundle["counts"], ensure_ascii=False, sort_keys=True))
    print(f"bundle: {bundle_path}")
    print(f"report: {report_path}")
    print(f"sql: {sql_dir}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=ROOT / "supabase" / "seed",
    )
    parser.add_argument(
        "--report",
        type=Path,
        default=ROOT / "reports" / "quest_import_report.json",
    )
    parser.add_argument(
        "--sql-dir",
        type=Path,
        default=ROOT / "supabase" / "seed" / "generated",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    global ROOT, REGISTRY, QUESTLINES_DIR
    ROOT = args.root.resolve()
    REGISTRY = ROOT / "_registry"
    QUESTLINES_DIR = ROOT / "questlines"
    bundle = build_bundle()
    write_outputs(bundle, args.output_dir.resolve(), args.report.resolve(), args.sql_dir.resolve())


if __name__ == "__main__":
    main()
