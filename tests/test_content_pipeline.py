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
                "catalog_entries": 267,
                "step_type_definitions": 7,
                "dialogues": 255,
                "dialogue_lines": 609,
                "minigame_instances": 449,
                "questlines": 31,
                "quests": 116,
                "steps": 591,
                "errors": 0,
                "warnings": 0,
                "info": 56,
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
        self.assertEqual(prerequisites, 90)
        self.assertEqual(rewards, 218)

    def test_report_and_generated_bundle_are_present(self):
        report = json.loads((ROOT / "reports" / "quest_import_report.json").read_text(encoding="utf-8"))
        generated = json.loads((ROOT / "supabase" / "seed" / "quest_content_bundle.json").read_text(encoding="utf-8"))
        self.assertEqual(report["source_digest"], generated["source_digest"])
        self.assertEqual(report["counts"], generated["counts"])

    def test_hebrew_viewer_keeps_yaml_fallback_and_runtime_loader(self):
        template = (ROOT / "presentation" / "viewer-template.html").read_text(encoding="utf-8")
        generated = (ROOT / "presentation" / "viewer.html").read_text(encoding="utf-8")
        self.assertIn("fetchPublishedSnapshotData", template)
        self.assertIn("get_published_viewer_extras", template)
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
        open_join = (ROOT / "supabase" / "migrations" / "20260803104000_open_editor_join.sql").read_text(encoding="utf-8")
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
        self.assertIn("ensure_workspace_member", open_join)

    def test_editor_has_auth_persistence_and_navigation_contract(self):
        editor = ROOT / "editor"
        package = json.loads((editor / "package.json").read_text(encoding="utf-8"))
        app = (editor / "src" / "App.tsx").read_text(encoding="utf-8")
        store = (editor / "src" / "state" / "EditorStore.tsx").read_text(encoding="utf-8")
        messages = (editor / "src" / "i18n" / "messages.ts").read_text(encoding="utf-8")
        supabase = (editor / "src" / "lib" / "supabase.ts").read_text(encoding="utf-8")
        vite = (editor / "vite.config.ts").read_text(encoding="utf-8")
        env_example = (editor / ".env.example").read_text(encoding="utf-8")

        self.assertEqual(package["scripts"]["typecheck"], "tsc --noEmit")
        self.assertIn("@supabase/supabase-js", package["dependencies"])
        for marker in ("AuthScreen", "AccessRequired", "PublishConfirmModal"):
            self.assertIn(marker, app)
        # Feature components and store actions moved out of App.tsx during the
        # localization refactor; assert they exist somewhere in editor/src.
        source_tree = "\n".join(
            path.read_text(encoding="utf-8")
            for path in sorted((editor / "src").rglob("*"))
            if path.is_file() and path.suffix in {".ts", ".tsx"}
        )
        for marker in (
            "GraphWithStepCounts",
            "PrerequisiteEditor",
            "RewardEditor",
            "DialogueCard",
            "MinigameCard",
            "persistDraft",
            "autoSaveInFlight",
            "undo",
            "redo",
        ):
            self.assertIn(marker, source_tree)
        # Localized account-creation copy and workspace membership live in the
        # i18n bundle and the store, which App.tsx consumes.
        self.assertIn("Create account & edit", messages)
        self.assertIn("ensure_workspace_member", store)
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

    def test_wait_for_npc_turn_in_flows_from_yaml_to_db_and_editor(self):
        """The Unity QuestDefinitionSO.waitForNpcTurnIn flag must be authorable
        everywhere: quest YAML, the imported bundle, the DB schema, and the editor."""
        quests_by_key = {
            quest["key"]: quest
            for questline in self.bundle["questlines"]
            for quest in questline["quests"]
        }
        self.assertEqual(len(quests_by_key), 116)
        self.assertTrue(quests_by_key["q01_runaway_hammer"]["wait_for_npc_turn_in"])  # blacksmith_will
        self.assertTrue(
            quests_by_key["adjectives_basics__q01_the_painting_with_no_colors"]["wait_for_npc_turn_in"]
        )  # adjectives_basics
        self.assertFalse(quests_by_key["q01_roles_without_names"]["wait_for_npc_turn_in"])  # kingdom_nouns

        for instance in self.bundle["minigame_instances"]:
            self.assertIn(
                instance.get("minigame_id"),
                {
                    "letter_ordering",
                    "word_ordering",
                    "speak_aloud",
                    "word_matching",
                    "letter_drawing",
                    "dwarf_miner",
                    "fruit_slice",
                },
                msg=f"instance {instance.get('key')} missing catalog minigame_id",
            )
            self.assertIsInstance(instance.get("params"), dict)
        migration = (ROOT / "supabase" / "migrations" / "20260803140000_quest_wait_turn_in.sql").read_text(
            encoding="utf-8"
        )
        self.assertIn("wait_for_npc_turn_in boolean not null default false", migration)
        self.assertIn("wait_for_npc_turn_in = excluded.wait_for_npc_turn_in", migration)

        editor_types = (ROOT / "editor" / "src" / "lib" / "types.ts").read_text(encoding="utf-8")
        inspector = (ROOT / "editor" / "src" / "components" / "editor" / "QuestInspector.tsx").read_text(
            encoding="utf-8"
        )
        messages = (ROOT / "editor" / "src" / "i18n" / "messages.ts").read_text(encoding="utf-8")
        self.assertIn("wait_for_npc_turn_in: boolean", editor_types)
        self.assertIn("updateQuest({ wait_for_npc_turn_in:", inspector)
        self.assertIn("waitForNpcTurnIn", messages)

        # The importer splits quests into 06_quests_NNN.sql chunks once the line count grows.
        quests_sql = "".join(
            path.read_text(encoding="utf-8")
            for path in sorted((ROOT / "supabase" / "seed" / "generated").glob("06_quests*.sql"))
        )
        self.assertIn("wait_for_npc_turn_in", quests_sql)
        # Every quest YAML declares the flag so the editor has a value to show.
        for questline in self.bundle["questlines"]:
            for quest in questline["quests"]:
                self.assertIn(
                    "wait_for_npc_turn_in:",
                    (ROOT / quest["source_path"]).read_text(encoding="utf-8"),
                    f"{quest['key']} YAML must declare wait_for_npc_turn_in",
                )

    # ---- Unity-built lines (custom steps, e.g. abc_valley) ----

    def abc_valley(self):
        return next(line for line in self.bundle["questlines"] if line["key"] == "abc_valley")

    def test_custom_steps_keep_their_unity_objective_index_and_stable_key(self):
        custom = [
            (quest, step)
            for quest in self.abc_valley()["quests"]
            for step in quest["steps"]
            if step["type"] == "custom"
        ]
        self.assertEqual(len(custom), 58)
        for quest, step in custom:
            index = step["payload"]["unity_objective_index"]
            self.assertEqual(step["key"], f"{self.importer.slug(quest['key'])}_custom_o{index}")
            self.assertTrue(step["payload"]["handler_id"])
            self.assertIn(step["payload"]["reactor"], {
                "task_set", "cutscene", "escort", "monster_encounter", "choice_rounds", "wave_defense", "museum",
            })
            if step["payload"]["reactor"] == "task_set":
                tasks = step["payload"]["tasks"]
                self.assertEqual([task["index"] for task in tasks], list(range(len(tasks))))
                self.assertTrue(all(task["mode"] in {"scene", "minigame", "none"} for task in tasks))

    def test_explicit_first_talk_objective_is_not_promoted_to_start_dialogue(self):
        quest = next(quest for quest in self.abc_valley()["quests"] if quest["key"] == "abc_a_shards")
        self.assertIsNone(quest["start_dialogue_id"])
        self.assertEqual(quest["steps"][0]["type"], "talk_to_npc")
        self.assertEqual(quest["steps"][0]["position"], 0)

    def test_line_live_sql_replaces_rewards_and_guards_editor_task_choices(self):
        batches = self.importer.line_live_batches(self.bundle, "abc_valley")
        rewards = batches["07_prerequisites_rewards.sql"]
        # Rewards and prerequisites are deleted before they are inserted, so a re-run cannot double XP.
        self.assertLess(rewards.index("delete from public.quest_rewards"), rewards.index("insert into public.quest_rewards"))
        self.assertLess(rewards.index("delete from public.quest_prerequisites"), rewards.index("insert into public.quest_prerequisites"))
        self.assertTrue(batches["06_steps.sql"].startswith("do $guard$"))
        self.assertNotIn("$guard$", self.importer.line_live_batches(self.bundle, "abc_valley", force=True)["06_steps.sql"])
        # Only this line's rows are touched.
        for name in ("05_quests.sql", "06_steps.sql", "07_prerequisites_rewards.sql"):
            self.assertNotIn("questlines where key = 'articles_a_an", batches[name])
        self.assertEqual(batches, self.importer.line_live_batches(self.bundle, "abc_valley"))

    def test_custom_step_type_is_registered_with_a_migration(self):
        self.assertIn("custom", {definition["id"] for definition in self.bundle["step_type_definitions"]})
        migrations = "".join(
            path.read_text(encoding="utf-8") for path in (ROOT / "supabase" / "migrations").glob("*.sql")
        )
        self.assertIn("values ('custom', 'Custom'", migrations)


if __name__ == "__main__":
    unittest.main()
