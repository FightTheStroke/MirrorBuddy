"""Ambient vision: keep the latest camera frame so Buddy sees the current scene.

The realtime model takes images, not video, so "watching" means sampling the
video stream. A background thread keeps the most recent frame in memory (nothing
is written to disk), and at the start of a student's turn we hand over the newest
one — no capture latency in the conversation path, and no round trip through a
tool call just to notice that the child is holding up a notebook.

Rate limited on purpose: a frame per turn at most every ``interval_s`` seconds,
so the session context (and the bill) stays bounded.
"""

from __future__ import annotations

import base64
import logging
import threading
import time

from .jpeg_encoder import encode_jpeg

logger = logging.getLogger(__name__)

_GRAB_PERIOD_S = 1.0
_STALE_AFTER_S = 5.0
_AMBIENT_QUALITY = 55
AMBIENT_PROMPT = (
    "[Immagine dalla telecamera, contesto silenzioso. Non descriverla e non "
    "commentarla se non serve: usala solo per capire meglio cosa sta facendo "
    "lo studente e a cosa si riferisce.]"
)


class AmbientVision:
    """Sample the video stream in the background and share it sparingly."""

    def __init__(self, robot, interval_s: float = 20.0, max_width: int = 448) -> None:
        self.robot = robot
        self.interval_s = interval_s
        self.max_width = max_width
        self._frame = None
        self._frame_at = 0.0
        self._lock = threading.Lock()
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self._last_sent = 0.0

    def start(self) -> None:
        if self._thread is not None:
            return
        self._stop.clear()
        self._thread = threading.Thread(target=self._run, name="AmbientVision", daemon=True)
        self._thread.start()
        logger.info(
            "Ambient vision on: a frame every %.0fs at most, %spx wide",
            self.interval_s,
            self.max_width,
        )

    def stop(self) -> None:
        self._stop.set()
        thread, self._thread = self._thread, None
        if thread:
            thread.join(timeout=2.0)

    def _run(self) -> None:
        while True:
            try:
                frame = self.robot.media.get_frame()
            except Exception as e:
                logger.debug("ambient frame grab failed: %s", e)
                frame = None
            if frame is not None:
                with self._lock:
                    self._frame = frame
                    self._frame_at = time.monotonic()
            if self._stop.wait(_GRAB_PERIOD_S):
                return

    def _take_fresh_frame(self):
        with self._lock:
            if self._frame is None or time.monotonic() - self._frame_at > _STALE_AFTER_S:
                return None
            return self._frame

    def attach(self, client) -> bool:
        """Send the newest frame to the model without asking for a reply."""
        now = time.monotonic()
        if now - self._last_sent < self.interval_s:
            return False
        frame = self._take_fresh_frame()
        if frame is None:
            return False
        # The realtime websocket also carries the microphone: a fat frame delays the
        # audio and the child hears the lag. Small and cheap beats pretty.
        jpeg = encode_jpeg(frame, max_width=self.max_width, quality=_AMBIENT_QUALITY)
        if not jpeg:
            return False
        data_url = "data:image/jpeg;base64," + base64.b64encode(jpeg).decode("ascii")
        try:
            client.send_image(data_url, AMBIENT_PROMPT, respond=False)
        except Exception as e:
            logger.debug("ambient image send failed: %s", e)
            return False
        self._last_sent = now
        logger.info("Ambient frame shared (%s bytes)", len(jpeg))
        return True
