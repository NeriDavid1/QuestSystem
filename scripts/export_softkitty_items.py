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

import yaml

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

CLOTHING_STAT_CATALOG = Path("Assets/_OurAssets/Data/Items/ClothingStatCatalog.asset")
DROPPED_ITEMS = Path("Assets/_OurAssets/Data/DroppedItems")

# SoftKitty tag on a cloth_* item -> equipment slot recorded in catalog metadata.
CLOTH_SLOT_TAGS = {
    "Torso": "top",
    "Bottom": "bottom",
    "Boots": "boots",
    "Helmet": "helmet",
    "Gauntlet": "gloves",
    "Cape": "neck",  # SoftKitty tags the Neck looks (scarf, muffler, cape) as Cape
    "Neck": "neck",
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
        unity_root / "Assets" / "_OurAssets" / "Art" / "Sprites" / "UI" / "ClothingIcons",
        unity_root / "Assets" / "_OurAssets" / "Art" / "Sprites" / "UI" / "Drops",
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

        if current.get("_in_tags"):
            if line.startswith("    - "):
                current["tags"].append(line[len("    - "):].strip())
                continue
            current.pop("_in_tags")

        if line.startswith("    name:"):
            current["name"] = unquote_scalar(line.split(":", 1)[1].strip())
        elif line.startswith("    description:"):
            current["description"] = unquote_scalar(line.split(":", 1)[1].strip())
        elif line.startswith("    type:"):
            try:
                current["type_id"] = int(line.split(":", 1)[1].strip())
            except ValueError:
                current["type_id"] = 0
        elif line.startswith("    price:"):
            try:
                current["price"] = int(float(line.split(":", 1)[1].strip()))
            except ValueError:
                pass
        elif line.startswith("    tags:"):
            current["tags"] = []
            current["_in_tags"] = True
        elif "icon:" in line and "guid:" in line:
            gm = re.search(r"guid:\s*([0-9a-f]{32})", line, re.I)
            if gm:
                current["icon_guid"] = gm.group(1).lower()

    if current:
        items.append(current)
    for item in items:
        item.pop("_in_tags", None)

    return items


def unquote_scalar(raw: str) -> str:
    """Decode a single-line Unity YAML scalar ("..."-quoted with \\u escapes, or plain)."""
    if len(raw) >= 2 and raw[0] == raw[-1] and raw[0] in "\"'":
        try:
            value = yaml.safe_load(raw)
            if isinstance(value, str):
                return value
        except yaml.YAMLError:
            pass
    return raw


def parse_clothing_prices(unity_root: Path) -> dict[str, int]:
    """cloth uid -> commonPrice from ClothingStatCatalog._lookPrices (rarity multiplies it)."""
    path = unity_root / CLOTHING_STAT_CATALOG
    if not path.exists():
        return {}
    text = path.read_text(encoding="utf-8", errors="ignore")
    return {
        m.group(1): int(m.group(2))
        for m in re.finditer(r"- itemUid:\s*(\S+)\s*\n\s+commonPrice:\s*(\d+)", text)
    }


def parse_drop_monsters(unity_root: Path) -> dict[str, list[str]]:
    """drop uid -> monsters whose Gift_<Monster> table references its ContentDefinition."""
    base = unity_root / DROPPED_ITEMS
    drops_dir = base / "PossibleItems" / "MonsterDrops"
    if not drops_dir.exists():
        return {}
    gifts = {
        gift.stem[len("Gift_"):]: gift.read_text(encoding="utf-8", errors="ignore")
        for gift in sorted((base / "GiftVarients").glob("Gift_*.asset"))
    }
    result: dict[str, list[str]] = {}
    for asset in sorted(drops_dir.glob("*.asset")):
        uid_match = re.search(r"softKittyItemUid:\s*(\S+)", asset.read_text(encoding="utf-8", errors="ignore"))
        meta = asset.with_name(asset.name + ".meta")
        guid_match = (
            re.search(r"^guid:\s*([0-9a-f]{32})", meta.read_text(encoding="utf-8"), re.M) if meta.exists() else None
        )
        if not uid_match or not guid_match:
            continue
        monsters = [name for name, text in gifts.items() if guid_match.group(1) in text]
        if monsters:
            result[uid_match.group(1)] = monsters
    return result


def classify(item: dict, clothing_prices: dict[str, int], drop_monsters: dict[str, list[str]]) -> dict:
    """Catalog type + metadata. SoftKitty authors clothing as type 0, so cloth_* is overridden."""
    uid = item["uid"]
    tags = list(item.get("tags") or [])
    extra: dict = {}
    if uid.startswith("cloth_"):
        slot_tag = next((tag for tag in tags if tag in CLOTH_SLOT_TAGS), None)
        extra["type"] = "equipment"
        extra["slot"] = CLOTH_SLOT_TAGS[slot_tag] if slot_tag else uid.split("_")[1]
        extra["rarity_via"] = "upgradeLevel"
        if uid in clothing_prices:
            extra["common_price"] = clothing_prices[uid]
    elif uid.startswith("drop_"):
        extra["type"] = "material"
        if "MonsterDrop" not in tags:
            tags.append("MonsterDrop")
        monsters = drop_monsters.get(uid)
        if monsters:
            extra["monster"] = monsters[0] if len(monsters) == 1 else monsters
    else:
        extra["type"] = TYPE_NAMES.get(int(item.get("type_id", 0)), "material")
    if tags and (uid.startswith("cloth_") or uid.startswith("drop_")):
        extra["tags"] = tags
    return extra


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
        for field in ("slot", "rarity_via", "common_price", "monster", "tags"):
            value = e.get(field)
            if value is None:
                continue
            if isinstance(value, list):
                value = "[" + ", ".join(yaml_escape(str(v)) for v in value) + "]"
            elif isinstance(value, str):
                value = yaml_escape(value)
            lines.append(f"    {field}: {value}")
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

    clothing_prices = parse_clothing_prices(unity_root)
    drop_monsters = parse_drop_monsters(unity_root)
    print(f"clothing prices: {len(clothing_prices)}, drops with monsters: {len(drop_monsters)}")

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
        extra = classify(item, clothing_prices, drop_monsters)
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
                "softkitty_id": softkitty_id,
                "softkitty_uid": uid,
                "image": rel_image,
                **extra,
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
