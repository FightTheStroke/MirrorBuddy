"""Tests for the device-pairing profile mapping (pure logic, no network)."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from reachy_mini_mirrorbuddy.device import (  # noqa: E402
    DeviceProfile,
    _dsa_from_accessibility,
    apply_device_profile,
)


class _FakeConfig:
    STUDENT_NAME = None
    LOCALE = "it"
    DSA_PROFILE = "cerebral"
    CALM_MOVEMENT = False


def test_from_json_parses_fields():
    p = DeviceProfile.from_json(
        {
            "name": "Mario",
            "preferredBuddy": "sofia",
            "language": "en",
            "subjects": ["math", "history"],
            "accessibility": {"adhdMode": True},
        }
    )
    assert p.name == "Mario"
    assert p.preferred_buddy == "sofia"
    assert p.language == "en"
    assert p.subjects == ["math", "history"]
    assert p.accessibility == {"adhdMode": True}


def test_from_json_defaults_are_safe():
    p = DeviceProfile.from_json({})
    assert p.name is None
    assert p.language == "it"
    assert p.subjects == []
    assert p.accessibility == {}


def test_dsa_mapping_priority():
    assert _dsa_from_accessibility({"adhdMode": True, "dyslexiaFont": True}) == "adhd"
    assert _dsa_from_accessibility({"dyslexiaFont": True}) == "dyslexia"
    assert _dsa_from_accessibility({}) is None


def test_apply_overlays_profile_on_config():
    cfg = _FakeConfig()
    apply_device_profile(
        cfg,
        DeviceProfile(name="Noemi", language="fr", accessibility={"dyslexiaFont": True, "reducedMotion": True}),
    )
    assert cfg.STUDENT_NAME == "Noemi"
    assert cfg.LOCALE == "fr"
    assert cfg.DSA_PROFILE == "dyslexia"
    assert cfg.CALM_MOVEMENT is True


def test_apply_keeps_config_when_profile_empty():
    cfg = _FakeConfig()
    cfg.STUDENT_NAME = "Existing"
    apply_device_profile(cfg, DeviceProfile())
    assert cfg.STUDENT_NAME == "Existing"
    assert cfg.DSA_PROFILE == "cerebral"
