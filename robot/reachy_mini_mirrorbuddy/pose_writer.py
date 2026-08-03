"""The last inch: turning a desired pose into motor commands.

Separated from the animation itself because the two fail differently. The
animation is arithmetic; this is hardware, and hardware goes quiet on you. When
Roberto said "the robot doesn't move", nothing in the logs said why — every
frame failed silently, thirty times a second. So this layer's real job is to
report the first failure loudly, then shut up, then say when it recovers.
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

ANTENNA_NEUTRAL = 0.1745  # ~10 deg
ANTENNA_MAX = 0.6

# Loud once, then roughly every ten seconds at 30Hz: enough to notice a robot that
# is still broken, quiet enough not to bury the rest of the log.
_REPEAT_EVERY_FRAMES = 300


def clamp_antenna(v: float) -> float:
    return max(-ANTENNA_MAX, min(ANTENNA_MAX, v))


class PoseWriter:
    """Writes poses to the robot, and keeps track of whether they land."""

    def __init__(self, robot, create_head_pose=None) -> None:
        self.robot = robot
        self.create_head_pose = create_head_pose
        self.errors = 0  # consecutive failed frames

    def write(
        self,
        *,
        z: float,
        pitch: float,
        yaw: float,
        body_yaw: float,
        antennas: tuple[float, float],
        drive_head: bool,
    ) -> None:
        """Send one frame. ``drive_head`` is False while the face tracker owns the head."""
        head = None
        if drive_head and self.create_head_pose is not None:
            try:
                head = self.create_head_pose(
                    x=0, y=0, z=z, roll=0, pitch=pitch, yaw=yaw, degrees=True
                )
            except Exception as e:
                logger.debug("create_head_pose failed: %s", e)
        try:
            self.robot.set_target(
                head=head,
                antennas=[float(antennas[0]), float(antennas[1])],
                body_yaw=float(body_yaw),
            )
            if self.errors:
                logger.info("Motion recovered after %d failed frames", self.errors)
                self.errors = 0
        except Exception as e:
            self.errors += 1
            if self.errors == 1:
                logger.warning("set_target failed — no body motion: %s", e)
            elif self.errors % _REPEAT_EVERY_FRAMES == 0:
                logger.warning("set_target still failing (%d frames)", self.errors)

    def neutral(self) -> None:
        """Settle to a resting pose; never raises, because it runs during shutdown."""
        try:
            head = (
                self.create_head_pose(0, 0, 0, 0, 0, 0, degrees=True)
                if self.create_head_pose
                else None
            )
            self.robot.set_target(
                head=head, antennas=[ANTENNA_NEUTRAL, ANTENNA_NEUTRAL], body_yaw=0.0
            )
        except Exception:
            pass
