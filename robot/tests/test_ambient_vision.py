"""Ambient vision samples the stream and shares it sparingly."""

from __future__ import annotations

import numpy as np

from reachy_mini_mirrorbuddy import ambient_vision
from reachy_mini_mirrorbuddy.ambient_vision import AmbientVision


class _Client:
    def __init__(self):
        self.sent = []

    def send_image(self, data_url, prompt, respond=True):
        self.sent.append((data_url, prompt, respond))


class _Robot:
    def __init__(self, frame):
        self.media = type("M", (), {"get_frame": staticmethod(lambda: frame)})()


def _vision(monkeypatch, frame=None, jpeg=b"\xff\xd8x"):
    monkeypatch.setattr(ambient_vision, "encode_jpeg", lambda f, max_width=None, quality=None: jpeg)
    v = AmbientVision(_Robot(frame if frame is not None else np.zeros((4, 4, 3), np.uint8)))
    v._frame = frame if frame is not None else np.zeros((4, 4, 3), np.uint8)
    v._frame_at = ambient_vision.time.monotonic()
    return v


def test_attaches_latest_frame_without_asking_for_a_reply(monkeypatch):
    v = _vision(monkeypatch)
    client = _Client()

    assert v.attach(client) is True
    data_url, prompt, respond = client.sent[0]
    assert data_url.startswith("data:image/jpeg;base64,")
    assert respond is False
    assert prompt == ambient_vision.AMBIENT_PROMPT


def test_rate_limited_between_turns(monkeypatch):
    v = _vision(monkeypatch)
    v.interval_s = 60.0
    client = _Client()

    assert v.attach(client) is True
    assert v.attach(client) is False
    assert len(client.sent) == 1


def test_skips_stale_frames(monkeypatch):
    v = _vision(monkeypatch)
    v._frame_at = ambient_vision.time.monotonic() - (ambient_vision._STALE_AFTER_S + 1)

    assert v.attach(_Client()) is False


def test_skips_when_encoding_fails(monkeypatch):
    v = _vision(monkeypatch, jpeg=None)

    assert v.attach(_Client()) is False


def test_grab_loop_stores_the_newest_frame(monkeypatch):
    frame = np.ones((4, 4, 3), np.uint8)
    v = AmbientVision(_Robot(frame))
    v._stop.set()  # run a single pass then exit

    v._run()

    assert v._frame is not None and v._frame.shape == (4, 4, 3)
