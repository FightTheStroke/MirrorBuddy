"""Camera helpers: capture a frame and query face detection.

The robot exposes a JPEG frame via ``robot.media.get_frame_jpeg()`` and daemon-side
face tracking via ``robot.get_tracked_face()`` / ``robot.start_head_tracking()``.

Privacy: a frame is only ever captured on an explicit request (the ``look_at_homework``
tool), never continuously, and nothing is persisted to disk.
"""

from __future__ import annotations

import base64
import logging
import os
import time

from .jpeg_encoder import encode_jpeg

logger = logging.getLogger(__name__)

_RAW_FRAME_ATTEMPTS = 10
_RAW_FRAME_RETRY_S = 0.2


def _jpeg_size(data: bytes) -> tuple[int, int] | None:
    """Read (width, height) from a JPEG's SOF marker without any image library."""
    try:
        i, n = 2, len(data)
        while i + 9 < n:
            if data[i] != 0xFF:
                i += 1
                continue
            marker = data[i + 1]
            if 0xC0 <= marker <= 0xCF and marker not in (0xC4, 0xC8, 0xCC):
                h = (data[i + 5] << 8) | data[i + 6]
                w = (data[i + 7] << 8) | data[i + 8]
                return w, h
            seg = (data[i + 2] << 8) | data[i + 3]
            i += 2 + seg
    except Exception:
        return None
    return None


def _capture_jpeg(robot) -> bytes | None:
    """Return one JPEG frame, encoding it ourselves when the SDK path fails."""
    try:
        jpeg = robot.media.get_frame_jpeg()
    except Exception as e:
        logger.warning("get_frame_jpeg failed: %s", e)
        jpeg = None
    if jpeg:
        return jpeg

    # The SDK encoder is broken on the wireless unit: read() delivers frames but
    # read_jpeg() always returns None. Fall back to the raw frame + our encoder.
    logger.info("SDK jpeg path returned nothing, encoding the raw frame")
    for _ in range(_RAW_FRAME_ATTEMPTS):
        try:
            frame = robot.media.get_frame()
        except Exception as e:
            logger.warning("get_frame failed: %s", e)
            return None
        if frame is not None:
            return encode_jpeg(frame)
        time.sleep(_RAW_FRAME_RETRY_S)
    return None


def capture_data_url(robot) -> str | None:
    """Capture one JPEG frame and return it as a ``data:`` URL (or None)."""
    jpeg = _capture_jpeg(robot)
    if not jpeg:
        logger.warning("camera returned no frame")
        return None
    size = _jpeg_size(jpeg)
    logger.info("Camera frame: %s bytes, resolution=%s", len(jpeg), size)
    if os.getenv("MIRRORBUDDY_SAVE_FRAMES"):
        try:
            with open("/tmp/mb_frame.jpg", "wb") as fh:
                fh.write(jpeg)
        except Exception as e:
            logger.debug("save frame failed: %s", e)
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
