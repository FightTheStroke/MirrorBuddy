"""Lightweight, safe expressive movement for MirrorBuddy.

The robot's media pipeline already wobbles the head in sync with played speech.
On top of that we add gentle **antenna** motion (bounded, low-risk) so Buddy feels
alive: antennas perk up while speaking and sway slowly while idle.

Head-pose control is intentionally avoided in v1 to keep motion safe and predictable;
antennas are expressive enough and cannot send the head to an odd absolute pose.
"""

from __future__ import annotations

import logging
import math
import threading
import time

import numpy as np

logger = logging.getLogger(__name__)

_ANTENNA_MAX = 0.5  # radians, bounded so motion always stays gentle


class Movements:
    """Background antenna animation driven by speech energy."""

    def __init__(self, robot, enabled: bool = True) -> None:
        self.robot = robot
        self.enabled = enabled
        self._energy = 0.0
        self._lock = threading.Lock()
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        if not self.enabled:
            return
        try:
            self.robot.enable_motors()
        except Exception as e:
            logger.debug("enable_motors not available/failed: %s", e)
        self._stop.clear()
        self._thread = threading.Thread(target=self._loop, name="MirrorBuddyMoves", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=1.5)
            self._thread = None
        self._set_antennas(0.0, 0.0)

    def reset(self) -> None:
        with self._lock:
            self._energy = 0.0

    def feed(self, audio: np.ndarray, sample_rate: int) -> None:
        """Update the current speech energy from a chunk of PCM16 audio."""
        if audio is None or audio.size == 0:
            return
        rms = float(np.sqrt(np.mean((audio.astype(np.float32) / 32768.0) ** 2)))
        with self._lock:
            # Smooth so antennas don't jitter.
            self._energy = 0.6 * self._energy + 0.4 * min(1.0, rms * 4.0)

    # ------------------------------------------------------------------ internals
    def _loop(self) -> None:
        t0 = time.monotonic()
        while not self._stop.is_set():
            t = time.monotonic() - t0
            with self._lock:
                energy = self._energy
                # Natural decay when no fresh audio arrives.
                self._energy *= 0.9

            if energy > 0.05:
                # Speaking: perk up + subtle flutter proportional to loudness.
                base = _ANTENNA_MAX * min(1.0, 0.3 + energy)
                flutter = 0.15 * math.sin(t * 12.0)
                right = _clamp(base + flutter)
                left = _clamp(base - flutter)
            else:
                # Idle: slow, gentle, breathing-like sway.
                sway = 0.12 * math.sin(t * 1.2)
                right = _clamp(sway)
                left = _clamp(-sway)

            self._set_antennas(right, left)
            time.sleep(0.05)

    def _set_antennas(self, right: float, left: float) -> None:
        try:
            self.robot.set_target(antennas=[float(right), float(left)])
        except Exception as e:
            logger.debug("set antennas failed: %s", e)


def _clamp(v: float) -> float:
    return max(-_ANTENNA_MAX, min(_ANTENNA_MAX, v))
