"""Whisper pre-check for voice-over takes, used by voice_review_sync.py.

Each take is transcribed locally with faster-whisper and compared with the text it was generated from.
The result is a hint for the guide on the Voice Review page, never a decision: a line flagged here still
has to be listened to, and a line marked "ok" can still be wrong (tone, English pronunciation).

    pip install faster-whisper

The first run downloads the model (``--whisper-model``, default ``large-v3-turbo``, about 1.6 GB). A GPU is
used when there is one; on a CPU the turbo model takes roughly a second or two per line.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Callable

NIQQUD_RE = re.compile(r"[֑-ׇ]")
AUDIO_TAG_RE = re.compile(r"\[[^\]]*\]")          # eleven_v3 tags such as [calm] are not spoken
HEBREW_RE = re.compile(r"[א-ת]")
LATIN_RE = re.compile(r"[a-z]")
FINAL_LETTERS = str.maketrans("ךםןףץ", "כמנפצ")
SHOWN_WORD_RE = re.compile(r"[\u05D0-\u05EAA-Za-z0-9]+")

# Tuned to be quiet: a guide who sees a warning on every line stops reading them.
CHECK_BELOW = 0.82       # similarity under this: "check"
PROBLEM_BELOW = 0.6      # similarity under this: "problem"
FAST_WORDS_PER_SECOND = 3.6
SLOW_WORDS_PER_SECOND = 1.2
MIN_WORDS_FOR_RATE = 4


SPELLING_VARIANT = 0.85  # word blocks this similar are spelling differences (כתיב מלא/חסר), not errors
ENGLISH = "\0en"         # stands for an English word inside a Hebrew line


def tokens(text: str) -> list[tuple[str, str]]:
    """(comparison form, shown form) per word: no niqqud, punctuation, audio tags or final-letter forms."""
    text = AUDIO_TAG_RE.sub(" ", text or "")
    text = NIQQUD_RE.sub("", text)
    for mark in ("'", "\u05f3", '"', "\u05f4"):
        text = text.replace(mark, "")
    return [(word.lower().translate(FINAL_LETTERS), word) for word in SHOWN_WORD_RE.findall(text)]


def normalize_words(text: str) -> list[str]:
    return [norm for norm, _ in tokens(text)]


@dataclass
class CheckResult:
    text: str
    score: float
    level: str                       # ok | check | problem
    flags: list[str] = field(default_factory=list)
    missing: list[str] = field(default_factory=list)
    extra: list[str] = field(default_factory=list)

    def columns(self, take_hash: str) -> dict[str, Any]:
        return {
            "asr_take_hash": take_hash,
            "asr_text": self.text,
            "asr_score": round(self.score, 3),
            "asr_level": self.level,
            "asr_flags": self.flags,
            "asr_missing": self.missing,
            "asr_extra": self.extra,
        }


def _ratio(a: str, b: str) -> float:
    return SequenceMatcher(None, a, b, autojunk=False).ratio() if a or b else 1.0


def compare(expected: str, heard: str, speech_seconds: float | None) -> CheckResult:
    """How well the take matches its script, from the transcript and how long the speech lasted."""
    expected_tokens = tokens(expected)
    heard_tokens = tokens(heard)
    if not heard_tokens:
        return CheckResult(heard.strip(), 0.0, "problem", ["no_speech"])

    # Whisper writes an English word inside a Hebrew line in either script ("fish" or "פיש"). Those words
    # become placeholders, and whatever Whisper heard in their place is not compared: English words are the
    # guide's to judge by ear.
    hebrew_line = any(HEBREW_RE.search(norm) for norm, _ in expected_tokens)
    expected_cmp = [(ENGLISH, shown) if hebrew_line and LATIN_RE.search(norm) else (norm, shown)
                    for norm, shown in expected_tokens]
    a = [norm for norm, _ in expected_cmp]
    b = [ENGLISH if hebrew_line and LATIN_RE.search(norm) else norm for norm, _ in heard_tokens]

    kept_a: list[str] = []
    kept_b: list[str] = []
    missing: list[str] = []
    extra: list[str] = []
    for op, a1, a2, b1, b2 in SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        block_a = [w for w in a[a1:a2] if w != ENGLISH]
        if op == "equal":
            kept_a += block_a
            kept_b += [w for w in b[b1:b2] if w != ENGLISH]
            continue
        if not block_a and a2 > a1:
            continue  # only English words on the script side: skip what was heard there
        kept_a += block_a
        block_b = [w for w in b[b1:b2] if w != ENGLISH]
        kept_b += block_b
        if _ratio("".join(block_a), "".join(block_b)) >= SPELLING_VARIANT:
            continue
        missing += [shown for norm, shown in expected_cmp[a1:a2] if norm != ENGLISH]
        extra += [shown for (_, shown), norm in zip(heard_tokens[b1:b2], b[b1:b2]) if norm != ENGLISH]

    score = _ratio("".join(kept_a), "".join(kept_b))
    flags: list[str] = []
    if score < CHECK_BELOW:
        flags.append("mismatch")
    if missing or extra:
        flags.append("words")

    if speech_seconds and speech_seconds > 0 and len(expected_tokens) >= MIN_WORDS_FOR_RATE:
        rate = len(expected_tokens) / speech_seconds
        if rate > FAST_WORDS_PER_SECOND:
            flags.append("fast")
        elif rate < SLOW_WORDS_PER_SECOND:
            flags.append("slow")

    level = "problem" if score < PROBLEM_BELOW else "check" if flags else "ok"
    return CheckResult(heard.strip(), score, level, flags, missing[:12], extra[:12])


Transcriber = Callable[[Path], "tuple[str, float | None]"]


def load_transcriber(model_name: str, language: str = "he") -> Transcriber | None:
    """faster-whisper, or None when it is not installed."""
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        return None

    model = WhisperModel(model_name, device="auto", compute_type="default")

    def transcribe(path: Path) -> "tuple[str, float | None]":
        # No initial prompt: giving Whisper the script would make it hear the script.
        segments, _ = model.transcribe(str(path), language=language, beam_size=5, vad_filter=True,
                                       condition_on_previous_text=False)
        segments = list(segments)
        text = " ".join(s.text.strip() for s in segments)
        speech = sum(max(0.0, s.end - s.start) for s in segments) or None
        return text, speech

    return transcribe


def check_take(transcribe: Transcriber, clip: Path, expected: str) -> CheckResult:
    heard, speech_seconds = transcribe(clip)
    return compare(expected, heard, speech_seconds)
