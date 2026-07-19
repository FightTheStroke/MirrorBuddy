"""Camera helpers: capture a frame and query face detection.

The robot exposes a JPEG frame via ``robot.media.get_frame_jpeg()`` and daemon-side
face tracking via ``robot.get_tracked_face()`` / ``robot.start_head_tracking()``.

Privacy: a frame is only ever captured on an explicit request (the ``look_at_homework``
tool), never continuously, and nothing is persisted to disk.
"""

from __future__ import annotations

import base64
import logging

logger = logging.getLogger(__name__)


def capture_data_url(robot) -> str | None:
    """Capture one JPEG frame and return it as a ``data:`` URL (or None)."""
    try:
        jpeg = robot.media.get_frame_jpeg()
    except Exception as e:
        logger.warning("get_frame_jpeg failed: %s", e)
        return None
    if not jpeg:
        logger.warning("camera returned no frame")
        return None
    b64 = base64.b64encode(jpeg).decode("ascii")
    return f"data:image/jpeg;base64,{b64}"


def face_detected(robot) -> bool:
    """Return True if the daemon currently tracks a face."""
    try:
        face = robot.get_tracked_face(wait=False)
        return bool(getattr(face, "detected", False))
    except Exception:
        return False


def start_tracking(robot, weight: float = 1.0) -> None:
    """Enable daemon-side head tracking so the robot follows the student's face."""
    try:
        robot.start_head_tracking(weight=weight)
        logger.info("Head tracking enabled (weight=%s)", weight)
    except Exception as e:
        logger.warning("start_head_tracking failed: %s", e)


def set_tracking_weight(robot, weight: float) -> None:
    """Adjust tracking influence (0 = paused, 1 = full follow)."""
    try:
        robot.start_head_tracking(weight=weight)
    except Exception as e:
        logger.debug("set tracking weight failed: %s", e)


def stop_tracking(robot) -> None:
    try:
        robot.stop_head_tracking()
    except Exception:
        pass
