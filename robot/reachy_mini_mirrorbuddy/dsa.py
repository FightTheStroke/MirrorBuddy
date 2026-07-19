"""DSA / accessibility tuning for the realtime turn-detection (VAD).

Mirrors MirrorBuddy's adaptive-VAD idea: different learners need the robot to wait
differently before it decides the child has finished speaking. Students with slower
or less regular speech (motor / cerebral palsy, dyslexia) need a longer silence
window so the robot does not interrupt them.

These values feed the Azure OpenAI Realtime ``turn_detection`` (server VAD) config.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class VadProfile:
    """server_vad parameters for a given accessibility profile."""

    threshold: float
    prefix_padding_ms: int
    silence_duration_ms: int
    # Azure noise reduction: "near_field" | "far_field" | None
    noise_reduction: str | None = "near_field"


# Snappier turn-taking (Roberto: "più veloce, in tempo reale") while still giving
# slower/less-regular speakers enough room not to be cut off. Silence windows are
# roughly half the earlier, very-patient values.
_PROFILES: dict[str, VadProfile] = {
    "default": VadProfile(0.5, 200, 450),
    "dyslexia": VadProfile(0.45, 250, 650),
    "adhd": VadProfile(0.55, 150, 400),
    "autism": VadProfile(0.5, 250, 700),
    "motor": VadProfile(0.4, 300, 800),
    "cerebral": VadProfile(0.4, 300, 800),
    "visual": VadProfile(0.5, 200, 550),
    "auditory": VadProfile(0.5, 200, 550),
}


def get_vad_profile(name: str | None) -> VadProfile:
    """Return the VAD profile for ``name`` (falls back to a patient default)."""
    if not name:
        return _PROFILES["default"]
    return _PROFILES.get(name.strip().lower(), _PROFILES["default"])


def turn_detection_config(name: str | None) -> dict:
    """Build the realtime ``turn_detection`` object for the given profile."""
    p = get_vad_profile(name)
    return {
        "type": "server_vad",
        "threshold": p.threshold,
        "prefix_padding_ms": p.prefix_padding_ms,
        "silence_duration_ms": p.silence_duration_ms,
        "create_response": True,
        "interrupt_response": True,
    }
