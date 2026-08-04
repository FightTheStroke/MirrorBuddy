"""Camera capture falls back to our own JPEG encoder when the SDK returns None."""

from __future__ import annotations

import numpy as np

from reachy_mini_mirrorbuddy import camera


class _Media:
    def __init__(self, jpeg=None, frames=None):
        self._jpeg = jpeg
        self._frames = list(frames or [])
        self.frame_calls = 0

    def get_frame_jpeg(self):
        return self._jpeg

    def get_frame(self):
        self.frame_calls += 1
        return self._frames.pop(0) if self._frames else None


class _Robot:
    def __init__(self, media):
        self.media = media


def _frame():
    return np.zeros((4, 4, 3), dtype=np.uint8)


def test_uses_sdk_jpeg_when_available(monkeypatch):
    monkeypatch.setattr(camera, "encode_jpeg", lambda f: b"never")
    robot = _Robot(_Media(jpeg=b"\xff\xd8sdk"))

    url = camera.capture_data_url(robot)

    assert url is not None and url.startswith("data:image/jpeg;base64,")
    assert robot.media.frame_calls == 0


def test_falls_back_to_raw_frame_encoding(monkeypatch):
    monkeypatch.setattr(camera, "encode_jpeg", lambda f: b"\xff\xd8encoded")
    robot = _Robot(_Media(jpeg=None, frames=[_frame()]))

    url = camera.capture_data_url(robot)

    assert url is not None
    assert robot.media.frame_calls == 1


def test_retries_until_a_frame_arrives(monkeypatch):
    monkeypatch.setattr(camera, "encode_jpeg", lambda f: b"\xff\xd8encoded")
    monkeypatch.setattr(camera.time, "sleep", lambda _s: None)
    media = _Media(jpeg=None, frames=[None, None, _frame()])

    url = camera.capture_data_url(_Robot(media))

    assert url is not None
    assert media.frame_calls == 3


def test_returns_none_when_camera_never_delivers(monkeypatch):
    monkeypatch.setattr(camera, "encode_jpeg", lambda f: b"unused")
    monkeypatch.setattr(camera.time, "sleep", lambda _s: None)
    media = _Media(jpeg=None, frames=[])

    assert camera.capture_data_url(_Robot(media)) is None
    assert media.frame_calls == camera._RAW_FRAME_ATTEMPTS
