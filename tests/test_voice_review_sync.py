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
    def __init__(self, items=None, decisions=None, takes=None, objects=None):
        self.tables = {"voice_review_items": list(items or []), "voice_review_decisions": list(decisions or []),
                       "voice_review_speakers": [], "voice_review_groups": [], "voice_review_voices": [],
                       "voice_review_takes": list(takes or [])}
        self.objects = dict(objects or {})
        self.uploads, self.removed, self.deleted, self.calls = [], [], [], []

    def select_where(self, table, query):
        assert table == "voice_review_takes" and "status=eq.chosen" in query
        return [dict(t) for t in self.tables[table] if t["status"] == "chosen" and not t.get("imported_at")]

    def rpc(self, name, args):
        self.calls.append((name, args))
        if name == "voice_review_mark_imported":
            for take in self.tables["voice_review_takes"]:
                if take["id"] in args["p_takes"]:
                    take["imported_at"] = "now"

    def download(self, path):
        return self.objects[path]

    def select_all(self, table, columns, key="clip_path"):
        return [dict(r) for r in self.tables[table]]

    def upsert(self, table, rows, key="clip_path"):
        by_key = {r[key]: r for r in self.tables[table]}
        for row in rows:
            by_key[row[key]] = {**by_key.get(row[key], {}), **row}
        self.tables[table] = list(by_key.values())

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

    def write_take(self, clip, take, **lock_entry):
        (self.root / clip).parent.mkdir(parents=True, exist_ok=True)
        (self.root / clip).write_bytes(take.encode())
        lock_path = self.root / "Tools" / "voice" / "generated.lock.json"
        lock = json.loads(lock_path.read_text(encoding="utf-8"))
        lock[clip] = {"hash": take, **lock_entry}
        lock_path.write_text(json.dumps(lock), encoding="utf-8")

    def test_girl_take_follows_its_line_and_other_voiced_lines_are_listed(self):
        tools = self.root / "Tools" / "voice"
        start_node = f"{NODES}/Dialogue_line_q01_start.asset"
        girl = f"{VOICE}/Dialogue_line_q01_start_girl.mp3"
        self.write_take(girl, "g1")
        (tools / "girl_script.csv").write_text(
            '"clip_path","group","speaker","node_path","display_text","tts_text"\n'
            f'"{girl}","line","Nemo","{start_node}","שלום ילדה","שלום ילדה"\n', encoding="utf-8")
        (tools / "bubble_lines.json").write_text(json.dumps({"lines": [
            {"id": "abc_quest_d_x_1_say", "speaker": "פיפ", "text": "גרב!", "tts_text": "גרב!"}]}), encoding="utf-8")
        (tools / "cutscene_lines.json").write_text(json.dumps({"lines": [
            {"id": "intro1_01", "timeline": "TL_Intro1_Opening", "speaker": "פיפ", "text": "פיפ: שלום", "tts_text": "שלום"}]}),
            encoding="utf-8")
        (tools / "ambient_lines.json").write_text(json.dumps({
            "characters": {"Mia": {"display_name": "מיה האופה", "voice_speaker": "Mia the Baker"}},
            "conversations": {}, "lines": [{"id": "mia_greet_01", "character": "Mia", "text": "לחם!"}]}), encoding="utf-8")
        self.write_take(f"{sync.VOICE_ROOT}/Bubbles/abc_quest_d_x_1_say.mp3", "b1", speaker="פיפ")
        self.write_take(f"{sync.VOICE_ROOT}/Bubbles/abc_quest_d_x_1_say_girl.mp3", "b2", speaker="פיפ")
        self.write_take(f"{sync.VOICE_ROOT}/Cutscenes/intro1_01.mp3", "c1", speaker="פיפ", tts_text="[warmly] שלום")
        self.write_take(f"{sync.VOICE_ROOT}/Ambient/Mia/mia_greet_01.mp3", "a1", speaker="Mia the Baker")

        items = self.project.load_items()
        line = [i for i in items if i.group_key == "line"]
        self.assertEqual([(Path(i.clip_path).stem, i.variant) for i in line[:3]],
                         [("Dialogue_line_q01_start", ""), ("Dialogue_line_q01_start_girl", "girl"), ("Dialogue_line_q01_s01", "")])
        self.assertEqual([i.position for i in line], list(range(len(line))))
        extra = {(i.source, i.variant): i for i in items if i.source != "dialogue"}
        self.assertEqual(sorted(extra), [("ambient", ""), ("bubble", ""), ("bubble", "girl"), ("cutscene", "")])
        self.assertEqual((extra["bubble", ""].group_key, extra["bubble", ""].section), ("abc_valley", "Speech bubbles · Quest D"))
        self.assertEqual((extra["cutscene", ""].on_screen_text, extra["cutscene", ""].tts_text), ("שלום", "[warmly] שלום"))
        self.assertEqual(extra["cutscene", ""].section, "Cutscene · Intro1 Opening")
        mia = extra["ambient", ""]
        self.assertEqual((mia.group_key, mia.speaker, mia.speaker_key), ("ambient", "מיה האופה", "Mia the Baker"))
        self.assertTrue(mia.audio_path().startswith("ambient/"))

        speakers, groups, _ = self.project.people(items)
        self.assertIn({"speaker_key": "Mia the Baker", "display_name": "מיה האופה (Mia the Baker)"},
                      [{k: s[k] for k in ("speaker_key", "display_name")} for s in speakers])
        self.assertEqual([g["group_key"] for g in groups], ["abc_valley", "line", "ambient"])

    def test_each_line_knows_its_voice_and_the_voices_are_listed(self):
        tools = self.root / "Tools" / "voice"
        (tools / "voice_cast.json").write_text(json.dumps({
            "defaults": {"model_id": "eleven_v4", "language_code": "he", "output_format": "mp3_44100_128", "seed": None,
                         "voice_settings": {"stability": 0.5}, "pronunciation_dictionaries": []},
            "speakers": {"Nemo": {"voice_name": "EK - Nemo", "voice_id": "v_nemo", "approved": True,
                                  "voice_settings": {"style": 0.2}, "fx": "atempo=1.1", "aliases": ["Bobby"]},
                         "Draft": {"voice_name": "EK - Draft"}}}), encoding="utf-8")
        items = self.project.load_items()
        self.assertEqual({i.voice_key for i in items}, {"Nemo"})
        self.assertEqual(sync.VoiceCast({"speakers": {"Nemo": {"aliases": ["Bobby"]}}}).voice_key_for("Bobby"), "Nemo")
        voices = {v["voice_key"]: v for v in self.project.voices()}
        self.assertEqual(voices["Nemo"]["request"], {
            "voice_id": "v_nemo", "model_id": "eleven_v4", "language_code": "he", "output_format": "mp3_44100_128",
            "seed": None, "voice_settings": {"stability": 0.5, "style": 0.2}, "pronunciation_dictionaries": []})
        self.assertEqual((voices["Nemo"]["fx"], voices["Nemo"]["approved"]), ("atempo=1.1", True))
        self.assertFalse(voices["Draft"]["approved"])

    def test_a_chosen_web_take_goes_into_the_project(self):
        tools = self.root / "Tools" / "voice"
        cast = {"defaults": {"model_id": "eleven_v4", "language_code": "he", "output_format": "mp3_44100_128",
                             "seed": None, "voice_settings": {"stability": 0.5}, "pronunciation_dictionaries": []},
                "speakers": {"Nemo": {"voice_name": "EK - Nemo", "voice_id": "v_nemo", "approved": True}}}
        (tools / "voice_cast.json").write_text(json.dumps(cast), encoding="utf-8")
        # The script keeps its exact format (BOM, quoting, CRLF rows, LF inside a field).
        csv_path = tools / "voice_script.csv"
        csv_path.write_bytes(csv_path.read_bytes().replace(b"\r\n", b"\n").replace(b"\n", b"\r\n").replace(
            "שלום Dialogue_line_q01_s01".encode(), "שלום\nשורה".encode(), 1))
        before = csv_path.read_bytes()

        clip = self.clip("Dialogue_line_q01_start")
        new_text = "שָׁלוֹם Dialogue_line_q01_start"
        request = {**self.project.voices()[0]["request"], "text": new_text}
        take = {"id": "1234abcd-0000-0000-0000-000000000000", "clip_path": clip, "voice_key": "Nemo", "text": new_text,
                "request": request, "audio_path": "takes/x/1.mp3", "status": "chosen", "creator_name": "guide@x",
                "chosen_by_name": "guide@x", "imported_at": None}
        db = FakeDb(takes=[take], objects={"takes/x/1.mp3": b"NEW AUDIO"})
        sync.sync(self.project, db, dry_run=False, skip_audio=False, log=lambda *_: None)

        self.assertEqual((self.root / clip).read_bytes(), b"NEW AUDIO")  # no generator in this project: raw
        self.assertEqual((tools / "raw" / clip).read_bytes(), b"NEW AUDIO")
        lock = json.loads((tools / "generated.lock.json").read_text(encoding="utf-8"))[clip]
        expected_hash = sync.request_hash(self.project.resolve_request(cast, cast["speakers"]["Nemo"], new_text))
        self.assertEqual((lock["hash"], lock["tts_text"], lock["web_take"]), (expected_hash, new_text, take["id"]))
        decision = json.loads(self.project.review_file.read_text(encoding="utf-8"))[clip]
        self.assertEqual((decision["status"], decision["take_hash"]), ("accepted", expected_hash))
        self.assertEqual(db.calls, [("voice_review_mark_imported", {"p_takes": [take["id"]]})])
        # The edited text is in the script, and nothing else in the file changed.
        after = csv_path.read_bytes()
        self.assertEqual(after.replace(new_text.encode(), "שלום Dialogue_line_q01_start".encode()), before)
        # The web lists the new audio (new path although the request hash may repeat), and the decision.
        row = next(r for r in db.tables["voice_review_items"] if r["clip_path"] == clip)
        self.assertTrue(row["audio_path"].endswith(f"{expected_hash}-1234abcd.mp3"))
        self.assertIn(row["audio_path"], db.uploads)
        self.assertEqual(next(d for d in db.tables["voice_review_decisions"] if d["clip_path"] == clip)["status"], "accepted")

        # Imported once only.
        db.uploads.clear()
        sync.sync(self.project, db, dry_run=False, skip_audio=False, log=lambda *_: None)
        self.assertEqual(len(db.calls), 1)

    def test_character_of_a_line(self):
        cast = sync.VoiceCast({"speakers": {
            "Village Head": {"aliases": ["ראש הכפר", "Bobby"]},
            "Garrick": {"node_paths": ["Assets/Data/Gate/"]}}})
        self.assertEqual(cast.character_for("ראש הכפר"), "Village Head")   # Hebrew name of the same character
        self.assertEqual(cast.character_for("Bobby"), "Bobby")             # another character borrowing the voice
        self.assertEqual(cast.character_for("השומר", "Assets/Data/Gate/x.asset"), "Garrick")
        self.assertEqual(cast.display_name("Village Head"), "ראש הכפר (Village Head)")
        self.assertEqual(sync.bubble_section("abc_quest_hw3_2_say"), "Speech bubbles · Homework 3")
        self.assertEqual(sync.girl_clip("A/b/c.mp3"), "A/b/c_girl.mp3")

    def test_dry_run_changes_nothing(self):
        db = FakeDb()
        sync.sync(self.project, db, dry_run=True, skip_audio=False, log=lambda *_: None)
        self.assertEqual((db.uploads, db.tables["voice_review_items"]), ([], []))
        self.assertFalse(self.project.review_file.exists())


if __name__ == "__main__":
    unittest.main()
