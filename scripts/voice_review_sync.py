#!/usr/bin/env python3
"""Sync voice-over review between the Unity project and the Voice Review web page.

One command does both directions:

* **Up:** every dialogue line that has a take (``Tools/voice/voice_script.csv`` +
  ``generated.lock.json``) is listed in ``voice_review_items`` and its clip is uploaded
  to the private ``voice-review`` bucket. A clip is uploaded again only when its take changes.
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
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

BUCKET = "voice-review"
SOURCE = "dialogue"
HINTS_GROUP = "Hints"
REVIEW_FIELDS = ["status", "tags", "note", "take_hash", "speaker", "text", "reviewed_at"]
NO_VOICE = "(no voice cast)"
CONTENT_TYPES = {".mp3": "audio/mpeg", ".wav": "audio/wav", ".ogg": "audio/ogg"}

GUID_RE = re.compile(r"^guid:\s*([0-9a-f]+)", re.MULTILINE)
NEXT_NODE_RE = re.compile(r"nextNode:\s*\{[^}]*guid:\s*([0-9a-f]+)")
QUEST_NUMBER_RE = re.compile(r"_q(\d+)(?=_|$)")


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

    def audio_path(self) -> str:
        return f"{SOURCE}/{path_id(self.clip_path)}/{self.take_hash}{Path(self.clip_path).suffix.lower()}"

    def row(self, alternate_audio_path: str | None) -> dict[str, Any]:
        return {
            "clip_path": self.clip_path,
            "source": SOURCE,
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


class VoiceCast:
    def __init__(self, data: Any):
        self.by_speaker: dict[str, str] = {}
        self.by_node_path: list[tuple[str, str]] = []
        for name, speaker in ((data or {}).get("speakers") or {}).items():
            voice = speaker.get("voice_name") or ""
            self.by_speaker[name] = voice
            for alias in speaker.get("aliases") or []:
                self.by_speaker[alias] = voice
            for prefix in speaker.get("node_paths") or []:
                self.by_node_path.append((prefix, voice))
        self.by_node_path.sort(key=lambda pair: -len(pair[0]))

    def voice_name_for(self, speaker: str, node_path: str) -> str:
        for prefix, voice in self.by_node_path:
            if (node_path or "").startswith(prefix):
                return voice or NO_VOICE
        return self.by_speaker.get(speaker or "") or NO_VOICE


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
        takes = {clip: (entry or {}).get("hash", "")
                 for clip, entry in (read_json(self.tools / "generated.lock.json") or {}).items()}
        cast = VoiceCast(read_json(self.tools / "voice_cast.json"))

        groups: dict[str, list[dict[str, str]]] = {}
        for row in rows:
            groups.setdefault(row.get("group", ""), []).append(row)

        items: list[VoiceItem] = []
        for group in sorted(groups, key=lambda g: (g.startswith("Legacy"), g)):
            ordered = (sorted(((r, HINTS_GROUP) for r in groups[group]), key=lambda pair: pair[0]["node_path"])
                       if group == HINTS_GROUP else self._chain_order(groups[group]))
            position = 0
            for row, section in ordered:
                clip = row["clip_path"]
                take = takes.get(clip, "")
                if not take or not self.path(clip).exists():
                    continue  # no take to listen to yet
                display = row.get("display_text", "")
                items.append(VoiceItem(
                    clip_path=clip,
                    group_key=group,
                    section=section,
                    position=position,
                    speaker=row.get("speaker", ""),
                    voice_name=cast.voice_name_for(row.get("speaker", ""), row["node_path"]),
                    on_screen_text=display,
                    tts_text=row.get("tts_text", ""),
                    take_hash=take,
                    node_path=row["node_path"],
                    legacy_clip=row.get("legacy_clip", "") if group != HINTS_GROUP else "",
                ))
                position += 1
        return items

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

    def select_all(self, table: str, columns: str) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        page = 1000
        while True:
            batch = self._request("GET", f"/rest/v1/{table}?select={columns}&order=clip_path"
                                         f"&limit={page}&offset={len(rows)}") or []
            rows.extend(batch)
            if len(batch) < page:
                return rows

    def upsert(self, table: str, rows: list[dict[str, Any]]) -> None:
        for start in range(0, len(rows), 200):
            self._request("POST", f"/rest/v1/{table}?on_conflict=clip_path", rows[start:start + 200],
                          {"Prefer": "resolution=merge-duplicates,return=minimal"})

    def delete_items(self, clips: list[str]) -> None:
        for start in range(0, len(clips), 50):
            quoted = ",".join('"' + c.replace("\\", "\\\\").replace('"', '\\"') + '"' for c in clips[start:start + 50])
            self._request("DELETE", "/rest/v1/voice_review_items?clip_path=in." + urllib.parse.quote(f"({quoted})"))

    def upload(self, object_path: str, file: Path) -> None:
        content_type = CONTENT_TYPES.get(file.suffix.lower(), "application/octet-stream")
        self._request("POST", f"/storage/v1/object/{BUCKET}/{urllib.parse.quote(object_path)}",
                      raw=file.read_bytes(), headers={"Content-Type": content_type, "x-upsert": "true",
                                                      "Cache-Control": "max-age=31536000"})

    def remove_objects(self, object_paths: list[str]) -> None:
        for start in range(0, len(object_paths), 100):
            self._request("DELETE", f"/storage/v1/object/{BUCKET}", {"prefixes": object_paths[start:start + 100]})


# --------------------------------------------------------------------------------------------
# Sync
# --------------------------------------------------------------------------------------------

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

    current = {r["clip_path"] for r in rows}
    removed = sorted(c for c in existing if c not in current)
    replaced = [path for clip, before in existing.items()
                for path in (before.get("audio_path"), before.get("alternate_audio_path"))
                if path and path not in {p for r in rows if r["clip_path"] == clip
                                         for p in (r["audio_path"], r["alternate_audio_path"])}]

    # Decisions both ways.
    plan = plan_decisions(review.entries, db.select_all("voice_review_decisions", "*") if db else [])

    log(f"Up:   {len(uploads)} clip(s) to upload, {len(rows)} line(s) to list, {len(removed)} line(s) gone from the script.")
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
        for index, (object_path, file) in enumerate(uploads, 1):
            log(f"  uploading {index}/{len(uploads)}  {file.name}")
            db.upload(object_path, file)
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

    project = UnityProject(args.project.expanduser().resolve())
    if not (project.root / "Assets").is_dir():
        parser.error(f"{project.root} is not a Unity project folder (no Assets folder).")
    sync(project, Supabase.from_env(), args.dry_run, args.skip_audio)
    return 0


if __name__ == "__main__":
    sys.exit(main())
