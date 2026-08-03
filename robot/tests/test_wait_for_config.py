"""Tests for the interruptible "waiting for credentials" loop.

When the Azure credentials are missing, the app parks itself until someone types
them on the settings page. That wait must still honour the daemon's stop request:
an app that ignores it stays in "stopping" forever and blocks every other app on
the robot from starting (observed on a real Reachy Mini).
"""

from __future__ import annotations

import sys
import threading
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from reachy_mini_mirrorbuddy.startup import wait_for_config  # noqa: E402


class _FakeConfig:
    """Config stub whose `missing()` answer is driven by the test."""

    def __init__(self, missing: list[str]) -> None:
        self._missing = missing
        self.reloads = 0

    def missing(self) -> list[str]:
        return self._missing

    def reload(self) -> None:
        self.reloads += 1


def test_returns_immediately_when_config_is_already_present():
    assert wait_for_config(_FakeConfig([]), threading.Event()) is True


def test_stops_waiting_when_the_daemon_asks_the_app_to_stop():
    cfg = _FakeConfig(["AZURE_OPENAI_REALTIME_API_KEY"])
    stop = threading.Event()
    result: list[bool] = []

    worker = threading.Thread(
        target=lambda: result.append(wait_for_config(cfg, stop, poll_interval=0.05))
    )
    worker.start()
    time.sleep(0.15)
    assert worker.is_alive(), "the app should park while credentials are missing"

    stop.set()
    worker.join(timeout=2)

    assert not worker.is_alive(), "the wait must unblock as soon as a stop is requested"
    assert result == [False]


def test_proceeds_once_the_credentials_are_entered():
    cfg = _FakeConfig(["AZURE_OPENAI_REALTIME_API_KEY"])
    stop = threading.Event()
    result: list[bool] = []

    worker = threading.Thread(
        target=lambda: result.append(wait_for_config(cfg, stop, poll_interval=0.05))
    )
    worker.start()
    time.sleep(0.15)

    cfg._missing = []  # the parent typed the Azure credentials on the settings page
    worker.join(timeout=2)

    assert result == [True]
    assert cfg.reloads > 0, "the loop must re-read the instance .env while waiting"
