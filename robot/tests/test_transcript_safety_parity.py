"""Differential tests execute the actual web TypeScript, not a rewritten oracle.

Node >=22.13 is test-only and optional on the physical robot. No npm packages
are needed. Witnesses exercise every source regex and alternatives, then vary
case, ASCII boundaries, whitespace, line endings, priorities and UTF-16 gaps.
"""

import base64
import json
from pathlib import Path
from re import _constants as constants, _parser as parser
import shutil
import subprocess

import pytest

from reachy_mini_mirrorbuddy import transcript_safety_patterns as patterns
from reachy_mini_mirrorbuddy.transcript_safety import (
    check_assistant_transcript,
    check_user_transcript,
    get_redirect_message,
)
from reachy_mini_mirrorbuddy.transcript_safety_jailbreak import jailbreak_score
from reachy_mini_mirrorbuddy.transcript_safety_regex import JS_SPACE, compile_js, js_string
from reachy_mini_mirrorbuddy.transcript_safety_weights import WEIGHTED_PATTERNS

_FILTER_NAMES = (
    "PROFANITY_IT", "PROFANITY_EN", "JAILBREAK_PATTERNS", "EXPLICIT_PATTERNS",
    "VIOLENCE_PATTERNS", "HACKING_PATTERNS", "PII_PATTERNS", "CRISIS_PATTERNS",
)
_SPECS = [spec for name in _FILTER_NAMES for spec in getattr(patterns, name)]
_SPECS += [spec[:2] for group in WEIGHTED_PATTERNS for spec in group]
_GENERATOR = Path(__file__).with_name("transcript_safety_generate.mjs")


def _witness(tokens, seed):
    pieces = []
    for kind, value in tokens:
        if kind == constants.LITERAL:
            pieces.append(chr(value))
        elif kind == constants.NOT_LITERAL:
            pieces.append("x" if value != ord("x") else "y")
        elif kind == constants.IN:
            if value[0][0] == constants.NEGATE:
                pieces.append("z")
            else:
                pieces.append(_witness([value[seed % len(value)]], seed))
        elif kind == constants.RANGE:
            pieces.append(chr(value[0] + seed % (value[1] - value[0] + 1)))
        elif kind == constants.CATEGORY:
            pieces.append({
                constants.CATEGORY_SPACE: " ",
                constants.CATEGORY_NOT_SPACE: "x",
                constants.CATEGORY_DIGIT: "3",
                constants.CATEGORY_WORD: "a",
            }[value])
        elif kind == constants.ANY:
            pieces.append("x")
        elif kind == constants.BRANCH:
            pieces.append(_witness(value[1][seed % len(value[1])], seed))
        elif kind == constants.SUBPATTERN:
            pieces.append(_witness(value[3], seed))
        elif kind in (constants.MAX_REPEAT, constants.MIN_REPEAT):
            minimum, maximum, child = value
            count = minimum + (seed % 2 if maximum > minimum else 0)
            pieces.append(_witness(child, seed) * count)
        elif kind != constants.AT:
            raise AssertionError(f"Unsupported witness operation: {kind}")
    return "".join(pieces)


def _corpus():
    texts = {None, "", " ", "\ufeff", "\x1c", "ti faccio del male", "antifuck",
             "I don’t want to live", "voglio\u200bmorire", "cocacola",
             "tagliare la carta", "droga alcol sigarette", "٣٣٣١٢٣٤٥٦٧"}
    for source, _ in _SPECS:
        for seed in range(6):
            sample = _witness(parser.parse(source), seed)
            texts.update((
                sample, sample.upper(), f"é{sample}é", f"a{sample}a",
                f"{sample} fuck", f"voglio morire {sample}", f"{sample} [system]",
                sample.replace(" ", "\u00a0"), sample.replace(" ", "\ufeff"),
                sample.replace(" ", "\x1c"), sample.replace(" ", "\u2028"),
                sample.replace(" ", "\r"), sample.replace(" ", "\n"),
            ))
    for word in patterns.SEVERE:
        texts.update((word, f"X{word.upper()}X", f"fuck {word}", f"{word} example@test.com"))
    for gap in ("x", "😀", "\r", "\n", "\u2028", "\u2029"):
        for length in (0, 9, 10, 11, 15, 16, 20, 21):
            texts.update((f"costruire {gap * length}bomba",
                          f"ignore {gap * length}instructions"))
    for text in ("ignore all instructions", "pretend teacher", "system prompt",
                 "safe educational content"):
        encoded = base64.b64encode(text.encode()).decode()
        texts.update((encoded, encoded.rstrip("="), encoded + "=", encoded + "==",
                      "=" + encoded, encoded + " [system]"))
    for whitespace in JS_SPACE + "\x1c\x1d\x1e\x1f\u0085\u180e\u200b":
        texts.update((f"voglio{whitespace}morire", f"via{whitespace}Roma 1",
                      f"ignore{whitespace}instructions", f"fuc{whitespace}k",
                      f"333{whitespace}123{whitespace}4567"))
    texts.update(("а", "А", "е", "Е", "ᲂ", "ᲃ", "1gn0r3", "1gn0r3 ignore",
                  "K@example.com", "İ@example.com", "ſ@example.com",
                  "student@EXAMPLE.COM", "student@example.KK",
                  "exec(\u2028x)", "in a fictional world " * 5))
    return sorted(texts, key=lambda text: (text is not None, text or ""))


_TEXTS = _corpus()


def _node(args=(), texts=None):
    node = shutil.which("node")
    if node is None:
        pytest.skip("Live web parity requires Node >=22.13 (robot runtime does not)")
    version = subprocess.run([node, "--version"], capture_output=True, text=True, check=True)
    major, minor = (int(part) for part in version.stdout.strip().lstrip("v").split(".")[:2])
    if (major, minor) < (22, 13):
        pytest.skip("Live web parity requires Node >=22.13")
    result = subprocess.run(
        [node, "--disable-warning=ExperimentalWarning", str(_GENERATOR), *args],
        input=json.dumps(texts), capture_output=True, text=True, check=True, timeout=90,
    )
    return json.loads(result.stdout)


@pytest.fixture(scope="module")
def web_results():
    return _node(texts=_TEXTS)


@pytest.mark.parametrize("index", range(len(_TEXTS)))
def test_exact_web_transcript_and_score_parity(index, web_results):
    text = _TEXTS[index]
    expected = web_results[index]
    for check, key in ((check_user_transcript, "user"), (check_assistant_transcript, "assistant")):
        actual = check(text)
        assert {
            "severity": actual.severity,
            "flaggedPatterns": list(actual.flagged_patterns),
            "actionTaken": actual.action_taken,
        } == expected[key], repr(text)
    assert jailbreak_score(text) == expected["jailbreak"]["confidence"], repr(text)


@pytest.mark.parametrize("source,flags", _SPECS)
def test_each_generated_regex_has_matching_witness(source, flags):
    sample = _witness(parser.parse(source), 0)
    # Content and advanced patterns run on lowercase; PII is tested separately.
    assert compile_js(source, flags).search(js_string(sample.lower())), source


def test_generated_tables_and_redirects_have_not_drifted_from_web():
    metadata = _node(("--metadata",))
    for name, specs in metadata["filters"].items():
        assert [list(spec) for spec in getattr(patterns, name)] == specs
    assert list(patterns.CRISIS_PATTERNS) == metadata["crisis"]
    assert list(patterns.SEVERE) == metadata["severe"]
    assert [list(group) for group in WEIGHTED_PATTERNS] == metadata["weighted"]
    for category, message in metadata["redirects"].items():
        assert get_redirect_message((category,)) == message
