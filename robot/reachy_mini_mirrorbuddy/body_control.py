"""The part of the body that answers commands rather than moods.

Split out of :mod:`movements` because the two have different jobs and different
reasons to change: the animation loop is a continuous expression of how Buddy
feels, while this is a small state machine driven by what a child just asked for.
Keeping them in one file also pushed it past the repository's 250-line cap.

Mixed into :class:`~reachy_mini_mirrorbuddy.movements.Movements`, which owns the
robot handle, the pose writer and the hold/release mechanism this needs.
"""

from __future__ import annotations

import logging

from . import body_actions
from .pose_writer import clamp_antenna

logger = logging.getLogger(__name__)


class BodyControlMixin:
    """Named gestures and sustained postures, on top of the idle animation."""

    @property
    def antenna_bias(self) -> float:
        """A posture the animation keeps holding: negative is antennas down."""
        return self._antenna_bias

    def set_antenna_bias(self, value: float) -> None:
        """Hold the antennas somewhere other than where the idle animation wants them.

        A one-shot gesture is overwritten within one frame at 50Hz, so "keep your
        antennas down" has to be an offset the loop itself respects. Non-numeric
        arguments arrive from the model and are ignored rather than crashing the
        animation thread.
        """
        try:
            self._antenna_bias = clamp_antenna(float(value))
        except (TypeError, ValueError):
            logger.debug("Ignoring non-numeric antenna bias: %r", value)

    def apply_antenna_bias(self, right: float, left: float) -> tuple[float, float]:
        """Offset the animation's antenna values, still inside the mechanical limit."""
        bias = self._antenna_bias
        return clamp_antenna(right + bias), clamp_antenna(left + bias)

    def play_body_action(self, name: str) -> bool:
        """Perform a named gesture without the idle animation fighting it.

        The animation writes every joint fifty times a second, so a scripted pose
        has to own the body for its duration — the same mechanism the camera
        capture uses. Sustained postures are handed to the animation afterwards
        as a bias, so "keep your antennas down" actually keeps them down.
        """
        action = body_actions.normalise(name)
        if action not in body_actions.ACTIONS:
            logger.info("Unknown body action: %r", name)
            return False
        self.hold_still()
        try:
            body_actions.perform(action, self.robot, self._writer.create_head_pose)
        finally:
            bias = body_actions.SUSTAINED.get(action)
            if bias is not None:
                self.set_antenna_bias(bias)
            self.release_hold()
        return True
