"""Notice whether the student is actually there, and react.

Until now the robot's eyes only did two things: follow a face mechanically, and take
one photo when asked. It never *noticed* anything — a child could sit down, get up
and walk away, and Buddy would keep talking to an empty chair.

Two constraints shaped this:

1. **Privacy.** Presence is decided from the daemon's local face detector. No image
   ever leaves the robot for this; nothing is stored. Ambient frames of a child are
   not something to send to a cloud model just to know if he is at the desk.
2. **A flickering detector is not a departure.** Mario has cerebral palsy: he moves,
   he leans out of frame, he turns his head. Every transition therefore has to hold
   for a while before it counts, and leaving is far more patient than arriving.
"""

from __future__ import annotations

import logging
import threading
import time
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# Arriving may be declared quickly — being greeted a beat after you sit down feels
# alive. Leaving must be slow: telling a child "sei andato via" while he is bending
# down to pick up a pen is worse than saying nothing at all.
ARRIVE_AFTER_S = 1.2
LEAVE_AFTER_S = 12.0
# Below this, a return is the same visit continuing, not a comeback worth greeting.
SAME_VISIT_S = 90.0

ARRIVED = "arrived"
RETURNED = "returned"
LEFT = "left"


@dataclass
class PresenceState:
    """Debounced view of "is the student at the desk?"."""

    present: bool = False
    since: float = 0.0  # when the current stable state began
    left_at: float = 0.0  # when the student was last seen leaving


class PresenceTracker:
    """Turns a noisy per-frame face flag into a few meaningful events.

    Pure logic: ``update`` takes the raw detection and the current time, and returns
    an event name or None. That keeps it testable without a robot on the desk.
    """

    def __init__(
        self,
        arrive_after: float = ARRIVE_AFTER_S,
        leave_after: float = LEAVE_AFTER_S,
        same_visit: float = SAME_VISIT_S,
    ) -> None:
        self.arrive_after = arrive_after
        self.leave_after = leave_after
        self.same_visit = same_visit
        self.state = PresenceState()
        self._candidate: bool | None = None  # the change we are currently waiting out
        self._candidate_since = 0.0

    def update(self, detected: bool, now: float) -> str | None:
        """Feed one observation. Returns an event name when the state really changed."""
        if detected == self.state.present:
            self._candidate = None  # the wobble ended; nothing changed after all
            return None

        if self._candidate != detected:
            self._candidate = detected
            self._candidate_since = now
            return None

        needed = self.arrive_after if detected else self.leave_after
        if now - self._candidate_since < needed:
            return None

        self._candidate = None
        was_away_for = now - self.state.left_at if self.state.left_at else None
        self.state.present = detected
        self.state.since = now
        if detected:
            if was_away_for is not None and was_away_for > self.same_visit:
                return RETURNED
            return ARRIVED if was_away_for is None else None
        self.state.left_at = now
        return LEFT

    def away_for(self, now: float) -> float:
        """Seconds since the student left (0 while present)."""
        if self.state.present or not self.state.left_at:
            return 0.0
        return now - self.state.left_at


class PresenceWatcher:
    """Polls the local face detector in the background and reports the events."""

    def __init__(self, robot, on_event, poll_hz: float = 3.0) -> None:
        self.robot = robot
        self.on_event = on_event
        self.period = 1.0 / max(0.5, poll_hz)
        self.tracker = PresenceTracker()
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        self._stop.clear()
        self._thread = threading.Thread(target=self._loop, name="MirrorBuddyPresence", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=1.5)
            self._thread = None

    def _loop(self) -> None:
        from . import camera

        while not self._stop.is_set():
            try:
                event = self.tracker.update(camera.face_detected(self.robot), time.monotonic())
                if event:
                    logger.info("Presence: %s", event)
                    self.on_event(event)
            except Exception as e:  # pragma: no cover - runtime robustness
                logger.debug("presence poll failed: %s", e)
            self._stop.wait(self.period)
