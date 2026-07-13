#!/usr/bin/env python3
"""Build interactive quest presentation from YAML source files."""

from __future__ import annotations

import json
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
REGISTRY = ROOT / "_registry"
DIALOGUES_DIR = REGISTRY / "dialogues"
MINIGAME_INSTANCES_DIR = REGISTRY / "minigame_instances"
QUESTLINES = ROOT / "questlines"
LOCALE_UI = ROOT / "presentation" / "locale" / "he.yaml"
LOCALE_CONTENT = REGISTRY / "locale" / "he-content.yaml"
OUT_JSON = ROOT / "presentation" / "quests-data.json"
OUT_HTML = ROOT / "presentation" / "viewer.html"
TEMPLATE = ROOT / "presentation" / "viewer-template.html"


def load_yaml(path: Path) -> dict:
    with path.open(encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def deep_merge(base: dict, overlay: dict) -> dict:
    result = dict(base)
    for key, value in overlay.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = deep_merge(result[key], value)
        else:
            result[key] = value
    return result


def parse_quest_file(path: Path) -> dict:
    raw = path.read_text(encoding="utf-8")
    lines = [ln for ln in raw.splitlines() if not ln.strip().startswith("#")]
    data = yaml.safe_load("\n".join(lines)) or {}
    quest = data.get("quest", {})
    rewards = data.get("rewards", {})
    steps = data.get("steps", []) or []
    return {
        "id": quest.get("id"),
        "name": quest.get("name"),
        "level": quest.get("level_required"),
        "prerequisite": quest.get("prerequisite"),
        "summary": quest.get("summary"),
        "status": quest.get("status", "complete" if len(steps) > 1 else "draft"),
        "rewards": {
            "xp": rewards.get("xp", 0),
            "items": rewards.get("items") or [],
        },
        "steps": steps,
    }


def load_dialogues() -> dict:
    """Load all dialogue scripts from _registry/dialogues/*.yaml."""
    dialogues: dict = {}
    if not DIALOGUES_DIR.exists():
        return dialogues
    for path in sorted(DIALOGUES_DIR.glob("*.yaml")):
        file_dialogues = load_yaml(path).get("dialogues", {})
        dialogues.update(file_dialogues)
    return dialogues


def load_minigame_instances() -> dict:
    """Load per-step minigame briefs from _registry/minigame_instances/*.yaml."""
    instances: dict = {}
    if not MINIGAME_INSTANCES_DIR.exists():
        return instances
    for path in sorted(MINIGAME_INSTANCES_DIR.glob("*.yaml")):
        file_instances = load_yaml(path).get("instances", {})
        instances.update(file_instances)
    return instances


def attach_minigame_briefs(quests: list, instances: dict) -> None:
    """Attach instance briefs to play_minigame steps (key: {quest_id}_s{index})."""
    for quest in quests:
        quest_id = quest.get("id")
        for index, step in enumerate(quest.get("steps") or []):
            if step.get("type") != "play_minigame":
                continue
            key = step.get("instance_id") or f"{quest_id}_s{index}"
            brief = instances.get(key)
            if brief:
                step["minigame_brief"] = brief


def apply_hebrew_content(data: dict, he: dict) -> dict:
    """Merge Hebrew names and summaries into presentation data."""
    if he.get("npcs"):
        for npc_id, fields in he["npcs"].items():
            if npc_id in data["npcs"]:
                data["npcs"][npc_id] = deep_merge(data["npcs"][npc_id], fields)

    if he.get("items"):
        for item_id, fields in he["items"].items():
            if item_id in data["items"]:
                data["items"][item_id] = deep_merge(data["items"][item_id], fields)

    if he.get("minigames"):
        for mg_id, fields in he["minigames"].items():
            if mg_id in data["minigames"]:
                data["minigames"][mg_id] = deep_merge(data["minigames"][mg_id], fields)
            else:
                data["minigames"][mg_id] = fields

    data["locations"] = he.get("locations", {})
    data["enemies"] = he.get("enemies", {})

    ql_he = he.get("questlines", {})
    for ql in data["questlines"]:
        line_he = ql_he.get(ql["id"], {})
        if line_he.get("display_name"):
            ql["displayName"] = line_he["display_name"]
        if line_he.get("theme"):
            ql["theme"] = line_he["theme"]

        quests_he = line_he.get("quests", {})
        npc_id = ql.get("npcId")
        if npc_id and npc_id in data["npcs"]:
            n = data["npcs"][npc_id]
            ql["npc"]["name"] = n.get("name", ql["npc"]["name"])
            ql["npc"]["title"] = n.get("title", ql["npc"]["title"])
            ql["npc"]["location"] = n.get("location", ql["npc"]["location"])
            ql["npc"]["description"] = n.get("description", ql["npc"]["description"])

        for quest in ql["quests"]:
            q_he = quests_he.get(quest["id"], {})
            if q_he.get("name"):
                quest["name"] = q_he["name"]
            if q_he.get("summary"):
                quest["summary"] = q_he["summary"]
            elif not quest.get("summary") or str(quest.get("summary", "")).startswith("TODO"):
                quest["summary"] = q_he.get("summary", "טרם הוגדר תקציר.")

    return data


def build() -> dict:
    npcs = load_yaml(REGISTRY / "npcs.yaml").get("npcs", {})
    items = load_yaml(REGISTRY / "items.yaml").get("items", {})
    step_types = load_yaml(REGISTRY / "systems.yaml").get("step_types", {})
    minigames = load_yaml(REGISTRY / "minigames.yaml").get("minigames", {})
    locale = load_yaml(LOCALE_UI)
    he_content = load_yaml(LOCALE_CONTENT) if LOCALE_CONTENT.exists() else {}

    questlines = []
    for folder in sorted(QUESTLINES.iterdir()):
        if not folder.is_dir():
            continue
        index_path = folder / "_index.yaml"
        if not index_path.exists():
            continue

        index = load_yaml(index_path)
        meta = index.get("questline", {})
        npc_id = meta.get("npc_id")
        npc = npcs.get(npc_id, {})

        quests = []
        for entry in index.get("quests", []):
            quest_id = entry["id"]
            quest_files = list(folder.glob(f"{quest_id}*.yaml"))
            if quest_files:
                detail = parse_quest_file(quest_files[0])
            else:
                detail = {
                    "id": quest_id,
                    "name": entry.get("name"),
                    "level": entry.get("level"),
                    "prerequisite": entry.get("prerequisite"),
                    "summary": "",
                    "status": "draft",
                    "steps": [],
                    "rewards": {"xp": 0, "items": []},
                }

            rewards = entry.get("rewards", {})
            if isinstance(rewards, dict):
                detail["rewards"] = {
                    "xp": rewards.get("xp", detail["rewards"].get("xp", 0)),
                    "items": rewards.get("items", detail["rewards"].get("items", [])),
                }
            detail["name"] = entry.get("name", detail.get("name"))
            detail["level"] = entry.get("level", detail.get("level"))
            detail["prerequisite"] = entry.get("prerequisite", detail.get("prerequisite"))
            quests.append(detail)

        instances = load_minigame_instances()
        attach_minigame_briefs(quests, instances)

        questlines.append(
            {
                "id": meta.get("id", folder.name),
                "folder": folder.name,
                "displayName": meta.get("display_name", folder.name),
                "theme": meta.get("theme", ""),
                "levelRange": meta.get("level_range", []),
                "questCount": meta.get("quest_count", len(quests)),
                "npcId": npc_id,
                "npc": {
                    "id": npc_id,
                    "name": npc.get("name", npc_id),
                    "title": npc.get("title", ""),
                    "location": npc.get("location", ""),
                    "description": npc.get("description", ""),
                },
                "quests": quests,
            }
        )

    data = {
        "lang": "he",
        "dir": "rtl",
        "locale": locale,
        "npcs": npcs,
        "items": items,
        "stepTypes": step_types,
        "minigames": minigames,
        "dialogues": load_dialogues(),
        "locations": {},
        "enemies": {},
        "questlines": questlines,
    }

    return apply_hebrew_content(data, he_content)


def main() -> None:
    data = build()
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

    if TEMPLATE.exists():
        template = TEMPLATE.read_text(encoding="utf-8")
        html = template.replace("/*__QUEST_DATA__*/", json.dumps(data, ensure_ascii=False))
        OUT_HTML.write_text(html, encoding="utf-8")
        print(f"Wrote {OUT_HTML}")
    else:
        print(f"Wrote {OUT_JSON} (no template found)")


if __name__ == "__main__":
    main()
