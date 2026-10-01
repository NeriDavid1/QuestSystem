import importlib.util
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
spec = importlib.util.spec_from_file_location("voice_whisper_check", ROOT / "scripts" / "voice_whisper_check.py")
check = importlib.util.module_from_spec(spec)
sys.modules["voice_whisper_check"] = check
spec.loader.exec_module(check)

LINE = "אתם יכולים לעזור לי למצוא a fish או an octopus?"


class WhisperCompareTests(unittest.TestCase):
    def test_matching_take_is_ok_even_when_english_is_written_in_hebrew_letters(self):
        self.assertEqual(check.compare(LINE, "אתם יכולים לעזור לי למצוא פיש או אן אוקטופוס", 3.5).level, "ok")
        self.assertEqual(check.compare(LINE, "אתם יכולים לעזור לי למצוא a fish או an octopus", 3.5).level, "ok")

    def test_spelling_and_niqqud_differences_are_not_errors(self):
        result = check.compare("אוקיי, לא ציפיתי שתעברו את המבחן הזה!", "אוקי לא ציפיתי שתעברו את המבחן הזה", 3.0)
        self.assertEqual((result.level, result.flags), ("ok", []))

    def test_wrong_word_is_named(self):
        # The real review note: "להיבחן לא לאבחן".
        result = check.compare("דברו איתי שוב אם תרצו לְהִבָּחֵן על עוד נושאים!", "דברו איתי שוב אם תרצו לאבחן על עוד נושאים", 3.0)
        self.assertEqual(result.level, "check")
        self.assertEqual((result.missing, result.extra), (["להבחן"], ["לאבחן"]))

    def test_missing_speech_and_wrong_text_are_problems(self):
        self.assertEqual(check.compare(LINE, "", None).flags, ["no_speech"])
        self.assertEqual(check.compare(LINE, "שלום עולם מה נשמע", 2.0).level, "problem")

    def test_speaking_rate(self):
        self.assertIn("fast", check.compare("Hello there my friend how are you today", "hello there my friend how are you today", 1.0).flags)
        self.assertIn("slow", check.compare("Hello there my friend how are you today", "hello there my friend how are you today", 9.0).flags)

    def test_audio_tags_are_not_expected_in_speech(self):
        self.assertEqual(check.compare("[excited] שלום לכולם חברים", "שלום לכולם חברים", 1.5).level, "ok")


if __name__ == "__main__":
    unittest.main()
