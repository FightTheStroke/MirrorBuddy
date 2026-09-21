"""A checked response queued in one burst must remain locally interruptible."""

from unittest.mock import Mock

from reachy_mini_mirrorbuddy.audio_io import AudioIO
from reachy_mini_mirrorbuddy.azure_realtime import SAMPLE_RATE


def test_barge_in_window_covers_queued_audio_duration(monkeypatch):
    clock = [100.0]
    monkeypatch.setattr("reachy_mini_mirrorbuddy.audio_io.time.monotonic", lambda: clock[0])
    audio = AudioIO(Mock(), Mock())
    audio._out_rate = SAMPLE_RATE
    audio.play(b"\0\0" * SAMPLE_RATE)
    audio.play(b"\0\0" * SAMPLE_RATE)
    assert audio._playing_until >= 102.0
    clock[0] = 101.0
    assert clock[0] < audio._playing_until
    audio.interrupt()
    assert audio._playing_until == 0.0


def test_expired_playback_window_does_not_accumulate_old_duration(monkeypatch):
    monkeypatch.setattr("reachy_mini_mirrorbuddy.audio_io.time.monotonic", lambda: 100.0)
    audio = AudioIO(Mock(), Mock())
    audio._out_rate = SAMPLE_RATE
    audio._playing_until = 90.0
    audio.play(b"\0\0" * SAMPLE_RATE)
    assert 101.0 <= audio._playing_until <= 101.3
