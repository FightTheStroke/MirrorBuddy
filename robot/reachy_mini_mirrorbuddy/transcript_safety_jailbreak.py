"""Exact single-turn web jailbreak weighting; no conversation state is retained."""

import base64
import binascii

from .transcript_safety_regex import compile_js, js_string
from .transcript_safety_weights import WEIGHTED_PATTERNS

_WEIGHTED = tuple(
    tuple((compile_js(source, flags), weight) for source, flags, weight in group)
    for group in WEIGHTED_PATTERNS
)
_BASE64 = compile_js(r"[A-Za-z0-9+/=]{20,}", "g")
_BASE64_ALPHABET = compile_js(r"^[A-Za-z0-9+/]*$")
_DECODED = compile_js(r"ignore|pretend|jailbreak|system\s*prompt", "i")
_LEET_SUSPICIOUS = compile_js(r"ignor[ea]|pretend|jailbreak|system\s*prompt", "i")
_LEET = str.maketrans("134057@", "ieaosta")
_HOMOGRAPHS = frozenset("АЕОРСУХ")


def _atob(value: str) -> str | None:
    """WHATWG forgiving-base64 decode, matching browser atob (Latin-1 bytes)."""
    if len(value) % 4 == 0:
        if value.endswith("=="):
            value = value[:-2]
        elif value.endswith("="):
            value = value[:-1]
    if len(value) % 4 == 1 or _BASE64_ALPHABET.fullmatch(value) is None:
        return None
    try:
        return base64.b64decode(value + "=" * (-len(value) % 4), validate=True).decode("latin1")
    except (ValueError, binascii.Error):
        return None


def _encoding_detected(text: str) -> bool:
    for match in _BASE64.finditer(text):
        decoded = _atob(match.group())
        if decoded is not None and _DECODED.search(decoded):
            return True
    leetspeak = text.translate(_LEET)
    if leetspeak != text and _LEET_SUSPICIOUS.search(leetspeak):
        if not _LEET_SUSPICIOUS.search(text):
            return True
    # Non-/u ECMAScript /i canonicalizes to uppercase, including ᲂ/ᲃ.
    return not text.isascii() and next(
        (True for char in text if char.upper() in _HOMOGRAPHS), False,
    )


def jailbreak_score(text: str | None) -> float:
    """Return the capped score; each pattern contributes once per transcript."""
    text = text or ""
    score = 0.8 if _encoding_detected(js_string(text)) else 0.0
    normalized = js_string(text.lower())
    for group in _WEIGHTED:
        category_score = 0.0
        for pattern, weight in group:
            if pattern.search(normalized):
                category_score += weight
        score += min(category_score, 1.0)
    return min(score, 1.0)
