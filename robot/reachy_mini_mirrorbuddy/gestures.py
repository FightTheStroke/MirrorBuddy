"""Scripted whole-body gestures — the deliberate ones, not the ambient animation.

These are played once, at moments that matter (waking up, greeting), and they
must be legible from across a room: a child watching a robot decide whether it
is "awake" reads big movements, not subtle ones.
"""

from __future__ import annotations

import logging
import time

from .pose_writer import ANTENNA_NEUTRAL

logger = logging.getLogger(__name__)


def wake(robot, create_head_pose) -> None:
    """Look around, nod, antennas up: unmistakably "I am here and listening"."""
    if create_head_pose is None:
        return
    cp = create_head_pose
    seq = [
        (cp(yaw=22, degrees=True), [0.5, -0.5], 0.28),
        (cp(yaw=-22, degrees=True), [-0.5, 0.5], -0.28),
        (cp(pitch=16, degrees=True), [0.45, 0.45], 0.0),
        (cp(0, 0, 0, 0, 0, 0, degrees=True), [ANTENNA_NEUTRAL, ANTENNA_NEUTRAL], 0.0),
    ]
    for pose, antennas, body_yaw in seq:
        try:
            robot.goto_target(head=pose, antennas=antennas, body_yaw=body_yaw, duration=0.55)
        except Exception as e:
            logger.debug("wake goto failed: %s", e)
        time.sleep(0.6)


def settle(robot, create_head_pose) -> None:
    """Move to a still, centred pose — used before the camera takes a frame."""
    try:
        head = create_head_pose(0, 0, 0, 0, 0, 0, degrees=True) if create_head_pose else None
        robot.goto_target(
            head=head, antennas=[ANTENNA_NEUTRAL, ANTENNA_NEUTRAL], body_yaw=0.0, duration=0.5
        )
    except Exception as e:
        logger.debug("settle goto failed: %s", e)
