"""Pure-Python port of the web voice transcript safety contract.

Always enabled, matching the web default; no feature-flag disable path. User
checks include single-turn jailbreak detection, never multi-turn history.
Assistant ``sanitize`` means log but allow, not text rewriting. Preserve web
ordering and known substring false positives rather than inventing new policy.
Runtime depends only on the standard library; generated constants ship in-package.
"""

from collections.abc import Iterable
from dataclasses import dataclass
import logging
from time import perf_counter

from . import transcript_safety_patterns as patterns
from .transcript_safety_jailbreak import jailbreak_score
from .transcript_safety_redirects import REDIRECTS
from .transcript_safety_regex import JS_SPACE, compile_js, js_string

logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class TranscriptSafetyResult:
    severity: str
    flagged_patterns: tuple[str, ...]
    action_taken: str
    check_duration_ms: float


_CRISIS = tuple(compile_js(*spec) for spec in patterns.CRISIS_PATTERNS)
_PII = tuple(compile_js(*spec) for spec in patterns.PII_PATTERNS)
_FILTERS = tuple(
    (tuple(compile_js(*spec) for spec in specs), severity, action, category)
    for specs, severity, action, category in (
        (patterns.VIOLENCE_PATTERNS, "high", "block", "violence"),
        (patterns.HACKING_PATTERNS, "high", "block", "violence"),
        (patterns.JAILBREAK_PATTERNS, "high", "redirect", "jailbreak"),
        (patterns.EXPLICIT_PATTERNS, "high", "block", "explicit"),
        (patterns.PROFANITY_IT, "medium", "warn", "profanity"),
        (patterns.PROFANITY_EN, "medium", "warn", "profanity"),
    )
)
_RANK = {"none": 0, "low": 1, "medium": 2, "high": 3, "critical": 4}


def _filter_input(text: str) -> tuple[str, str, tuple[str, ...]]:
    lower = js_string(text.lower())
    normalized = lower.strip(JS_SPACE)
    if not normalized:
        return "none", "allow", ()
    if next((True for pattern in _CRISIS if pattern.search(lower)), False):
        return "critical", "redirect", ("crisis",)
    for expressions, severity, action, category in _FILTERS:
        if next((True for pattern in expressions if pattern.search(normalized)), False):
            return severity, action, (category,)
    if next((True for word in patterns.SEVERE if word in normalized), False):
        return "high", "block", ("violence",)
    original = js_string(text)
    if next((True for pattern in _PII if pattern.search(original)), False):
        return "medium", "block", ("pii",)
    return "none", "allow", ()


def _result(start: float, severity: str, flagged: tuple[str, ...], action: str,
            assistant: bool) -> TranscriptSafetyResult:
    result = TranscriptSafetyResult(severity, flagged, action, (perf_counter() - start) * 1000)
    if action != "allow":
        logger.info(
            "Safety filter applied to %s transcript", "assistant" if assistant else "user",
            extra={
                "component": "voice-transcript-safety",
                "eventId": "VCE-003" if assistant else "VCE-002",
                "eventName": "Transcript Safety Check (Output)" if assistant
                else "Transcript Safety Check (Input)",
                "detectedSeverity": result.severity,
                "flaggedPatterns": result.flagged_patterns,
                "actionTaken": result.action_taken,
                "checkDurationMs": result.check_duration_ms,
            },
        )
    return result


def check_user_transcript(text: str | None) -> TranscriptSafetyResult:
    """Check user input, elevating only high/critical advanced jailbreak scores."""
    start = perf_counter()
    text = text or ""
    severity, action, flagged = _filter_input(text)
    action = "escalate" if action == "redirect" else action
    if text.strip(JS_SPACE):
        score = jailbreak_score(text)
        if score >= 0.7:
            if "jailbreak" not in flagged:
                flagged += ("jailbreak",)
            elevated = "escalate" if score >= 0.9 else "block"
            if action != "escalate":
                action = elevated
            threat = "critical" if score >= 0.9 else "high"
            if _RANK[threat] > _RANK[severity]:
                severity = threat
    return _result(start, severity, flagged, action, False)


def check_assistant_transcript(text: str | None) -> TranscriptSafetyResult:
    """Check assistant output with web allow/sanitize/reject action taxonomy."""
    start = perf_counter()
    severity, action, flagged = _filter_input(text or "")
    mapped = {"allow": "allow", "warn": "sanitize", "block": "reject", "redirect": "reject"}
    return _result(start, severity, flagged, mapped[action], True)


def get_redirect_message(flagged_patterns: Iterable[str] | None) -> str:
    """Return the exact Italian web redirect, including its priority order."""
    flagged = tuple(flagged_patterns or ())
    for category in ("violence", "crisis", "explicit", "bias", "jailbreak", "profanity"):
        if category in flagged or (category == "explicit" and "age_inappropriate" in flagged):
            return REDIRECTS[category]
    return REDIRECTS["default"]
