#!/usr/bin/env python3
"""Export questline documents into the canonical `questlines/<key>/` YAML authoring files.

This is the reverse direction of scripts/import_yaml_to_supabase.py for the
quests section: the editor publishes questline documents to Supabase, and this
script writes the `_index.yaml` plus one quest file per quest so the game's
Unity pipeline (QuestLineBuilder / specs) can be regenerated from them.

The document shape is the one produced by `buildSnapshotDocument` in the editor
and stored on `questline_revisions.document` (a single document) or grouped
under `questlines` in `quest_content_bundle.json`.

Supported inputs:
  --input file.json     A bundle {"questlines": [...]}, a single document, or a list.
  --supabase            Fetch the latest published revision per questline via REST.
                        Requires QUEST_SUPABASE_URL and QUEST_SUPABASE_ANON_KEY env vars.
  stdin                 JSON read from stdin when no --input/--supabase is given.

Run:
  python scripts/export_questlines_to_yaml.py --dry-run --input supabase/seed/quest_content_bundle.json
  python scripts/export_questlines_to_yaml.py --supabase
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

PLAIN_SAFE = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9_.\-]*$")
RESERVED_WORDS = {"true", "false", "null", "yes", "no", "on", "off", "~"}


def _scalar(value) -> str:
    """Render a single YAML scalar in the compact style used by the registry."""
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        return repr(value)
    text = str(value)
    if PLAIN_SAFE.match(text) and text.lower() not in RESERVED_WORDS:
        return text
    escaped = text.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


def _flow_list(values) -> str:
    return "[" + ", ".join(_scalar(item) for item in values) + "]"


def _flow_rewards(xp: int, items: list[dict]) -> str:
    parts = [f"xp: {xp}"]
    if items:
        rendered = ", ".join(
            f"{{ id: {_scalar(item['id'])}, amount: {_scalar(item['amount'])} }}" for item in items
        )
        parts.append(f"items: [{rendered}]")
    else:
        parts.append("items: []")
    return "{ " + ", ".join(parts) + " }"


def _flow_prerequisite(prerequisites) -> str:
    if not prerequisites:
        return "null"
    if len(prerequisites) == 1:
        return _scalar(prerequisites[0])
    return _flow_list(prerequisites)


def _load_step_field_order() -> dict[str, list[str]]:
    """Canonical step field order from _registry/systems.yaml (best-effort)."""
    try:
        import yaml  # noqa: PLC0415

        spec_path = ROOT / "_registry" / "systems.yaml"
        data = yaml.safe_load(spec_path.read_text(encoding="utf-8")) or {}
    except Exception:  # pragma: no cover - PyYAML absent or file unreadable
        return {}
    order: dict[str, list[str]] = {}
    for step_id, spec in (data.get("step_types") or {}).items():
        fields = spec.get("fields") or {}
        order[str(step_id)] = list(fields.keys())
    return order


STEP_FIELD_ORDER = _load_step_field_order()


def _normalized_payload(payload: dict) -> dict:
    """Rename the pipeline's `instance_key` back to the canonical `instance_id`."""
    normalized = dict(payload or {})
    if "instance_key" in normalized:
        if "instance_id" not in normalized:
            normalized["instance_id"] = normalized.pop("instance_key")
        else:
            del normalized["instance_key"]
    return normalized


def _ordered_field_names(payload: dict, step_type: str) -> list[str]:
    order = STEP_FIELD_ORDER.get(step_type)
    if not order:
        return list(payload.keys())
    return [name for name in order if name in payload] + [
        name for name in payload if name not in order
    ]


def _step_item_reward(step: dict) -> dict | None:
    for reward in step.get("rewards") or []:
        if reward.get("reward_type") == "item":
            return {
                "item_external_id": reward.get("item_external_id"),
                "amount": int(reward.get("amount") or 1),
            }
    return None


def _render_step(step: dict) -> list[str]:
    payload = _normalized_payload(step.get("payload") or {})
    step_type = str(step.get("type") or "")
    lines = [f"  - type: {_scalar(step_type)}"]
    for name in _ordered_field_names(payload, step_type):
        if name in ("reward_item_id", "reward_amount"):
            continue
        lines.append(f"    {name}: {_scalar(payload[name])}")
    reward = _step_item_reward(step)
    if reward:
        lines.append(f"    reward_item_id: {_scalar(reward['item_external_id'])}")
        lines.append(f"    reward_amount: {_scalar(reward['amount'])}")
    return lines


def _quest_rewards(quest: dict) -> tuple[int, list[dict]]:
    xp = 0
    items: list[dict] = []
    for reward in quest.get("rewards") or []:
        if reward.get("scope") == "quest":
            if reward.get("reward_type") == "xp":
                xp += int(reward.get("xp_amount") or 0)
            elif reward.get("reward_type") == "item" and reward.get("item_external_id"):
                items.append(
                    {
                        "id": str(reward["item_external_id"]),
                        "amount": int(reward.get("amount") or 1),
                    }
                )
    return xp, items


def _quest_yaml(quest: dict, doc: dict) -> str:
    xp, items = _quest_rewards(quest)
    giver = quest.get("giver_external_id") or doc.get("default_giver_external_id") or ""
    lines = [
        "quest:",
        f"  id: {_scalar(quest.get('key'))}",
        f"  name: {_scalar(quest.get('name') or quest.get('key'))}",
        f"  level_required: {_scalar(quest.get('level_required') or 0)}",
        f"  giver_npc: {_scalar(giver)}",
        f"  prerequisite: {_flow_prerequisite(quest.get('prerequisites'))}",
        f"  summary: {_scalar(quest.get('summary') or '')}",
        f"  wait_for_npc_turn_in: {str(bool(quest.get('wait_for_npc_turn_in', False))).lower()}",
        "",
        f"rewards: {_flow_rewards(xp, items)}",
        "",
        "steps:",
    ]
    steps = sorted(
        quest.get("steps") or [],
        key=lambda step: (step.get("position", 0), step.get("key", "")),
    )
    for index, step in enumerate(steps):
        if index > 0:
            lines.append("")
        lines.extend(_render_step(step))
    return "\n".join(lines) + "\n"


def _index_yaml(doc: dict) -> str:
    quests = sorted(
        doc.get("quests") or [],
        key=lambda quest: quest.get("position", 0),
    )
    levels = [int(quest.get("level_required") or 0) for quest in quests]
    level_range = (
        [int(doc["level_min"]), int(doc["level_max"])]
        if doc.get("level_min") is not None and doc.get("level_max") is not None
        else ([min(levels), max(levels)] if levels else [0, 0])
    )
    lines = [
        "questline:",
        f"  id: {_scalar(doc.get('key'))}",
        f"  npc_id: {_scalar(doc.get('default_giver_external_id'))}",
        f"  display_name: {_scalar(doc.get('display_name') or doc.get('key'))}",
        f"  theme: {_scalar(doc.get('theme') or '')}",
        f"  quest_count: {len(quests)}",
        f"  level_range: [{level_range[0]}, {level_range[1]}]",
        "",
        "quests:",
    ]
    for quest in quests:
        xp, items = _quest_rewards(quest)
        lines.append(f"  - id: {_scalar(quest.get('key'))}")
        lines.append(f"    name: {_scalar(quest.get('name') or quest.get('key'))}")
        lines.append(f"    level: {_scalar(quest.get('level_required') or 0)}")
        lines.append(f"    prerequisite: {_flow_prerequisite(quest.get('prerequisites'))}")
        lines.append(f"    rewards: {_flow_rewards(xp, items)}")
    return "\n".join(lines) + "\n"


def load_documents(data) -> list[dict]:
    """Normalize a bundle / single document / list of documents into questline docs."""
    if isinstance(data, list):
        return [doc for doc in data if isinstance(doc, dict) and "quests" in doc]
    if isinstance(data, dict):
        if "questlines" in data and isinstance(data["questlines"], list):
            return [doc for doc in data["questlines"] if isinstance(doc, dict)]
        if isinstance(data.get("document"), dict) and "quests" in data["document"]:
            return [data["document"]]
        if "quests" in data:
            return [data]
    return []


def export_documents(documents: list[dict]) -> dict[str, dict[str, str]]:
    """Map questline key -> {file name: yaml content}."""
    exported: dict[str, dict[str, str]] = {}
    for doc in documents:
        line_key = str(doc.get("key") or "")
        if not line_key:
            raise ValueError("Document is missing its questline key.")
        if line_key in exported:
            raise ValueError(f"Duplicate questline key '{line_key}' in input documents.")
        files: dict[str, str] = {"_index.yaml": _index_yaml(doc)}
        for quest in doc.get("quests") or []:
            quest_key = str(quest.get("key") or "")
            if not quest_key:
                raise ValueError(f"Quest in questline '{line_key}' is missing its key.")
            files[f"{quest_key}.yaml"] = _quest_yaml(quest, doc)
        exported[line_key] = files
    return exported


def write_files(exported: dict[str, dict[str, str]], out_root: Path) -> list[Path]:
    written: list[Path] = []
    questlines_dir = Path(out_root) / "questlines"
    for line_key, files in sorted(exported.items()):
        line_dir = questlines_dir / line_key
        for file_name, content in sorted(files.items()):
            target = line_dir / file_name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content, encoding="utf-8", newline="\n")
            written.append(target)
    return written


def fetch_supabase_documents(base_url: str, anon_key: str) -> list[dict]:
    """Fetch the latest published revision document per questline via REST."""
    import urllib.request  # noqa: PLC0415

    endpoint = (
        f"{base_url.rstrip('/')}/rest/v1/questline_revisions"
        "?select=document,status,published_at&order=published_at.desc.nullslast,created_at.desc&limit=2000"
    )
    request = urllib.request.Request(
        endpoint,
        headers={"apikey": anon_key, "Authorization": f"Bearer {anon_key}"},
    )
    with urllib.request.urlopen(request) as response:
        rows = json.load(response)
    latest: dict[str, dict] = {}
    for row in rows:
        if row.get("status") != "published":
            continue
        document = row.get("document")
        if isinstance(document, dict) and "quests" in document and document.get("key"):
            latest.setdefault(str(document["key"]), document)
    return list(latest.values())


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--input", help="JSON file: bundle, single document, or list of documents.")
    parser.add_argument("--supabase", action="store_true", help="Fetch published revisions from Supabase.")
    parser.add_argument("--out", default=str(ROOT), help="Base output directory (default: repo root).")
    parser.add_argument("--dry-run", action="store_true", help="Print the files that would be written.")
    args = parser.parse_args(argv)

    if args.supabase:
        base_url = __import__("os").environ.get("QUEST_SUPABASE_URL")
        anon_key = __import__("os").environ.get("QUEST_SUPABASE_ANON_KEY")
        if not base_url or not anon_key:
            print("QUEST_SUPABASE_URL / QUEST_SUPABASE_ANON_KEY must be set for --supabase.", file=sys.stderr)
            return 2
        documents = fetch_supabase_documents(base_url, anon_key)
    elif args.input:
        documents = load_documents(json.loads(Path(args.input).read_text(encoding="utf-8")))
    else:
        documents = load_documents(json.load(sys.stdin))

    if not documents:
        print("No questline documents found in the input.", file=sys.stderr)
        return 2

    exported = export_documents(documents)
    if args.dry_run:
        for line_key in sorted(exported):
            for file_name in sorted(exported[line_key]):
                print(f"would write questlines/{line_key}/{file_name}")
        print(f"{sum(len(files) for files in exported.values())} files, {len(exported)} questlines (dry run)")
        return 0

    written = write_files(exported, Path(args.out))
    for target in written:
        print(f"wrote {target.relative_to(ROOT) if str(target).startswith(str(ROOT)) else target}")
    print(f"{len(written)} files, {len(exported)} questlines")
    return 0


if __name__ == "__main__":
    sys.exit(main())
