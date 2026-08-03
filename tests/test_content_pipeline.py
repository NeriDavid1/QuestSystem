import importlib.util
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def load_importer():
    path = ROOT / "scripts" / "import_yaml_to_supabase.py"
    spec = importlib.util.spec_from_file_location("quest_importer", path)
    if spec is None or spec.loader is None:
        raise RuntimeError("Unable to load importer module")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class ContentPipelineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.importer = load_importer()
        cls.bundle = cls.importer.build_bundle()

    def test_import_counts_match_source_contract(self):
        self.assertEqual(
            self.bundle["counts"],
            {
                "catalog_entries": 222,
                "step_type_definitions": 6,
                "dialogues": 54,
                "dialogue_lines": 150,
                "minigame_instances": 52,
                "questlines": 4,
                "quests": 26,
                "steps": 155,
                "errors": 0,
                "warnings": 17,
                "info": 0,
            },
        )

    def test_import_is_deterministic(self):
        second = self.importer.build_bundle()
        self.assertEqual(self.bundle["source_digest"], second["source_digest"])
        self.assertEqual(
            json.dumps(self.bundle, sort_keys=True, ensure_ascii=False),
            json.dumps(second, sort_keys=True, ensure_ascii=False),
        )

    def test_step_rewards_do_not_leak_into_quest_rewards(self):
        for questline in self.bundle["questlines"]:
            for quest in questline["quests"]:
                quest_reward_keys = {
                    (reward.get("reward_type"), reward.get("item_external_id"), reward.get("xp_amount"))
                    for reward in quest.get("rewards", [])
                }
                for step in quest.get("steps", []):
                    for reward in step.get("rewards", []):
                        self.assertNotIn(
                            (reward.get("reward_type"), reward.get("item_external_id"), reward.get("xp_amount")),
                            quest_reward_keys,
                            f"step reward leaked into {quest['key']}",
                        )

    def test_graph_and_reward_counts_match_imported_documents(self):
        prerequisites = sum(
            len(quest.get("prerequisites", []))
            for questline in self.bundle["questlines"]
            for quest in questline["quests"]
        )
        rewards = sum(
            len(quest.get("rewards", [])) + sum(len(step.get("rewards", [])) for step in quest.get("steps", []))
            for questline in self.bundle["questlines"]
            for quest in questline["quests"]
        )
        self.assertEqual(prerequisites, 22)
        self.assertEqual(rewards, 84)

    def test_report_and_generated_bundle_are_present(self):
        report = json.loads((ROOT / "reports" / "quest_import_report.json").read_text(encoding="utf-8"))
        generated = json.loads((ROOT / "supabase" / "seed" / "quest_content_bundle.json").read_text(encoding="utf-8"))
        self.assertEqual(report["source_digest"], generated["source_digest"])
        self.assertEqual(report["counts"], generated["counts"])

    def test_hebrew_viewer_keeps_yaml_fallback_and_runtime_loader(self):
        template = (ROOT / "presentation" / "viewer-template.html").read_text(encoding="utf-8")
        generated = (ROOT / "presentation" / "viewer.html").read_text(encoding="utf-8")
        self.assertIn("fetchPublishedSnapshotData", template)
        self.assertIn("/*__SUPABASE_CONFIG__*/", template)
        self.assertIn("safeRichText", template)
        self.assertIn("safeRichText(line)", template)
        self.assertIn("safeRichText(formatStep(step))", template)
        self.assertIn('const RUNTIME_CONFIG = {"url": "", "anonKey": ""};', generated)
        self.assertIn("bootViewer", generated)
        self.assertIn("source_yaml", generated)
        self.assertIn("if (source) stats.appendChild(source);", generated)

    def test_schema_has_published_snapshot_and_private_rls_helpers(self):
        schema = (ROOT / "supabase" / "migrations" / "20260803100000_quest_editor.sql").read_text(encoding="utf-8")
        hardening = (ROOT / "supabase" / "migrations" / "20260803102000_security_hardening.sql").read_text(encoding="utf-8")
        performance = (ROOT / "supabase" / "migrations" / "20260803103000_performance_hardening.sql").read_text(encoding="utf-8")
        for table in (
            "workspace_members",
            "questlines",
            "quests",
            "quest_steps",
            "quest_prerequisites",
            "quest_rewards",
            "questline_revisions",
            "audit_log",
        ):
            self.assertIn(f"public.{table}", schema)
        self.assertIn("create schema if not exists private", hardening)
        self.assertIn("private.is_quest_editor()", hardening)
        self.assertIn("revoke execute", hardening.lower())
        self.assertIn("quest_prerequisites_prerequisite_quest_id_idx", performance)
        self.assertIn("(select auth.uid())", performance)

    def test_editor_has_auth_persistence_and_navigation_contract(self):
        editor = ROOT / "editor"
        package = json.loads((editor / "package.json").read_text(encoding="utf-8"))
        app = (editor / "src" / "App.tsx").read_text(encoding="utf-8")
        supabase = (editor / "src" / "lib" / "supabase.ts").read_text(encoding="utf-8")
        vite = (editor / "vite.config.ts").read_text(encoding="utf-8")
        env_example = (editor / ".env.example").read_text(encoding="utf-8")

        self.assertEqual(package["scripts"]["typecheck"], "tsc --noEmit")
        self.assertIn("@supabase/supabase-js", package["dependencies"])
        for marker in (
            "AuthScreen",
            "AccessRequired",
            "claimFirstAdmin",
            "GraphWithStepCounts",
            "PrerequisiteEditor",
            "RewardEditor",
            "DialogueCard",
            "MinigameCard",
            "persistDraft",
            "PublishConfirmModal",
            "autoSaveInFlight",
            "undo",
            "redo",
        ):
            self.assertIn(marker, app)
        self.assertIn("loadEditorData", supabase)
        self.assertIn("VITE_SUPABASE_URL", env_example)
        self.assertIn("VITE_BASE_PATH", vite)

    def test_pages_workflow_builds_viewer_and_editor_together(self):
        workflow = (ROOT / ".github" / "workflows" / "pages.yml").read_text(encoding="utf-8")
        for marker in (
            "actions/setup-node@v4",
            "working-directory: editor",
            "npm ci",
            "npm run build",
            "VITE_SUPABASE_ANON_KEY",
            "cp -R editor/dist/. site/editor/",
            "path: site",
        ):
            self.assertIn(marker, workflow)


if __name__ == "__main__":
    unittest.main()
