#!/usr/bin/env python3
"""Sync voice-over review between the Unity project and the Voice Review web page.

One command does both directions:

* **Up:** every voiced line that has a take is listed in ``voice_review_items`` and its clip is
  uploaded to the private ``voice-review`` bucket (again only when its take changes):
  dialogue nodes (``Tools/voice/voice_script.csv``) and their girl versions (``girl_script.csv``),
  speech bubbles (``bubble_lines.json``, ``farm_*_lines.json``), cutscene subtitles
  (``cutscene_lines.json``) and townsfolk (``ambient_lines.json``). Who says each line and which
  quest line it belongs to go to ``voice_review_speakers`` / ``voice_review_groups``, with a
  picture of each character (QuestSystem's NPC registry, or Unity's rendered NPC portraits).
* **Decisions, both ways:** ``voice_review_decisions`` and ``Tools/voice/voice_review.json``
  are merged per clip; the newer decision wins. The review file keeps the exact format
  Unity's Audio Review window writes (field order, sorted keys, line endings, no BOM),
  so the window, the generators (``--rejected``) and the voice-over skill read guide
  decisions like their own.

Run it from anywhere, pointing at the Unity project folder (the one that holds ``Assets``)::

    set QUEST_SUPABASE_URL=https://xxxx.supabase.co
    set QUEST_SUPABASE_ANON_KEY=...
    set QUEST_EDITOR_EMAIL=you@example.com            (asks for the password)
    python scripts/voice_review_sync.py --project "C:/.../English-Kingdom/English Kingdom"

``SUPABASE_SERVICE_ROLE_KEY`` may be used instead of an editor account. ``--dry-run``
reports what would change without writing anything. Standard library only.
"""

from __future__ import annotations

import argparse
import csv
import getpass
import hashlib
import io
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

BUCKET = "voice-review"
SOURCE = "dialogue"
HINTS_GROUP = "Hints"
AMBIENT_GROUP = "ambient"
VOICE_ROOT = "Assets/_OurAssets/Art/Audio/Voice"
PORTRAIT_CATALOG = "Assets/_OurAssets/Resources/UI/NpcPortraitCatalog.asset"
QUESTSYSTEM = Path(__file__).resolve().parents[1]
PORTRAIT_SIZE = 320
# Speakers whose picture is under another name in the NPC registry / portrait catalog.
IMAGE_ALIASES = {"שף": "Chef"}
GROUP_TITLES = {AMBIENT_GROUP: "אנשי העיר (משפטים ברחוב)", HINTS_GROUP: "רמזים", "farm_adventure": "הרפתקה בחווה"}
HEBREW_RE = re.compile(r"[֐-׿]")
REVIEW_FIELDS = ["status", "tags", "note", "take_hash", "speaker", "text", "reviewed_at"]
NO_VOICE = "(no voice cast)"
CONTENT_TYPES = {".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg",
                 ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}
UPLOAD_THREADS = 6

GUID_RE = re.compile(r"^guid:\s*([0-9a-f]+)", re.MULTILINE)
NEXT_NODE_RE = re.compile(r"nextNode:\s*\{[^}]*guid:\s*([0-9a-f]+)")
QUEST_NUMBER_RE = re.compile(r"_q(\d+)(?=_|$)")
BUBBLE_PART_RE = re.compile(r"^abc_(?:quest_)?([a-z]+\d*)_")
CATALOG_ENTRY_RE = re.compile(r"npcId:\s*(.+?)\s*\n\s*displayName:\s*(.+?)\s*\n\s*portrait:\s*\{[^}]*guid:\s*([0-9a-f]+)")


# --------------------------------------------------------------------------------------------
# Unity project: the voice lines in listening order (mirrors DialogueReviewSource)
# --------------------------------------------------------------------------------------------

@dataclass
class VoiceItem:
    clip_path: str
    group_key: str
    section: str
    position: int
    speaker: str
    voice_name: str
    on_screen_text: str
    tts_text: str
    take_hash: str
    node_path: str
    legacy_clip: str = ""
    source: str = SOURCE
    variant: str = ""
    speaker_key: str = ""

    def audio_path(self) -> str:
        return f"{self.source}/{path_id(self.clip_path)}/{self.take_hash}{Path(self.clip_path).suffix.lower()}"

    def row(self, alternate_audio_path: str | None) -> dict[str, Any]:
        return {
            "clip_path": self.clip_path,
            "source": self.source,
            "variant": self.variant,
            "speaker_key": self.speaker_key,
            "group_key": self.group_key,
            "section": self.section,
            "position": self.position,
            "speaker": self.speaker,
            "voice_name": self.voice_name,
            "on_screen_text": self.on_screen_text,
            "tts_text": self.tts_text,
            "take_hash": self.take_hash,
            "audio_path": self.audio_path(),
            "alternate_audio_path": alternate_audio_path,
            "node_path": self.node_path,
        }


def path_id(clip_path: str) -> str:
    return hashlib.sha1(clip_path.encode("utf-8")).hexdigest()[:16]


def file_hash(path: Path) -> str:
    return hashlib.sha1(path.read_bytes()).hexdigest()[:16]


def read_json(path: Path) -> Any:
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8-sig"))


def order_key(entry_node_name: str) -> tuple[int, int, str]:
    """VoiceReviewOrder.For: quest number, then start -> steps -> finish."""
    key = entry_node_name[len("Dialogue_"):] if entry_node_name.startswith("Dialogue_") else entry_node_name
    matches = list(QUEST_NUMBER_RE.finditer(key))
    if not matches:
        return (0, stage_rank(key), key)
    last = matches[-1]
    stage = key[last.end():].lstrip("_")
    return (int(last.group(1)), stage_rank(stage), stage)


def stage_rank(stage: str) -> int:
    if "start" in stage:
        return 0
    if "finish" in stage or "done" in stage or "turn_in" in stage:
        return 2
    return 1


def order_label(key: tuple[int, int, str]) -> str:
    quest, _, stage = key
    stage = stage.replace("_", " ") if stage else "dialogue"
    return f"Quest {quest} · {stage}" if quest > 0 else stage


def legacy_title(group_key: str) -> str:
    """Legacy/Level10 -> הקלטות ישנות · Level10; the_royal_impostor -> The royal impostor"""
    if group_key.startswith("Legacy/"):
        return "הקלטות ישנות · " + group_key[len("Legacy/"):]
    text = group_key.replace("_", " ").strip()
    return text[:1].upper() + text[1:] if text else group_key


def portrait_bytes(file: Path) -> tuple[bytes, str]:
    """A small square picture centred on the NPC (the registry has 1280x720 screenshots). Needs Pillow;
    without it the original file is uploaded."""
    try:
        from PIL import Image
    except ImportError:
        return file.read_bytes(), file.suffix.lower()
    with Image.open(file) as source:
        image = source.convert("RGBA")
    side = min(image.size)
    left, top = (image.width - side) // 2, (image.height - side) // 2
    image = image.crop((left, top, left + side, top + side)).resize((PORTRAIT_SIZE, PORTRAIT_SIZE), Image.LANCZOS)
    background = Image.new("RGBA", image.size, (238, 241, 248, 255))
    background.alpha_composite(image)
    out = io.BytesIO()
    background.convert("RGB").save(out, "JPEG", quality=85, optimize=True)
    return out.getvalue(), ".jpg"


def girl_clip(clip: str) -> str:
    path = Path(clip)
    return f"{path.parent.as_posix()}/{path.stem}_girl{path.suffix}"


def pretty_timeline(timeline: str) -> str:
    """TL_Intro1_Opening -> Intro1 Opening"""
    name = timeline[3:] if timeline.startswith("TL_") else timeline
    return re.sub(r"(?<=[a-z])(?=[A-Z])", " ", name.replace("_", " ")).strip()


def bubble_section(line_id: str) -> str:
    """abc_quest_d_x_1_say -> Speech bubbles · Quest D; abc_quest_hw3_… -> Speech bubbles · Homework 3"""
    match = BUBBLE_PART_RE.match(line_id)
    part = match.group(1) if match else ""
    if len(part) == 1:
        label = f"Quest {part.upper()}"
    elif part.startswith("hw"):
        label = f"Homework {part[2:]}"
    elif part.startswith("fun"):
        label = f"Fun {part[3:]}"
    else:
        label = part.replace("_", " ").capitalize()
    return f"Speech bubbles · {label}" if label else "Speech bubbles"


def unity_string(value: str) -> str:
    """A scalar from a Unity .asset (YAML): "\\u05E1…" in quotes, or plain text."""
    value = value.strip()
    if value.startswith('"') and value.endswith('"'):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value[1:-1]
    return value


def read_yaml_npcs(path: Path) -> dict[str, dict[str, str]]:
    """_registry/npcs.yaml (npcs: <key>: {image, name, …}) without needing PyYAML."""
    npcs: dict[str, dict[str, str]] = {}
    if not path.exists():
        return npcs
    current = None
    for line in path.read_text(encoding="utf-8").splitlines():
        top = re.match(r"^  ([^\s#][^:]*):\s*$", line)
        field_match = re.match(r"^    (\w+):\s*(.*)$", line)
        if top:
            current = npcs.setdefault(unity_string(top.group(1)), {})
        elif field_match and current is not None:
            current[field_match.group(1)] = unity_string(field_match.group(2).strip().strip("'"))
    return npcs


def questline_info(group_key: str) -> tuple[str, str]:
    """(display_name, npc_id) from questlines/<id>/_index.yaml, or ("", "")."""
    index = QUESTSYSTEM / "questlines" / group_key / "_index.yaml"
    if not group_key or "/" in group_key or not index.exists():
        return "", ""
    text = index.read_text(encoding="utf-8")
    title = re.search(r"^  display_name:\s*(.+)$", text, re.MULTILINE)
    npc = re.search(r"^  npc_id:\s*(.+)$", text, re.MULTILINE)
    clean = lambda m: unity_string(m.group(1).strip().strip("'")) if m else ""
    return clean(title), clean(npc)


def is_hebrew(text: str) -> bool:
    return bool(HEBREW_RE.search(text or ""))


class VoiceCast:
    def __init__(self, data: Any):
        self.speakers: dict[str, dict[str, Any]] = dict((data or {}).get("speakers") or {})
        self.by_speaker: dict[str, str] = {}
        self.owner: dict[str, str] = {}                  # alias -> cast key
        self.by_node_path: list[tuple[str, str]] = []    # (node path prefix, cast key)
        for name, speaker in self.speakers.items():
            voice = speaker.get("voice_name") or ""
            self.by_speaker[name] = voice
            for alias in speaker.get("aliases") or []:
                self.by_speaker[alias] = voice
                self.owner.setdefault(alias, name)
            for prefix in speaker.get("node_paths") or []:
                self.by_node_path.append((prefix, name))
        self.by_node_path.sort(key=lambda pair: -len(pair[0]))

    def _node_owner(self, node_path: str) -> str | None:
        return next((key for prefix, key in self.by_node_path if (node_path or "").startswith(prefix)), None)

    def voice_name_for(self, speaker: str, node_path: str) -> str:
        owner = self._node_owner(node_path)
        if owner is not None:
            return self.speakers[owner].get("voice_name") or NO_VOICE
        return self.by_speaker.get(speaker or "") or NO_VOICE

    def character_for(self, speaker: str, node_path: str = "") -> str:
        """Which character says the line (a cast key when known), for the face and the "by character" view.

        A Hebrew alias is the same character's in-game name ("ראש הכפר" = Village Head); a Latin alias is
        another character who only borrows the voice ("Bobby" uses Benny's), so it stays its own character.
        """
        owner = self._node_owner(node_path)
        if owner is not None:
            return owner
        if speaker in self.speakers:
            return speaker
        alias_of = self.owner.get(speaker)
        return alias_of if alias_of and is_hebrew(speaker) else speaker

    def display_name(self, key: str) -> str:
        """Hebrew name the guide knows the character by, when the cast key is English."""
        if is_hebrew(key):
            return key
        hebrew = next((a for a in self.speakers.get(key, {}).get("aliases") or [] if is_hebrew(a)), "")
        return f"{hebrew} ({key})" if hebrew else key

    def brief(self, key: str) -> str:
        return self.speakers.get(key, {}).get("brief") or ""

    def names_of(self, key: str) -> list[str]:
        return [key] + [a for a in self.speakers.get(key, {}).get("aliases") or [] if is_hebrew(a)]


class UnityProject:
    def __init__(self, root: Path):
        self.root = root
        self.tools = root / "Tools" / "voice"
        self.review_file = self.tools / "voice_review.json"

    def path(self, asset_path: str) -> Path:
        return self.root / asset_path

    def guid_of(self, asset_path: str) -> str | None:
        meta = self.path(asset_path + ".meta")
        if not meta.exists():
            return None
        match = GUID_RE.search(meta.read_text(encoding="utf-8", errors="replace"))
        return match.group(1) if match else None

    def next_node_guids(self, node_path: str) -> list[str]:
        asset = self.path(node_path)
        if not asset.exists():
            return []
        return NEXT_NODE_RE.findall(asset.read_text(encoding="utf-8", errors="replace"))

    def load_items(self) -> list[VoiceItem]:
        script = self.tools / "voice_script.csv"
        if not script.exists():
            raise SystemExit(f"{script} was not found. Export the voice script in Unity first "
                             "(Voice Over > Export Voice Script CSV), or check --project.")
        with script.open(encoding="utf-8-sig", newline="") as handle:
            rows = [r for r in csv.DictReader(handle) if r.get("clip_path") and r.get("node_path")]
        self.lock = read_json(self.tools / "generated.lock.json") or {}
        takes = {clip: (entry or {}).get("hash", "") for clip, entry in self.lock.items()}
        self.takes = takes
        cast = self.cast = VoiceCast(read_json(self.tools / "voice_cast.json"))
        girl_by_node = {r["node_path"]: r for r in self._read_csv(self.tools / "girl_script.csv")}

        groups: dict[str, list[dict[str, str]]] = {}
        for row in rows:
            groups.setdefault(row.get("group", ""), []).append(row)

        def dialogue_item(row: dict[str, str], group: str, section: str, variant: str = "") -> VoiceItem | None:
            clip = row["clip_path"]
            take = takes.get(clip, "")
            if not take or not self.path(clip).exists():
                return None  # no take to listen to yet
            speaker = row.get("speaker", "")
            return VoiceItem(
                clip_path=clip,
                group_key=group,
                section=section,
                position=0,
                speaker=speaker,
                voice_name=cast.voice_name_for(speaker, row["node_path"]),
                on_screen_text=row.get("display_text", ""),
                tts_text=row.get("tts_text", ""),
                take_hash=take,
                node_path=row["node_path"],
                legacy_clip=row.get("legacy_clip", "") if group != HINTS_GROUP and not variant else "",
                variant=variant,
                speaker_key=cast.character_for(speaker, row["node_path"]),
            )

        by_group: dict[str, list[VoiceItem]] = {}
        for group in sorted(groups, key=lambda g: (g.startswith("Legacy"), g)):
            ordered = (sorted(((r, HINTS_GROUP) for r in groups[group]), key=lambda pair: pair[0]["node_path"])
                       if group == HINTS_GROUP else self._chain_order(groups[group]))
            for row, section in ordered:
                # The girl version is heard right after the line it replaces for a girl player.
                for item in (dialogue_item(row, group, section),
                             dialogue_item(girl_by_node[row["node_path"]], group, section, "girl")
                             if row["node_path"] in girl_by_node else None):
                    if item is not None:
                        by_group.setdefault(group, []).append(item)

        for item in self._extra_items(cast):
            by_group.setdefault(item.group_key, []).append(item)

        items: list[VoiceItem] = []
        for group_items in by_group.values():
            for position, item in enumerate(group_items):
                item.position = position
                items.append(item)
        return items

    @staticmethod
    def _read_csv(path: Path) -> list[dict[str, str]]:
        if not path.exists():
            return []
        with path.open(encoding="utf-8-sig", newline="") as handle:
            return [r for r in csv.DictReader(handle) if r.get("clip_path") and r.get("node_path")]

    # ---- Lines that are not dialogue nodes: cutscenes, speech bubbles, townsfolk -------------------

    def _lines(self, name: str) -> dict[str, Any]:
        return read_json(self.tools / name) or {}

    def _extra_items(self, cast: VoiceCast) -> list[VoiceItem]:
        """Each line plus its girl take (<id>_girl.mp3) when there is one, grouped like the player meets them."""
        pending: list[tuple[str, str, str, dict[str, Any], str, str]] = []  # source, group, section, line, clip, speaker

        for line in self._lines("cutscene_lines.json").get("lines") or []:
            timeline = line.get("timeline", "")
            group = "farm_adventure" if "farm" in timeline.lower() else "abc_valley"
            pending.append(("cutscene", group, "Cutscene · " + pretty_timeline(timeline), line,
                            f"{VOICE_ROOT}/Cutscenes/{line['id']}.mp3", line.get("speaker", "")))

        for name in ("bubble_lines.json", "farm_bubble_lines.json", "farm_answer_lines.json"):
            for line in self._lines(name).get("lines") or []:
                farm = line["id"].startswith("farm")
                section = ("Answers" if "answer" in name else "Speech bubbles") if farm else bubble_section(line["id"])
                pending.append(("bubble", "farm_adventure" if farm else "abc_valley", section, line,
                                f"{VOICE_ROOT}/Bubbles/{line['id']}.mp3", line.get("speaker", "")))

        ambient = self._lines("ambient_lines.json")
        self.ambient_names: dict[str, str] = {}  # cast key -> the townsperson's Hebrew name
        characters = ambient.get("characters") or {}
        ambient_lines = []
        for line in ambient.get("lines") or []:
            character = characters.get(line.get("character", ""), {})
            conversation = line.get("conversation")
            if conversation:
                cast_names = (ambient.get("conversations") or {}).get(conversation, {}).get("cast") or [line.get("character", "")]
                section = "שיחה · " + " ו".join(characters.get(c, {}).get("display_name", c) for c in cast_names)
                folder = f"Conversations/{conversation}"
            else:
                section = character.get("display_name") or line.get("character", "")
                folder = line.get("character", "")
            line = dict(line, speaker_name=character.get("display_name") or line.get("character", ""))
            if character.get("voice_speaker") and character.get("display_name"):
                self.ambient_names.setdefault(character["voice_speaker"], character["display_name"])
            ambient_lines.append(("ambient", AMBIENT_GROUP, section, line,
                                  f"{VOICE_ROOT}/Ambient/{folder}/{line['id']}.mp3", character.get("voice_speaker", "")))
        # One section per character / conversation, in the order the file first mentions them.
        first_seen: dict[str, int] = {}
        for entry in ambient_lines:
            first_seen.setdefault(entry[2], len(first_seen))
        pending += sorted(ambient_lines, key=lambda e: first_seen[e[2]])

        items = []
        for source, group, section, line, clip, speaker in pending:
            for variant, path in (("", clip), ("girl", girl_clip(clip))):
                take = self.takes.get(path, "")
                if not take or not self.path(path).exists():
                    continue
                entry = self.lock.get(path) or {}
                key = cast.character_for(speaker or entry.get("speaker", ""))
                text = line.get("text", "")
                if source == "cutscene":  # the subtitle starts with "<speaker>: "
                    text = text.split(": ", 1)[1] if ": " in text else text
                items.append(VoiceItem(
                    clip_path=path, group_key=group, section=section, position=0,
                    speaker=line.get("speaker_name") or speaker or entry.get("speaker", ""),
                    voice_name=cast.voice_name_for(key, ""),
                    on_screen_text=text,
                    tts_text=entry.get("tts_text") or line.get("tts_text") or text,
                    take_hash=take, node_path="", source=source, variant=variant, speaker_key=key,
                ))
        return items

    # ---- Faces and titles ----------------------------------------------------------------------

    def catalog_entries(self) -> list[tuple[str, str, str]]:
        """(npc id, Hebrew display name, sprite guid) from Unity's NPC portrait catalog."""
        catalog = self.path(PORTRAIT_CATALOG)
        if not catalog.exists():
            return []
        return [(npc_id.strip(), unity_string(display), guid)
                for npc_id, display, guid in CATALOG_ENTRY_RE.findall(catalog.read_text(encoding="utf-8", errors="replace"))]

    def portrait_files(self) -> dict[str, Path]:
        """Lower-cased name -> picture: QuestSystem's NPC registry first, then Unity's NPC portrait catalog."""
        found: dict[str, Path] = {}
        for key, npc in read_yaml_npcs(QUESTSYSTEM / "_registry" / "npcs.yaml").items():
            image = QUESTSYSTEM / "_registry" / (npc.get("image") or "")
            if npc.get("image") and image.is_file():
                for name in (key, npc.get("name") or ""):
                    if name:
                        found.setdefault(name.strip().lower(), image)
        entries = self.catalog_entries()
        guids = self._portrait_guids() if entries else {}
        for npc_id, display, guid in entries:
            if guid in guids:
                for name in (npc_id, display):
                    found.setdefault(name.strip().lower(), guids[guid])
        return found

    def people(self, items: list[VoiceItem]) -> tuple[list[dict[str, Any]], list[dict[str, Any]], dict[str, Path]]:
        """Rows for voice_review_speakers and voice_review_groups, and speaker key -> picture file."""
        cast = self.cast
        pictures = self.portrait_files()
        keys = list(dict.fromkeys(item.speaker_key for item in items if item.speaker_key))
        images: dict[str, Path] = {}
        speakers = []
        for key in keys:
            names = cast.names_of(key) + ([IMAGE_ALIASES[key]] if key in IMAGE_ALIASES else [])
            picture = next((pictures[n.lower()] for n in names if n.lower() in pictures), None)
            if picture is not None:
                images[key] = picture
            speakers.append({
                "speaker_key": key,
                "display_name": (f"{self.ambient_names[key]} ({key})"
                                 if not is_hebrew(cast.display_name(key)) and key in getattr(self, "ambient_names", {})
                                 else cast.display_name(key)),
                "voice_name": cast.voice_name_for(key, ""),
                "brief": cast.brief(key),
                "image_path": None,  # filled once the picture is uploaded
            })

        # The quest line's own NPC is its face; otherwise whoever talks most in it.
        registry = read_yaml_npcs(QUESTSYSTEM / "_registry" / "npcs.yaml")
        catalog_names = {npc_id.lower(): display for npc_id, display, _ in self.catalog_entries()}
        groups: dict[str, list[VoiceItem]] = {}
        for item in items:
            groups.setdefault(item.group_key, []).append(item)
        rows = []
        for key, group_items in groups.items():
            title, npc_id = questline_info(key)
            in_group = (Counter(i.speaker_key for i in group_items if i.speaker_key and not i.variant)
                        or Counter(i.speaker_key for i in group_items if i.speaker_key))
            wanted = {n.lower() for n in (npc_id, (registry.get(npc_id) or {}).get("name", ""),
                                          catalog_names.get(npc_id.lower(), "")) if n}
            face = next((k for k in in_group if any(n.lower() in wanted for n in cast.names_of(k))), None)
            rows.append({
                "group_key": key,
                "title": GROUP_TITLES.get(key) or title or legacy_title(key),
                "speaker_key": face or (in_group.most_common(1)[0][0] if in_group else ""),
                "sort_order": 0,
            })
        rank = lambda r: (3 if r["group_key"].startswith("Legacy") else 2 if r["group_key"] == HINTS_GROUP
                          else 1 if r["group_key"] == AMBIENT_GROUP else 0, r["group_key"].lower())
        rows.sort(key=rank)
        for index, row in enumerate(rows):
            row["sort_order"] = index
        return speakers, rows, images

    def _portrait_guids(self) -> dict[str, Path]:
        folder = self.path("Assets/_OurAssets/Art/Sprites/UI/NpcPortraits")
        result = {}
        for meta in folder.glob("*.png.meta") if folder.exists() else []:
            match = GUID_RE.search(meta.read_text(encoding="utf-8", errors="replace"))
            if match:
                result[match.group(1)] = meta.with_suffix("")
        return result

    def _chain_order(self, rows: list[dict[str, str]]) -> list[tuple[dict[str, str], str]]:
        """Walk each DialogueNode chain (entry node -> choices -> next node), as the player hears it."""
        row_by_node = {r["node_path"]: r for r in rows}
        node_by_guid = {g: p for p in row_by_node if (g := self.guid_of(p))}
        nexts = {p: [node_by_guid[g] for g in self.next_node_guids(p) if g in node_by_guid] for p in row_by_node}
        referenced = {n for targets in nexts.values() for n in targets}

        visited: set[str] = set()

        def walk(start: str) -> list[str]:
            order, stack = [], [start]
            while stack:
                node = stack.pop()
                if node in visited:
                    continue
                visited.add(node)
                order.append(node)
                stack.extend(reversed(nexts.get(node, [])))  # first choice walked first
            return order

        chains = [walk(head) for head in sorted(p for p in row_by_node if p not in referenced)]
        chains += [walk(left) for left in sorted(row_by_node) if left not in visited]  # cycles
        chains = [c for c in chains if c]
        chains.sort(key=lambda c: (order_key(Path(c[0]).stem), c[0]))

        used: set[str] = set()
        result = []
        for chain in chains:
            label = order_label(order_key(Path(chain[0]).stem))
            unique, n = label, 2
            while unique in used:
                unique, n = f"{label} ({n})", n + 1
            used.add(unique)
            result.extend((row_by_node[node], unique) for node in chain)
        return result


# --------------------------------------------------------------------------------------------
# voice_review.json (byte-compatible with Unity's ReviewStore)
# --------------------------------------------------------------------------------------------

@dataclass
class ReviewFile:
    path: Path
    entries: dict[str, dict[str, Any]] = field(default_factory=dict)
    newline: str = "\r\n"

    @classmethod
    def load(cls, path: Path) -> "ReviewFile":
        if not path.exists():
            return cls(path, {}, os.linesep)
        raw = path.read_bytes().decode("utf-8-sig")
        try:
            entries = json.loads(raw) or {}
        except json.JSONDecodeError as error:
            raise SystemExit(f"{path} is not readable ({error}). Fix it (a merge conflict?) before syncing; "
                             "nothing was changed.")
        return cls(path, entries, "\r\n" if "\r\n" in raw else "\n")

    def text(self) -> str:
        def ordered(entry: dict[str, Any]) -> dict[str, Any]:
            result = {k: entry[k] for k in REVIEW_FIELDS if k in entry}
            result.update({k: v for k, v in entry.items() if k not in result})
            return result

        body = json.dumps({k: ordered(self.entries[k]) for k in sorted(self.entries)}, ensure_ascii=False, indent=2)
        return body.replace("\n", self.newline)

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_bytes(self.text().encode("utf-8"))


def local_to_utc(value: str) -> datetime | None:
    """reviewed_at in the review file is local time without an offset."""
    try:
        parsed = datetime.fromisoformat(value)
    except (TypeError, ValueError):
        return None
    return (parsed if parsed.tzinfo else parsed.astimezone()).astimezone(timezone.utc)


def utc_to_local(value: str) -> str:
    return parse_db_time(value).astimezone().strftime("%Y-%m-%dT%H:%M:%S")


def parse_db_time(value: str) -> datetime:
    value = value.replace("Z", "+00:00")
    # Python < 3.11 accepts only 0, 3 or 6 fraction digits.
    value = re.sub(r"\.(\d+)", lambda m: "." + (m.group(1) + "000000")[:6], value)
    return datetime.fromisoformat(value).astimezone(timezone.utc)


def same_decision(local: dict[str, Any], db: dict[str, Any]) -> bool:
    return (local.get("status", "pending") == db.get("status")
            and list(local.get("tags") or []) == list(db.get("tags") or [])
            and (local.get("note") or "") == (db.get("note") or "")
            and (local.get("take_hash") or "") == (db.get("take_hash") or ""))


@dataclass
class DecisionPlan:
    to_local: dict[str, dict[str, Any]] = field(default_factory=dict)   # clip -> new file entry
    to_db: list[dict[str, Any]] = field(default_factory=list)           # rows to upsert


def plan_decisions(local: dict[str, dict[str, Any]], db_rows: Iterable[dict[str, Any]]) -> DecisionPlan:
    """Per clip, the newer decision wins; identical decisions are left alone."""
    plan = DecisionPlan()
    db = {row["clip_path"]: row for row in db_rows}

    for clip in sorted(set(local) | set(db)):
        mine, theirs = local.get(clip), db.get(clip)
        if theirs is not None and mine is not None and same_decision(mine, theirs):
            continue
        mine_at = local_to_utc(mine.get("reviewed_at", "")) if mine else None
        theirs_at = parse_db_time(theirs["reviewed_at"]) if theirs else None

        if theirs is not None and (mine is None or mine_at is None or theirs_at > mine_at):
            entry = dict(mine or {})  # keeps keys this script does not know
            entry.update({
                "status": theirs["status"],
                "tags": list(theirs.get("tags") or []),
                "note": theirs.get("note") or "",
                "take_hash": theirs.get("take_hash") or "",
                "speaker": theirs.get("speaker") or entry.get("speaker", ""),
                "text": theirs.get("text") or entry.get("text", ""),
                "reviewed_at": utc_to_local(theirs["reviewed_at"]),
            })
            plan.to_local[clip] = entry
        elif mine is not None and mine_at is not None:
            plan.to_db.append({
                "clip_path": clip,
                "status": mine.get("status", "pending"),
                "tags": list(mine.get("tags") or []),
                "note": mine.get("note") or "",
                "take_hash": mine.get("take_hash") or "",
                "speaker": mine.get("speaker") or "",
                "text": mine.get("text") or "",
                "reviewed_at": mine_at.isoformat(),
                "reviewed_by": None,
                "reviewer_name": "Unity",
            })
    return plan


# --------------------------------------------------------------------------------------------
# Supabase (PostgREST + Storage over plain HTTPS)
# --------------------------------------------------------------------------------------------

class Supabase:
    def __init__(self, url: str, anon_key: str, token: str):
        self.url = url.rstrip("/")
        self.anon_key = anon_key
        self.token = token

    @classmethod
    def from_env(cls) -> "Supabase":
        url = os.environ.get("QUEST_SUPABASE_URL", "").strip()
        anon = os.environ.get("QUEST_SUPABASE_ANON_KEY", "").strip()
        service = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        if not url or not (anon or service):
            raise SystemExit("Set QUEST_SUPABASE_URL and QUEST_SUPABASE_ANON_KEY (the same values the web editor uses).")
        if service:
            return cls(url, service, service)
        email = os.environ.get("QUEST_EDITOR_EMAIL", "").strip() or input("QuestForge editor email: ").strip()
        password = os.environ.get("QUEST_EDITOR_PASSWORD") or getpass.getpass("Password: ")
        session = cls(url, anon, anon)._request(
            "POST", "/auth/v1/token?grant_type=password", {"email": email, "password": password})
        return cls(url, anon, session["access_token"])

    def _request(self, method: str, path: str, body: Any = None, headers: dict[str, str] | None = None,
                 raw: bytes | None = None) -> Any:
        data = raw if raw is not None else (json.dumps(body).encode("utf-8") if body is not None else None)
        request = urllib.request.Request(self.url + path, data=data, method=method)
        request.add_header("apikey", self.anon_key)
        request.add_header("Authorization", f"Bearer {self.token}")
        if raw is None:
            request.add_header("Content-Type", "application/json")
        for key, value in (headers or {}).items():
            request.add_header(key, value)
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                text = response.read().decode("utf-8")
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")[:500]
            raise SystemExit(f"Supabase {method} {path.split('?')[0]} failed ({error.code}): {detail}")
        return json.loads(text) if text.strip() else None

    def select_all(self, table: str, columns: str, key: str = "clip_path") -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        page = 1000
        while True:
            batch = self._request("GET", f"/rest/v1/{table}?select={columns}&order={key}"
                                         f"&limit={page}&offset={len(rows)}") or []
            rows.extend(batch)
            if len(batch) < page:
                return rows

    def upsert(self, table: str, rows: list[dict[str, Any]], key: str = "clip_path") -> None:
        for start in range(0, len(rows), 200):
            self._request("POST", f"/rest/v1/{table}?on_conflict={key}", rows[start:start + 200],
                          {"Prefer": "resolution=merge-duplicates,return=minimal"})

    def delete_items(self, clips: list[str]) -> None:
        for start in range(0, len(clips), 50):
            quoted = ",".join('"' + c.replace("\\", "\\\\").replace('"', '\\"') + '"' for c in clips[start:start + 50])
            self._request("DELETE", "/rest/v1/voice_review_items?clip_path=in." + urllib.parse.quote(f"({quoted})"))

    def upload(self, object_path: str, file: Path | bytes) -> None:
        data = file if isinstance(file, bytes) else file.read_bytes()
        content_type = CONTENT_TYPES.get(Path(object_path).suffix.lower(), "application/octet-stream")
        self._request("POST", f"/storage/v1/object/{BUCKET}/{urllib.parse.quote(object_path)}",
                      raw=data, headers={"Content-Type": content_type, "x-upsert": "true",
                                         "Cache-Control": "max-age=31536000"})

    def remove_objects(self, object_paths: list[str]) -> None:
        for start in range(0, len(object_paths), 100):
            self._request("DELETE", f"/storage/v1/object/{BUCKET}", {"prefixes": object_paths[start:start + 100]})


# --------------------------------------------------------------------------------------------
# Sync
# --------------------------------------------------------------------------------------------

def upload_all(db: Supabase, uploads: list[tuple[str, Path | bytes]], log=print) -> None:
    """A few uploads at a time: a full first sync is ~2,000 clips."""
    if not uploads:
        return
    from concurrent.futures import ThreadPoolExecutor
    done = 0
    with ThreadPoolExecutor(max_workers=UPLOAD_THREADS) as pool:
        for _ in pool.map(lambda job: db.upload(*job), uploads):
            done += 1
            if done % 50 == 0 or done == len(uploads):
                log(f"  uploaded {done}/{len(uploads)}")


def sync(project: UnityProject, db: Supabase | None, dry_run: bool, skip_audio: bool, log=print) -> None:
    items = project.load_items()
    review = ReviewFile.load(project.review_file)
    log(f"Unity project: {len(items)} lines with a take, {len(review.entries)} decisions in {project.review_file.name}.")

    existing = {r["clip_path"]: r for r in db.select_all("voice_review_items", "clip_path,audio_path,alternate_audio_path")} if db else {}

    # Lines and audio up.
    rows, uploads = [], []
    for item in items:
        alternate = None
        legacy = project.path(item.legacy_clip) if item.legacy_clip else None
        if legacy is not None and legacy.exists():
            alternate = f"{SOURCE}/{path_id(item.clip_path)}/legacy-{file_hash(legacy)}{legacy.suffix.lower()}"
        row = item.row(alternate)
        rows.append(row)
        before = existing.get(item.clip_path, {})
        if before.get("audio_path") != row["audio_path"]:
            uploads.append((row["audio_path"], project.path(item.clip_path)))
        if alternate and before.get("alternate_audio_path") != alternate:
            uploads.append((alternate, legacy))

    current = {r["clip_path"]: {r["audio_path"], r["alternate_audio_path"]} for r in rows}
    removed = sorted(c for c in existing if c not in current)
    replaced = [path for clip, before in existing.items()
                for path in (before.get("audio_path"), before.get("alternate_audio_path"))
                if path and path not in current.get(clip, set())]

    # Who says it, and which quest line: names, faces and Hebrew titles for the page.
    speakers, groups, pictures = project.people(items)
    had_picture = {r["speaker_key"]: r.get("image_path") for r in
                   (db.select_all("voice_review_speakers", "speaker_key,image_path", "speaker_key") if db else [])}
    picture_uploads = []
    for speaker in speakers:
        file = pictures.get(speaker["speaker_key"])
        if file is None:
            continue
        data, ext = portrait_bytes(file)
        speaker["image_path"] = f"portraits/{hashlib.sha1(data).hexdigest()[:16]}{ext}"
        if had_picture.get(speaker["speaker_key"]) != speaker["image_path"]:
            picture_uploads.append((speaker["image_path"], data))

    # Decisions both ways.
    plan = plan_decisions(review.entries, db.select_all("voice_review_decisions", "*") if db else [])

    kinds = Counter(f"{i.source}{' (girl)' if i.variant else ''}" for i in items)
    log("Lines: " + ", ".join(f"{count} {kind}" for kind, count in sorted(kinds.items())))
    faceless = [s["speaker_key"] for s in speakers if s["speaker_key"] not in pictures]
    log(f"People: {len(speakers)} characters, {len(speakers) - len(faceless)} with a picture"
        + (f" (no picture: {', '.join(faceless)})" if faceless else "") + f"; {len(groups)} groups.")
    log(f"Up:   {len(uploads)} clip(s) and {len(picture_uploads)} picture(s) to upload, {len(rows)} line(s) to list, "
        f"{len(removed)} line(s) gone from the script.")
    log(f"Both: {len(plan.to_db)} Unity decision(s) to the web, {len(plan.to_local)} web decision(s) to {project.review_file.name}.")
    for clip, entry in plan.to_local.items():
        log(f"  web -> Unity  {entry['status']:<8} {Path(clip).name}" + (f"  ({entry['note']})" if entry.get("note") else ""))

    if dry_run or db is None:
        log("Dry run: nothing was changed.")
        return

    if skip_audio:
        # Only lines whose current take is already in the bucket, pointing at audio that is there.
        rows = [dict(r, alternate_audio_path=existing[r["clip_path"]].get("alternate_audio_path"))
                for r in rows if existing.get(r["clip_path"], {}).get("audio_path") == r["audio_path"]]
        replaced = []
    else:
        upload_all(db, uploads, log)
    upload_all(db, picture_uploads, log)
    db.upsert("voice_review_speakers", speakers, "speaker_key")
    db.upsert("voice_review_groups", groups, "group_key")
    db.upsert("voice_review_items", rows)
    if removed:
        db.delete_items(removed)
    if replaced:
        db.remove_objects(sorted(set(replaced)))
    if plan.to_db:
        db.upsert("voice_review_decisions", plan.to_db)
    if plan.to_local:
        review.entries.update(plan.to_local)
        review.save()
    log("Done. Unity's Audio Review window picks up the changes on its next reload.")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--project", required=True, type=Path,
                        help='Unity project folder (the one holding Assets and Tools), e.g. ".../English Kingdom"')
    parser.add_argument("--dry-run", action="store_true", help="show what would change, write nothing")
    parser.add_argument("--skip-audio", action="store_true", help="sync decisions only; do not upload new takes")
    args = parser.parse_args(argv)
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")  # Hebrew speaker names on a Windows console

    project = UnityProject(args.project.expanduser().resolve())
    if not (project.root / "Assets").is_dir():
        parser.error(f"{project.root} is not a Unity project folder (no Assets folder).")
    sync(project, Supabase.from_env(), args.dry_run, args.skip_audio)
    return 0


if __name__ == "__main__":
    sys.exit(main())
