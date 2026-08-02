#!/usr/bin/env python3
"""Export SoftKitty items + icons from the Unity English Kingdom project into QuestSystem.

Reads ItemObject.asset (IdManager + items), resolves icon GUIDs via .meta files,
copies PNGs to _registry/images/items/, and writes _registry/softkitty_items.yaml.

Usage (from QuestSystem root):
  python scripts/export_softkitty_items.py
  python scripts/export_softkitty_items.py --unity "C:/path/to/English Kingdom"
"""

from __future__ import annotations

import argparse
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REGISTRY = ROOT / "_registry"
IMAGES_ITEMS = REGISTRY / "images" / "items"
OUT_YAML = REGISTRY / "softkitty_items.yaml"

DEFAULT_UNITY = Path(
    r"c:\Users\123ne\source\repos\Animal-English-World\English Kingdom"
)
ITEM_OBJECT = Path("Assets/_ThirdParty/SoftKitty/Data/ItemObject.asset")

TYPE_NAMES = {
    0: "consumable",
    1: "equipment",
    2: "material",
    3: "questing",
    4: "skill",
}

INVALID_FILENAME_CHARS = '<>:"/\\|?*'


def sanitize_file_name(entry_id: str) -> str:
    cleaned = "".join("_" if c in INVALID_FILENAME_CHARS else c for c in entry_id).strip()
    return cleaned or "unnamed"


def build_guid_map(unity_root: Path) -> dict[str, Path]:
    """Map Unity GUID → asset path (without .meta). Scoped to likely icon folders."""
    roots = [
        unity_root / "Assets" / "_ThirdParty" / "SoftKitty" / "InventoryEngine" / "Textures",
        unity_root / "Assets" / "_OurAssets" / "Art" / "Sprites" / "UI Ability",
    ]
    guid_re = re.compile(r"^guid:\s*([0-9a-f]{32})\s*$", re.I | re.M)
    mapping: dict[str, Path] = {}
    for base in roots:
        if not base.exists():
            continue
        for meta in base.rglob("*.meta"):
            text = meta.read_text(encoding="utf-8", errors="ignore")
            m = guid_re.search(text)
            if not m:
                continue
            asset = meta.with_suffix("")  # strip .meta
            # Prefer png; skip folders
            if asset.is_file():
                mapping[m.group(1).lower()] = asset
    return mapping


def parse_id_manager(text: str) -> dict[str, int]:
    """uid -> softkitty numeric id."""
    block = re.search(r"IdManager:\s*\n\s*idToKey:\n(.*?)(?=\n  [A-Z]|\n  items:)", text, re.S)
    if not block:
        # Fallback: looser scan of idToKey section
        block = re.search(r"idToKey:\n((?:\s+- id:.*\n\s+key:.*\n)+)", text)
    if not block:
        raise RuntimeError("Could not find IdManager.idToKey in ItemObject.asset")

    uid_to_id: dict[str, int] = {}
    for m in re.finditer(r"- id:\s*(\d+)\s*\n\s+key:\s*(.+?)\s*$", block.group(1), re.M):
        uid_to_id[m.group(2).strip()] = int(m.group(1))
    return uid_to_id


def parse_items(text: str) -> list[dict]:
    """Parse SoftKitty items list entries (uid, name, description, type, icon guid)."""
    idx = text.find("\n  items:\n")
    if idx < 0:
        raise RuntimeError("Could not find items: list in ItemObject.asset")

    # Cut at next top-level MonoBehaviour field that is not item content — after items
    # SoftKitty usually ends items before another major section; take rest of file and
    # stop when we see a line starting with "  " + capital letter field not belonging to items.
    rest = text[idx + len("\n  items:\n") :]

    items: list[dict] = []
    current: dict | None = None

    for line in rest.splitlines():
        # End of items list: next sibling of MonoBehaviour at 2-space indent that's not "-"
        if re.match(r"^  [A-Za-z]", line) and not line.startswith("  - ") and current is not None:
            # Could be end — SoftKitty ItemObject may have more after items
            if not line.startswith("  -") and re.match(r"^  [a-zA-Z_]+:", line):
                items.append(current)
                current = None
                break

        if line.startswith("  - uid:"):
            if current:
                items.append(current)
            uid = line.split(":", 1)[1].strip()
            current = {"uid": uid}
            continue

        if current is None:
            continue

        if line.startswith("    name:"):
            current["name"] = line.split(":", 1)[1].strip()
        elif line.startswith("    description:"):
            current["description"] = line.split(":", 1)[1].strip()
        elif line.startswith("    type:"):
            try:
                current["type_id"] = int(line.split(":", 1)[1].strip())
            except ValueError:
                current["type_id"] = 0
        elif "icon:" in line and "guid:" in line:
            gm = re.search(r"guid:\s*([0-9a-f]{32})", line, re.I)
            if gm:
                current["icon_guid"] = gm.group(1).lower()

    if current:
        items.append(current)

    return items


def yaml_escape(value: str) -> str:
    if value is None:
        return '""'
    if any(c in value for c in ":#{}[]&*!|>'\"%@`") or value.strip() != value or "\n" in value:
        return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'
    return value


def write_softkitty_yaml(entries: list[dict]) -> None:
    lines = [
        "# SoftKitty inventory items — exported from Unity ItemObject.asset.",
        "# Keys are SoftKitty uid. softkitty_id is the numeric IdManager id for quests.",
        "# Do not invent IDs. Re-run: python scripts/export_softkitty_items.py",
        "",
        "softkitty_items:",
        "",
    ]
    for e in sorted(entries, key=lambda x: (x.get("softkitty_id") is None, x.get("softkitty_id", 0), x["id"])):
        key = e["id"]
        # Quote keys with special chars
        key_out = yaml_escape(key) if re.search(r"[^A-Za-z0-9_]", key) else key
        lines.append(f"  {key_out}:")
        lines.append(f"    name: {yaml_escape(e.get('name') or key)}")
        if e.get("softkitty_id") is not None:
            lines.append(f"    softkitty_id: {e['softkitty_id']}")
        lines.append(f"    softkitty_uid: {yaml_escape(e.get('softkitty_uid') or key)}")
        lines.append(f"    type: {e.get('type', 'material')}")
        if e.get("description"):
            lines.append(f"    description: {yaml_escape(e['description'])}")
        if e.get("image"):
            lines.append(f"    image: {e['image']}")
        lines.append("")

    OUT_YAML.write_text("\n".join(lines), encoding="utf-8")
    print(f"wrote {OUT_YAML.relative_to(ROOT)} ({len(entries)} items)")


def export(unity_root: Path) -> None:
    asset_path = unity_root / ITEM_OBJECT
    if not asset_path.exists():
        raise SystemExit(f"Missing ItemObject.asset at {asset_path}")

    text = asset_path.read_text(encoding="utf-8", errors="ignore")
    uid_to_id = parse_id_manager(text)
    items = parse_items(text)
    print(f"parsed {len(uid_to_id)} id mappings, {len(items)} item defs")

    guid_map = build_guid_map(unity_root)
    print(f"guid map size: {len(guid_map)}")

    IMAGES_ITEMS.mkdir(parents=True, exist_ok=True)
    exported: list[dict] = []
    copied = 0
    missing_icon = 0

    for item in items:
        uid = item.get("uid")
        if not uid:
            continue
        softkitty_id = uid_to_id.get(uid)
        # Skip orphan manager keys without item — we only iterate items
        type_name = TYPE_NAMES.get(int(item.get("type_id", 0)), "material")
        file_stem = sanitize_file_name(uid)
        rel_image = None
        guid = item.get("icon_guid")
        if guid and guid in guid_map:
            src = guid_map[guid]
            dest = IMAGES_ITEMS / f"{file_stem}{src.suffix.lower() if src.suffix else '.png'}"
            if src.suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp"}:
                # Still copy; catalog expects .png — convert name to .png if source is png
                dest = IMAGES_ITEMS / f"{file_stem}.png"
            else:
                dest = IMAGES_ITEMS / f"{file_stem}{src.suffix.lower()}"
            # Always store as .png path for catalog consistency when source is png
            if src.suffix.lower() == ".png":
                dest = IMAGES_ITEMS / f"{file_stem}.png"
            shutil.copy2(src, dest)
            rel_image = f"images/items/{dest.name}"
            copied += 1
        else:
            missing_icon += 1

        exported.append(
            {
                "id": uid,
                "name": item.get("name") or uid,
                "description": item.get("description") or "",
                "type": type_name,
                "softkitty_id": softkitty_id,
                "softkitty_uid": uid,
                "image": rel_image,
            }
        )

    write_softkitty_yaml(exported)
    print(f"copied {copied} icons -> {IMAGES_ITEMS.relative_to(ROOT)} (missing icon: {missing_icon})")


def main() -> None:
    parser = argparse.ArgumentParser(description="Export SoftKitty items into QuestSystem registry")
    parser.add_argument(
        "--unity",
        type=Path,
        default=DEFAULT_UNITY,
        help="Path to English Kingdom Unity project root",
    )
    args = parser.parse_args()
    export(args.unity.resolve())


if __name__ == "__main__":
    main()
