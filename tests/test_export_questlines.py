import importlib.util
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def load_exporter():
    path = ROOT / "scripts" / "export_questlines_to_yaml.py"
    spec = importlib.util.spec_from_file_location("quest_exporter", path)
    if spec is None or spec.loader is None:
        raise RuntimeError("Unable to load exporter module")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class QuestlineExportTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.exporter = load_exporter()
        bundle = json.loads(
            (ROOT / "supabase" / "seed" / "quest_content_bundle.json").read_text(encoding="utf-8")
        )
        cls.documents = cls.exporter.load_documents(bundle)
        cls.exported = cls.exporter.export_documents(cls.documents)

    def test_load_documents_accepts_bundle_single_and_list_shapes(self):
        exporter = self.exporter
        self.assertEqual(len(self.documents), 6)
        self.assertEqual(exporter.load_documents(self.documents[0]), [self.documents[0]])
        self.assertEqual(exporter.load_documents({"document": self.documents[0]}), [self.documents[0]])
        self.assertEqual(exporter.load_documents({"questlines": self.documents}), self.documents)

    def test_exports_one_index_plus_one_file_per_quest(self):
        self.assertEqual(set(self.exported.keys()), {doc["key"] for doc in self.documents})
        for doc in self.documents:
            files = self.exported[doc["key"]]
            self.assertIn("_index.yaml", files)
            for quest in doc["quests"]:
                self.assertIn(f"{quest['key']}.yaml", files)

    def test_index_yaml_carries_line_identity_and_range(self):
        for doc in self.documents:
            text = self.exported[doc["key"]]["_index.yaml"]
            self.assertIn(f"  id: {doc['key']}", text)
            self.assertIn("  npc_id:", text)
            self.assertIn("  display_name:", text)
            self.assertIn("  theme:", text)
            self.assertIn(f"  quest_count: {len(doc['quests'])}", text)
            self.assertIn("  level_range: [", text)
            self.assertIn("quests:", text)

    def test_quest_files_preserve_steps_order_and_count(self):
        for doc in self.documents:
            for quest in doc["quests"]:
                text = self.exported[doc["key"]][f"{quest['key']}.yaml"]
                self.assertIn("quest:", text)
                self.assertIn(f"  id: {quest['key']}", text)
                steps = sorted(
                    quest["steps"],
                    key=lambda step: (step.get("position", 0), step.get("key", "")),
                )
                blocks = text.split("\n  - type: ")[1:]
                self.assertEqual(len(blocks), len(steps))
                self.assertEqual(
                    [block.splitlines()[0] for block in blocks],
                    [step["type"] for step in steps],
                )

    def test_quest_files_preserve_turn_in_flag(self):
        for doc in self.documents:
            for quest in doc["quests"]:
                text = self.exported[doc["key"]][f"{quest['key']}.yaml"]
                expected = str(bool(quest.get("wait_for_npc_turn_in", False))).lower()
                self.assertIn(f"  wait_for_npc_turn_in: {expected}", text)

    def test_pipeline_instance_key_is_exported_as_instance_id(self):
        seen = 0
        for doc in self.documents:
            for quest in doc["quests"]:
                for step in quest["steps"]:
                    payload = step.get("payload") or {}
                    if "instance_key" not in payload:
                        continue
                    text = self.exported[doc["key"]][f"{quest['key']}.yaml"]
                    self.assertIn(f"    instance_id: {payload['instance_key']}", text)
                    self.assertNotIn("    instance_key:", text)
                    seen += 1
        self.assertGreater(seen, 0)

    def test_play_minigame_step_rewards_are_embedded_in_the_step(self):
        found = 0
        for doc in self.documents:
            for quest in doc["quests"]:
                for step in quest["steps"]:
                    if step["type"] != "play_minigame" or not step.get("rewards"):
                        continue
                    reward = next(
                        (item for item in step["rewards"] if item.get("reward_type") == "item"),
                        None,
                    )
                    if not reward:
                        continue
                    text = self.exported[doc["key"]][f"{quest['key']}.yaml"]
                    self.assertIn(f"    reward_item_id: {reward['item_external_id']}", text)
                    self.assertIn(f"    reward_amount: {reward['amount']}", text)
                    found += 1
        self.assertGreater(found, 0)

    def test_quest_level_rewards_are_summed_in_index(self):
        for doc in self.documents:
            index = self.exported[doc["key"]]["_index.yaml"]
            for quest in doc["quests"]:
                xp = sum(
                    int(reward.get("xp_amount") or 0)
                    for reward in quest.get("rewards", [])
                    if reward.get("scope") == "quest" and reward.get("reward_type") == "xp"
                )
                item = next(
                    (
                        reward
                        for reward in quest.get("rewards", [])
                        if reward.get("scope") == "quest"
                        and reward.get("reward_type") == "item"
                        and reward.get("item_external_id")
                    ),
                    None,
                )
                self.assertIn(f"  - id: {quest['key']}", index)
                self.assertIn(f"    level: {quest.get('level_required')}", index)
                if item:
                    self.assertIn(
                        f"{{ id: {item['item_external_id']}, amount: {item['amount']} }}",
                        index,
                    )

    def test_export_is_deterministic(self):
        second = self.exporter.export_documents(self.documents)
        self.assertEqual(
            json.dumps(self.exported, sort_keys=True, ensure_ascii=False),
            json.dumps(second, sort_keys=True, ensure_ascii=False),
        )

    def test_rejects_duplicate_questline_keys(self):
        with self.assertRaises(ValueError):
            self.exporter.export_documents([self.documents[0], self.documents[0]])


if __name__ == "__main__":
    unittest.main()
