import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def module():
    spec = importlib.util.spec_from_file_location("voice_review_sync", ROOT / "scripts" / "voice_review_sync.py")
    result = importlib.util.module_from_spec(spec)
    sys.modules["voice_review_sync"] = result
    spec.loader.exec_module(result)
    return result


sync = module()
VOICE = "Assets/Voice/Quests/line"
NODES = "Assets/Data/Line/Dialogues"


def node_asset(next_guids):
    choices = "".join(f"  - choiceText: x\n    nextNode: {{fileID: 11400000, guid: {g}, type: 2}}\n" for g in next_guids)
    return f"MonoBehaviour:\n  speakerName: Nemo\n  choices:\n{choices or '  []'}\n"


class FakeDb:
    def __init__(self, items=None, decisions=None):
        self.tables = {"voice_review_items": list(items or []), "voice_review_decisions": list(decisions or [])}
        self.uploads, self.removed, self.deleted = [], [], []

    def select_all(self, table, columns):
        return [dict(r) for r in self.tables[table]]

    def upsert(self, table, rows):
        by_clip = {r["clip_path"]: r for r in self.tables[table]}
        for row in rows:
            by_clip[row["clip_path"]] = {**by_clip.get(row["clip_path"], {}), **row}
        self.tables[table] = list(by_clip.values())

    def delete_items(self, clips):
        self.deleted += clips

    def upload(self, object_path, file):
        self.uploads.append(object_path)

    def remove_objects(self, paths):
        self.removed += paths


class VoiceReviewSyncTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        tools = self.root / "Tools" / "voice"
        tools.mkdir(parents=True)
        # One chain start -> s01, then finish as its own chain; q02 has no take yet.
        nodes = {"Dialogue_line_q01_start": ("a1", ["a2"]), "Dialogue_line_q01_s01": ("a2", []),
                 "Dialogue_line_q01_finish": ("a3", []), "Dialogue_line_q02_start": ("a4", [])}
        rows, lock = [], {}
        for name, (guid, nexts) in nodes.items():
            asset = self.root / NODES / f"{name}.asset"
            asset.parent.mkdir(parents=True, exist_ok=True)
            asset.write_text(node_asset(nexts), encoding="utf-8")
            (asset.parent / f"{name}.asset.meta").write_text(f"fileFormatVersion: 2\nguid: {guid}\n", encoding="utf-8")
            clip = f"{VOICE}/{name}.mp3"
            (self.root / clip).parent.mkdir(parents=True, exist_ok=True)
            (self.root / clip).write_bytes(name.encode())
            rows.append({"clip_path": clip, "group": "line", "speaker": "Nemo", "node_path": f"{NODES}/{name}.asset",
                         "display_text": f"שלום {name}", "tts_text": f"שלום {name}", "display_hash": "", "legacy_clip": "", "notes": ""})
            if name != "Dialogue_line_q02_start":  # no take yet: not listed
                lock[clip] = {"hash": f"h_{name}"}
        header = list(rows[0])
        lines = [",".join(f'"{h}"' for h in header)] + [",".join(f'"{r[h]}"' for h in header) for r in rows]
        (tools / "voice_script.csv").write_text("﻿" + "\n".join(lines) + "\n", encoding="utf-8")
        (tools / "generated.lock.json").write_text(json.dumps(lock), encoding="utf-8")
        (tools / "voice_cast.json").write_text(json.dumps({"speakers": {"Nemo": {"voice_name": "EK - Nemo"}}}), encoding="utf-8")
        self.project = sync.UnityProject(self.root)

    def tearDown(self):
        self.temp.cleanup()

    def clip(self, name):
        return f"{VOICE}/{name}.mp3"

    def write_review(self, entries):
        self.project.review_file.write_bytes(
            json.dumps(entries, ensure_ascii=False, indent=2).replace("\n", "\r\n").encode("utf-8"))

    def test_items_follow_the_dialogue_chain_and_skip_lines_without_a_take(self):
        items = self.project.load_items()
        self.assertEqual([Path(i.clip_path).stem for i in items],
                         ["Dialogue_line_q01_start", "Dialogue_line_q01_s01", "Dialogue_line_q01_finish"])
        self.assertEqual([i.section for i in items], ["Quest 1 · start", "Quest 1 · start", "Quest 1 · finish"])
        self.assertEqual([i.position for i in items], [0, 1, 2])
        self.assertEqual(items[0].voice_name, "EK - Nemo")
        self.assertTrue(items[0].audio_path().endswith("/h_Dialogue_line_q01_start.mp3"))

    def test_review_file_round_trips_byte_for_byte(self):
        entry = {"status": "rejected", "tags": ["Too fast"], "note": "לאט", "take_hash": "h", "speaker": "Nemo",
                 "text": "שלום", "reviewed_at": "2026-09-30T12:00:00", "extra": 1}
        self.write_review({self.clip("b"): entry, self.clip("a"): dict(entry, tags=[])})
        before = self.project.review_file.read_bytes()
        review = sync.ReviewFile.load(self.project.review_file)
        review.entries = dict(sorted(review.entries.items()))
        self.assertEqual(review.text().encode("utf-8"), json.dumps(
            {k: review.entries[k] for k in sorted(review.entries)}, ensure_ascii=False, indent=2).replace("\n", "\r\n").encode())
        self.assertIn(b"\r\n", before)

    def test_first_sync_uploads_takes_and_sends_unity_decisions_to_the_web(self):
        start = self.clip("Dialogue_line_q01_start")
        self.write_review({start: {"status": "accepted", "tags": [], "note": "", "take_hash": "h_Dialogue_line_q01_start",
                                   "speaker": "Nemo", "text": "x", "reviewed_at": "2026-09-30T12:00:00"}})
        db = FakeDb()
        sync.sync(self.project, db, dry_run=False, skip_audio=False, log=lambda *_: None)
        self.assertEqual(len(db.uploads), 3)
        self.assertEqual(len(db.tables["voice_review_items"]), 3)
        [decision] = db.tables["voice_review_decisions"]
        self.assertEqual((decision["clip_path"], decision["status"], decision["reviewer_name"]), (start, "accepted", "Unity"))

        # Nothing changed: the second run uploads nothing.
        db.uploads.clear()
        sync.sync(self.project, db, dry_run=False, skip_audio=False, log=lambda *_: None)
        self.assertEqual(db.uploads, [])

    def test_newer_web_decision_lands_in_the_review_file_and_keeps_unknown_keys(self):
        start = self.clip("Dialogue_line_q01_start")
        self.write_review({start: {"status": "accepted", "tags": [], "note": "", "take_hash": "h1", "speaker": "Nemo",
                                   "text": "x", "reviewed_at": "2026-09-01T12:00:00", "legacy_swapped": True}})
        db = FakeDb(decisions=[{"clip_path": start, "status": "rejected", "tags": ["Pronunciation"], "note": "להיבחן",
                                "take_hash": "h1", "speaker": "Nemo", "text": "x",
                                "reviewed_at": "2026-09-30T09:15:00.123456+00:00", "reviewer_name": "guide"}])
        sync.sync(self.project, db, dry_run=False, skip_audio=True, log=lambda *_: None)
        saved = json.loads(self.project.review_file.read_text(encoding="utf-8"))[start]
        self.assertEqual(list(saved)[:7], sync.REVIEW_FIELDS)
        self.assertEqual((saved["status"], saved["tags"], saved["note"]), ("rejected", ["Pronunciation"], "להיבחן"))
        self.assertTrue(saved["legacy_swapped"])
        self.assertNotIn("+", saved["reviewed_at"])
        self.assertIn(b"\r\n", self.project.review_file.read_bytes())

    def test_older_web_decision_is_replaced_by_the_newer_unity_one(self):
        start = self.clip("Dialogue_line_q01_start")
        local = {"status": "accepted", "tags": [], "note": "", "take_hash": "h2", "speaker": "Nemo", "text": "x",
                 "reviewed_at": "2026-09-30T23:00:00"}
        web = {"clip_path": start, "status": "rejected", "tags": ["Too fast"], "note": "", "take_hash": "h1",
               "speaker": "Nemo", "text": "x", "reviewed_at": "2026-09-01T00:00:00+00:00"}
        plan = sync.plan_decisions({start: local}, [web])
        self.assertEqual(plan.to_local, {})
        self.assertEqual(plan.to_db[0]["take_hash"], "h2")
        # Identical decisions are left alone.
        same = dict(web, status="accepted", tags=[], take_hash="h2")
        self.assertEqual(sync.plan_decisions({start: local}, [same]).to_db, [])

    def test_lines_removed_from_the_script_are_unlisted_with_their_audio(self):
        db = FakeDb(items=[{"clip_path": "Assets/old.mp3", "audio_path": "dialogue/old/h.mp3", "alternate_audio_path": None}])
        sync.sync(self.project, db, dry_run=False, skip_audio=False, log=lambda *_: None)
        self.assertEqual(db.deleted, ["Assets/old.mp3"])
        self.assertEqual(db.removed, ["dialogue/old/h.mp3"])

    def test_dry_run_changes_nothing(self):
        db = FakeDb()
        sync.sync(self.project, db, dry_run=True, skip_audio=False, log=lambda *_: None)
        self.assertEqual((db.uploads, db.tables["voice_review_items"]), ([], []))
        self.assertFalse(self.project.review_file.exists())


if __name__ == "__main__":
    unittest.main()
