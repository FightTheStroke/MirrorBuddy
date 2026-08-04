"""The barge-in threshold follows the room, so a quiet child is still heard.

A fixed 0.045 RMS is roughly eleven times the measured noise floor of Mario's room
(0.004). A child who does not project never crosses it, so "zitto" went unheard
exactly when it mattered most. The threshold now tracks the room's noise floor.
"""

from __future__ import annotations

import numpy as np
import pytest

from reachy_mini_mirrorbuddy import barge_detector
from reachy_mini_mirrorbuddy.barge_detector import BargeDetector
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
    io.barge.noise_floor = 0.004

    assert io.barge_threshold() == 0.004 * barge_detector._BARGE_NOISE_RATIO
    assert io.barge_threshold() < 0.045


def test_noisy_room_raises_the_threshold_with_the_floor():
    io = _io()
    io.barge.noise_floor = 0.008

    assert io.barge_threshold() == 0.008 * barge_detector._BARGE_NOISE_RATIO


def test_never_exceeds_the_configured_ceiling():
    io = _io(threshold=0.045)
    io.barge.noise_floor = 0.5  # a very loud room

    assert io.barge_threshold() == 0.045


def test_silent_room_cannot_arm_on_nothing():
    io = _io()
    io.barge.noise_floor = 0.0

    assert io.barge_threshold() == barge_detector._BARGE_MIN_RMS


def test_a_soft_voice_now_crosses_the_threshold():
    """A 0.02 RMS utterance — inaudible to the old fixed threshold — cuts in."""
    io = _io()
    io.barge.noise_floor = 0.004
    soft_voice_rms = 0.02

    assert soft_voice_rms >= io.barge_threshold()
    assert soft_voice_rms < 0.045  # would have been ignored before


def test_floor_tracks_measured_frames():
    io = _io()
    io.barge.noise_floor = 0.05
    quiet = np.zeros(512, dtype=np.int16)

    for _ in range(200):
        rms = float(np.sqrt(np.mean((quiet.astype(np.float32) / 32768.0) ** 2)))
        io.barge.noise_floor = (
            1 - barge_detector._NOISE_EMA_ALPHA
        ) * io.barge.noise_floor + barge_detector._NOISE_EMA_ALPHA * rms

    assert io.barge.noise_floor < 0.001


class TestMicFrameDecision:
    """The mic loop's decision, isolated from hardware."""

    def test_a_soft_voice_cuts_in_after_the_debounce(self):
        io = _io()
        io.barge.noise_floor = 0.004

        assert io.note_mic_frame(0.02, speaking=True) is False  # 1st loud frame
        assert io.note_mic_frame(0.02, speaking=True) is False  # 2nd
        assert io.note_mic_frame(0.02, speaking=True) is True  # 3rd → cut

    def test_an_isolated_bump_does_not_take_the_turn_away(self):
        io = _io()
        io.barge.noise_floor = 0.004

        io.note_mic_frame(0.02, speaking=True)
        io.note_mic_frame(0.001, speaking=True)  # back to quiet: debounce resets
        assert io.note_mic_frame(0.02, speaking=True) is False

    def test_nothing_fires_while_buddy_is_silent(self):
        io = _io()

        for _ in range(10):
            assert io.note_mic_frame(0.5, speaking=False) is False

    def test_buddys_own_echo_never_teaches_the_floor(self):
        io = _io()
        io.barge.noise_floor = 0.004

        for _ in range(50):
            io.note_mic_frame(0.4, speaking=True)  # loud echo while he speaks

        assert io.barge.noise_floor == 0.004

    def test_the_room_teaches_the_floor_while_he_is_silent(self):
        io = _io()
        io.barge.noise_floor = 0.004

        for _ in range(200):
            io.note_mic_frame(0.02, speaking=False)

        assert io.barge.noise_floor > 0.015


def test_defaults_do_not_crash_when_no_thresholds_are_passed():
    """The parameters shadow the audio_dsp helpers; the fallback must still work."""
    io = AudioIO(robot=object(), on_input_pcm16=lambda _b: None)

    assert io.barge.ceiling > 0
    assert io.barge.sustain_frames >= 1


class TestOutputGainScaling:
    """The make-up gain on Buddy's voice moves the ceiling with it.

    A louder speaker leaks more into the mic, so the ceiling has to rise or Buddy
    cuts himself off. The consequence is easy to miss: at the production gain of
    3.2 the effective ceiling is double the configured 0.045, so anything that
    reasons about the threshold (the calibration tool above all) has to build the
    detector with the real gain or it reports a number the robot never uses.
    """

    def test_production_gain_doubles_the_ceiling(self):
        detector = BargeDetector(rms_threshold=0.045, sustain_frames=3, output_gain=3.2)

        assert detector.ceiling == pytest.approx(0.09)

    def test_gain_below_the_reference_does_not_lower_the_ceiling(self):
        """Quiet playback leaks less, but the configured value stays an upper bound."""
        detector = BargeDetector(rms_threshold=0.045, sustain_frames=3, output_gain=0.5)

        assert detector.ceiling == pytest.approx(0.045)

    def test_a_suggested_setting_becomes_the_intended_threshold(self):
        """What the tool prints must survive the scaling it will be put through."""
        wanted = 0.06
        setting = wanted / BargeDetector.scale_for_gain(3.2)

        detector = BargeDetector(
            rms_threshold=setting, sustain_frames=3, output_gain=3.2
        )
        detector.noise_floor = 0.5  # loud room, so the ceiling is what applies

        assert detector.threshold() == pytest.approx(wanted)


def test_cutting_playback_forgets_the_streak():
    """After an interrupt the next word starts from zero, not mid-debounce."""
    detector = BargeDetector(rms_threshold=0.045, sustain_frames=3, output_gain=1.0)
    detector.noise_floor = 0.004
    assert detector.note_frame(0.02, speaking=True) is False
    assert detector.note_frame(0.02, speaking=True) is False

    detector.reset()

    assert detector.note_frame(0.02, speaking=True) is False
