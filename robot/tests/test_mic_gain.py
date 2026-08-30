"""The robot has to be *heard*, not just heard from.

Measured on the device (2026-08-29): speech reaching Azure from the Reachy Mini mic
arrives around 0.015-0.04 RMS, while the same sentence played as a clean file arrives
at 0.16 and trips server VAD on the first chunk. Below roughly 0.05 the realtime
service simply never decides that a turn started, so Buddy talks and never listens.

These tests pin the microphone pre-amplifier that closes that gap.
"""

from __future__ import annotations

import numpy as np

from reachy_mini_mirrorbuddy import audio_dsp


def _rms(a: np.ndarray) -> float:
    return float(np.sqrt(np.mean((a.astype(np.float32) / 32768.0) ** 2)))


def test_quiet_speech_reaches_a_level_the_server_can_hear() -> None:
    quiet = (np.random.default_rng(0).normal(0, 0.02, 4800) * 32768).astype(np.int16)
    assert _rms(audio_dsp.amplify_mic(quiet, 6.0)) > 4 * _rms(quiet)


def test_amplify_mic_keeps_int16() -> None:
    out = audio_dsp.amplify_mic(np.array([100, -200], dtype=np.int16), 4.0)
    assert out.dtype == np.int16


def test_loud_speech_is_compressed_not_clipped() -> None:
    """A shout must not come back as a square wave: that is what rasps in the ear."""
    spiky = np.zeros(4800, dtype=np.int16)
    spiky[::4] = 32000  # quiet overall, but with peaks already at the rail
    out = audio_dsp.amplify_mic(spiky, 8.0)
    assert int(np.abs(out).max()) < 32768


def test_a_voice_already_loud_enough_is_left_alone() -> None:
    """The gain is a ceiling, not a setting.

    Squashing a child who speaks straight into the microphone is what made the model
    mishear every word — the whole point is to lift the quiet, not flatten the loud.
    """
    close = (np.random.default_rng(2).normal(0, 0.2, 4800) * 32768).astype(np.int16)
    assert np.array_equal(audio_dsp.amplify_mic(close, 6.0), close)


def test_the_boost_stops_at_the_target_level() -> None:
    quiet = (np.random.default_rng(3).normal(0, 0.01, 4800) * 32768).astype(np.int16)
    assert _rms(audio_dsp.amplify_mic(quiet, 20.0)) <= audio_dsp.MIC_TARGET_RMS * 1.1


def test_silence_is_not_amplified_into_noise() -> None:
    assert not audio_dsp.amplify_mic(np.zeros(480, dtype=np.int16), 6.0).any()


def test_gain_of_one_is_a_no_op() -> None:
    """Anyone disabling the pre-amp must get the untouched signal back."""
    sig = (np.random.default_rng(1).normal(0, 0.1, 256) * 32768).astype(np.int16)
    assert np.array_equal(audio_dsp.amplify_mic(sig, 1.0), sig)


def test_empty_input_is_safe() -> None:
    assert audio_dsp.amplify_mic(np.array([], dtype=np.int16), 4.0).size == 0


def test_input_gain_reads_the_env_at_call_time(monkeypatch) -> None:
    """``main.run()`` loads the robot's .env after import, so reading must be lazy."""
    monkeypatch.setenv("MIRRORBUDDY_INPUT_GAIN", "5.5")
    assert audio_dsp.input_gain() == 5.5


def test_input_gain_falls_back_when_the_value_is_nonsense(monkeypatch) -> None:
    monkeypatch.setenv("MIRRORBUDDY_INPUT_GAIN", "loud please")
    assert audio_dsp.input_gain() == audio_dsp.DEFAULT_INPUT_GAIN


def test_input_gain_is_never_attenuation(monkeypatch) -> None:
    """A gain below 1 would make the robot deafer, never what anyone means to type."""
    monkeypatch.setenv("MIRRORBUDDY_INPUT_GAIN", "0.2")
    assert audio_dsp.input_gain() == 1.0
