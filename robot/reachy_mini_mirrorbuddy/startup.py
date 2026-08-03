"""Startup helpers that must stay importable without the robot SDK.

Kept separate from ``main`` so the logic can be unit-tested on a laptop (``main``
pulls in the Reachy Mini SDK, sounddevice and scipy, none of which exist there).
"""

from __future__ import annotations

import threading
import time
from typing import Protocol


class _ConfigLike(Protocol):
    def missing(self) -> list[str]: ...
    def reload(self) -> None: ...


def wait_for_config(
    config: _ConfigLike,
    app_stop_event: threading.Event | None,
    poll_interval: float = 0.5,
) -> bool:
    """Park until the required configuration appears on the settings page.

    Returns False if the daemon asked the app to stop while waiting. The wait MUST
    stay interruptible: an app that ignores ``app_stop_event`` hangs the daemon in
    "stopping" forever, which then blocks every other app on the robot from starting.
    """
    while config.missing():
        if app_stop_event is not None and app_stop_event.is_set():
            return False
        if app_stop_event is not None:
            # Wake immediately on stop instead of sleeping through it.
            app_stop_event.wait(poll_interval)
        else:
            time.sleep(poll_interval)
        config.reload()
    return True
