"""The barge-in threshold follows the room, so a quiet child is still heard.

A fixed 0.045 RMS is roughly eleven times the measured noise floor of Mario's room
(0.004). A child who does not project never crosses it, so "zitto" went unheard
exactly when it mattered most. The threshold now tracks the room's noise floor.
"""

from __future__ import annotations

import numpy as np

from reachy_mini_mirrorbuddy import audio_io
from reachy_mini_mirrorbuddy.audio_io import AudioIO


def _io(threshold=0.045):
    return AudioIO(
        robot=object(),
        on_input_pcm16=lambda _b: None,
        on_local_barge_in=lambda: None,
        barge_rms_threshold=threshold,
        barge_sustain_frames=3,
    )


def test_quiet_room_lowers_the_threshold_far_below_the_configured_one():
    io = _io()
    io._noise_floor = 0.004

    assert io.barge_threshold() == 0.004 * audio_io._BARGE_NOISE_RATIO
    assert io.barge_threshold() < 0.045


def test_noisy_room_raises_the_threshold_with_the_floor():
    io = _io()
    io._noise_floor = 0.008

    assert io.barge_threshold() == 0.008 * audio_io._BARGE_NOISE_RATIO


def test_never_exceeds_the_configured_ceiling():
    io = _io(threshold=0.045)
    io._noise_floor = 0.5  # a very loud room

    assert io.barge_threshold() == 0.045


def test_silent_room_cannot_arm_on_nothing():
    io = _io()
    io._noise_floor = 0.0

    assert io.barge_threshold() == audio_io._BARGE_MIN_RMS


def test_a_soft_voice_now_crosses_the_threshold():
    """A 0.02 RMS utterance — inaudible to the old fixed threshold — cuts in."""
    io = _io()
    io._noise_floor = 0.004
    soft_voice_rms = 0.02

    assert soft_voice_rms >= io.barge_threshold()
    assert soft_voice_rms < 0.045  # would have been ignored before


def test_floor_tracks_measured_frames():
    io = _io()
    io._noise_floor = 0.05
    quiet = np.zeros(512, dtype=np.int16)

    for _ in range(200):
        rms = float(np.sqrt(np.mean((quiet.astype(np.float32) / 32768.0) ** 2)))
        io._noise_floor = (
            1 - audio_io._NOISE_EMA_ALPHA
        ) * io._noise_floor + audio_io._NOISE_EMA_ALPHA * rms

    assert io._noise_floor < 0.001
