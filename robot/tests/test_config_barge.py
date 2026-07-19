"""Tests for the field-tunable local barge-in thresholds in Config.

These are surfaced as robot configuration (settings UI + instance ``.env``) so the
"basta" sensitivity can be adjusted per environment without a redeploy. They must be
read *after* the instance ``.env`` loads, so we validate defaults, overrides, the
minimum-frame clamp, and graceful fallback on invalid input.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from reachy_mini_mirrorbuddy.config import Config  # noqa: E402

_BARGE_ENV = ("MIRRORBUDDY_BARGE_RMS", "MIRRORBUDDY_BARGE_FRAMES")


def _clear(monkeypatch) -> None:
    for k in _BARGE_ENV:
        monkeypatch.delenv(k, raising=False)


class TestBargeConfig:
    def test_defaults(self, monkeypatch):
        _clear(monkeypatch)
        c = Config()
        assert c.BARGE_RMS_THRESHOLD == 0.045
        assert c.BARGE_SUSTAIN_FRAMES == 3

    def test_env_overrides(self, monkeypatch):
        _clear(monkeypatch)
        monkeypatch.setenv("MIRRORBUDDY_BARGE_RMS", "0.03")
        monkeypatch.setenv("MIRRORBUDDY_BARGE_FRAMES", "5")
        c = Config()
        assert c.BARGE_RMS_THRESHOLD == 0.03
        assert c.BARGE_SUSTAIN_FRAMES == 5

    def test_frames_clamped_to_minimum(self, monkeypatch):
        _clear(monkeypatch)
        monkeypatch.setenv("MIRRORBUDDY_BARGE_FRAMES", "0")
        c = Config()
        assert c.BARGE_SUSTAIN_FRAMES == 1

    def test_invalid_values_fall_back_to_defaults(self, monkeypatch):
        _clear(monkeypatch)
        monkeypatch.setenv("MIRRORBUDDY_BARGE_RMS", "not-a-number")
        monkeypatch.setenv("MIRRORBUDDY_BARGE_FRAMES", "abc")
        c = Config()
        assert c.BARGE_RMS_THRESHOLD == 0.045
        assert c.BARGE_SUSTAIN_FRAMES == 3
