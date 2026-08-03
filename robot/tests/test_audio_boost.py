"""Loudness behaviour: Buddy has to be clearly audible without turning harsh."""

from __future__ import annotations

import numpy as np

from reachy_mini_mirrorbuddy.audio_dsp import boost as _boost


def test_boost_makes_speech_louder() -> None:
    speech = np.full(100, 0.1, dtype=np.float32)
    assert float(np.abs(_boost(speech, 3.2)).mean()) > float(np.abs(speech).mean())


def test_boost_never_clips() -> None:
    """Peaks must be compressed, not slammed against the rail (that's what rasps)."""
    loud = np.array([-1.0, -0.9, 0.0, 0.9, 1.0], dtype=np.float32)
    out = _boost(loud, 8.0)
    assert np.all(np.abs(out) < 1.0)


def test_boost_is_monotonic() -> None:
    """A louder input still comes out louder: the voice keeps its dynamics."""
    quiet = _boost(np.array([0.05], dtype=np.float32), 3.2)[0]
    loud = _boost(np.array([0.25], dtype=np.float32), 3.2)[0]
    assert loud > quiet


def test_boost_returns_float32() -> None:
    out = _boost(np.array([0.1, 0.2], dtype=np.float32), 2.0)
    assert out.dtype == np.float32
