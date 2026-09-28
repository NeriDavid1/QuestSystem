import importlib.util
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def module(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / "scripts" / f"{name}.py")
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


class LetterDrawingContractTests(unittest.TestCase):
    def test_selected_symbols_are_recognized_as_letter_drawing(self):
        seed = module("import_yaml_to_supabase")
        self.assertEqual(seed.infer_minigame_id({"symbols": ["A", "b"]}), "letter_drawing")
        self.assertEqual(seed.infer_minigame_id({"drawingInputMode": "Word", "word": "Apple"}), "letter_drawing")
        entry = next(e for e in seed.catalog_bundle()[0] if e["kind"] == "minigame" and e["external_id"] == "letter_drawing")
        self.assertEqual(entry["metadata"]["content_fields"], ["drawingInputMode", "word", "symbols"])
        self.assertEqual(entry["metadata"]["unity_config"], "LetterTracingQuestConfigSO")
        self.assertEqual(entry["image_path"], "images/minigames/letter_drawing.png")

    def test_unity_lesson_export_preserves_case_order_and_repeated_references(self):
        exporter = module("unity_to_yaml")
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            index = {}
            for key, letter in [("upper", "A"), ("lower", "b")]:
                path = root / f"{key}.asset"
                path.write_text(f"MonoBehaviour:\n  symbol: {ord(letter)}\n", encoding="utf-8")
                index[key] = path
            params = exporter.extract_params("letter_drawing", {"symbols": [
                {"guid": "upper"}, {"guid": "lower"}, {"guid": "upper"}]}, index, root, {"letter_drawing": ["symbols"]})
            self.assertEqual(params, {"symbols": ["A", "b", "A"]})
            self.assertEqual(exporter.minigame_type_for_config({"m_EditorClassIdentifier": "LetterTracingQuestConfigSO"}), "letter_drawing")

    def test_single_symbol_playtest_export_stays_one_lowercase_letter(self):
        exporter = module("unity_to_yaml")
        self.assertEqual(exporter.extract_params("letter_drawing", {"symbol": ord("b")}, {}, ROOT, {}), {"symbols": ["b"]})
