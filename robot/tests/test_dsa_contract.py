"""Profile identity matches the web; robot VAD timings intentionally do not."""

from __future__ import annotations

import re
from pathlib import Path

import pytest

from reachy_mini_mirrorbuddy.dsa import _PROFILES, get_vad_profile, turn_detection_config
from reachy_mini_mirrorbuddy.prompt_builder import _dsa_note, build_instructions
from reachy_mini_mirrorbuddy.mirrorbuddy_client import Maestro

_ROOT = Path(__file__).resolve().parents[2]
_WEB = _ROOT / "apps/web/src/lib"


def _web_profiles() -> set[str]:
    source = (_WEB / "accessibility/accessibility-store.ts").read_text()
    declaration = source.split("export type A11yProfileId =", 1)[1].split(";", 1)[0]
    return set(re.findall(r'"([a-z]+)"', declaration))


def test_robot_profiles_match_all_canonical_web_conditions():
    canonical = _web_profiles()
    assert len(canonical) == 7
    assert set(_PROFILES) == canonical | {"default"}
    source = (_WEB / "hooks/voice-session/adaptive-vad.ts").read_text()
    declaration = source.split("export const VAD_PROFILES:", 1)[1].split("\n};", 1)[0]
    assert set(re.findall(r"^  ([a-z]+): \{", declaration, re.MULTILINE)) == canonical
    for profile in canonical:
        assert _dsa_note(profile), profile
        assert get_vad_profile(f" {profile.upper()} ") == _PROFILES[profile]
        assert _dsa_note(f" {profile.upper()} ") == _dsa_note(profile)


@pytest.mark.parametrize("profile", [None, "", "  ", "unknown", 42, True, [], {}])
def test_absent_unknown_and_malformed_profiles_fall_back_without_diagnosis(profile):
    assert get_vad_profile(profile) == _PROFILES["default"]
    assert _dsa_note(profile) == ""
    maestro = Maestro.from_json({"id": "buddy", "name": "Buddy"})
    assert build_instructions(maestro, dsa_profile=profile)


def test_dyscalculia_is_a_teaching_note_not_an_eighth_vad_condition_or_alias():
    assert "discalculia" in _dsa_note("dyscalculia")
    assert "dyscalculia" not in _web_profiles()
    assert get_vad_profile("dyscalculia") == _PROFILES["default"]
    assert get_vad_profile("cerebral-palsy") == _PROFILES["default"]
    assert _dsa_note("cerebral-palsy") == ""


@pytest.mark.parametrize(
    ("profile", "threshold", "prefix", "silence"),
    [
        ("default", 0.5, 200, 450),
        ("dyslexia", 0.45, 250, 650),
        ("adhd", 0.55, 150, 400),
        ("autism", 0.5, 250, 700),
        ("motor", 0.4, 300, 800),
        ("cerebral", 0.4, 300, 800),
        ("visual", 0.5, 200, 550),
        ("auditory", 0.5, 200, 550),
    ],
)
def test_owner_requested_robot_timings_are_preserved(profile, threshold, prefix, silence):
    assert turn_detection_config(profile) == {
        "type": "server_vad",
        "threshold": threshold,
        "prefix_padding_ms": prefix,
        "silence_duration_ms": silence,
        "create_response": False,
        "interrupt_response": True,
    }
    assert get_vad_profile(profile).noise_reduction == "near_field"
