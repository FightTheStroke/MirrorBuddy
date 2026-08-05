"""Named body actions any Maestro can ask the robot to perform.

Roberto's request was simple to say and easy to get wrong: "if I tell it to lower
its antennas it should lower them, if I say hide, it should hide" — so Mario can
play peekaboo with Buddy instead of only talking to it.

Two constraints shape everything here. The arms have a real reach, and the device
already logs "IK error: Collision detected or head pose not achievable!" when we
ask for too much — an unreachable pose means the robot silently stops mid-game.
And every action must end where the idle animation expects to find the body,
otherwise Buddy is left staring at the floor for the rest of the lesson.

So: poses stay well inside the envelope, failures never propagate, and the last
frame of every action is neutral — including the frames after something broke.
"""

from __future__ import annotations

import logging
import time
import unicodedata

from .pose_writer import ANTENNA_MAX, ANTENNA_NEUTRAL, clamp_antenna

logger = logging.getLogger(__name__)

# Deliberately conservative: well inside what the arms can do, so a gesture never
# ends with the robot frozen because the IK gave up.
MAX_HEAD_Z = 0.022  # metres
MAX_HEAD_ANGLE = 25.0  # degrees

_NEUTRAL = {"z": 0.0, "pitch": 0.0, "yaw": 0.0}
_UP = clamp_antenna(ANTENNA_MAX * 0.9)
_DOWN = clamp_antenna(-ANTENNA_MAX * 0.75)

# Each step is (head kwargs, [right, left] antennas, body_yaw, seconds).
ACTIONS: dict[str, list[tuple[dict, list[float], float, float]]] = {
    "antenne_giu": [
        ({}, [_DOWN, _DOWN], 0.0, 0.6),
    ],
    "antenne_su": [
        ({}, [_UP, _UP], 0.0, 0.4),
    ],
    "nascondi": [
        ({"z": -MAX_HEAD_Z, "pitch": 22.0}, [_DOWN, _DOWN], 0.0, 0.7),
    ],
    "cucu": [
        ({"z": -MAX_HEAD_Z, "pitch": 22.0}, [_DOWN, _DOWN], 0.0, 0.6),
        ({"z": MAX_HEAD_Z, "pitch": -12.0}, [_UP, _UP], 0.0, 0.35),
        ({"z": -MAX_HEAD_Z, "pitch": 22.0}, [_DOWN, _DOWN], 0.0, 0.5),
        ({"z": MAX_HEAD_Z, "pitch": -12.0}, [_UP, _UP], 0.0, 0.35),
    ],
    "annuisci": [
        ({"pitch": 18.0}, [ANTENNA_NEUTRAL, ANTENNA_NEUTRAL], 0.0, 0.3),
        ({"pitch": -8.0}, [ANTENNA_NEUTRAL, ANTENNA_NEUTRAL], 0.0, 0.3),
        ({"pitch": 18.0}, [ANTENNA_NEUTRAL, ANTENNA_NEUTRAL], 0.0, 0.3),
    ],
    "scuoti": [
        ({"yaw": 20.0}, [ANTENNA_NEUTRAL, ANTENNA_NEUTRAL], 0.0, 0.3),
        ({"yaw": -20.0}, [ANTENNA_NEUTRAL, ANTENNA_NEUTRAL], 0.0, 0.3),
        ({"yaw": 20.0}, [ANTENNA_NEUTRAL, ANTENNA_NEUTRAL], 0.0, 0.3),
    ],
    "guarda_intorno": [
        ({"yaw": 24.0}, [ANTENNA_NEUTRAL, ANTENNA_NEUTRAL], 0.25, 0.6),
        ({"yaw": -24.0}, [ANTENNA_NEUTRAL, ANTENNA_NEUTRAL], -0.25, 0.6),
    ],
    "festeggia": [
        ({"z": MAX_HEAD_Z, "pitch": -14.0}, [_UP, _DOWN], 0.2, 0.35),
        ({"z": MAX_HEAD_Z, "pitch": -14.0}, [_DOWN, _UP], -0.2, 0.35),
        ({"z": MAX_HEAD_Z, "pitch": -14.0}, [_UP, _UP], 0.0, 0.35),
    ],
    "inchino": [
        ({"z": -MAX_HEAD_Z, "pitch": 24.0}, [_DOWN, _DOWN], 0.0, 0.8),
    ],
    "riposo": [
        (_NEUTRAL, [ANTENNA_NEUTRAL, ANTENNA_NEUTRAL], 0.0, 0.6),
    ],
}

_ALIASES = {
    "cuccu": "cucu",
    "peekaboo": "cucu",
    "nasconditi": "nascondi",
    "antenne_basse": "antenne_giu",
    "antenne_alte": "antenne_su",
    "guardati_intorno": "guarda_intorno",
    "neutro": "riposo",
    "fermo": "riposo",
}

# Postures that must outlive the gesture: the idle animation would otherwise undo
# them within one frame. Only the antennas can be held this way — the head is
# shared with the face tracker, so head poses stay one-shot.
SUSTAINED: dict[str, float] = {
    "antenne_giu": _DOWN,
    "antenne_su": _UP,
    "riposo": 0.0,
}


def normalise(name: str | None) -> str:
    """Map whatever the model wrote to a canonical action name.

    The model transcribes speech, so it produces "Antenne Giu", "cucù", "cucu'".
    Accents are stripped rather than mapped one by one: a child saying "cucù" and
    a model writing "cucu" must reach the same gesture.
    """
    text = (name or "").strip().lower().replace("-", " ").replace("'", "")
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    key = "_".join(text.split())
    return _ALIASES.get(key, key)


def describe() -> str:
    """The action list, for the prompt and the tool schema."""
    return ", ".join(sorted(ACTIONS))


def perform(name: str, robot, create_head_pose, pause=time.sleep) -> bool:
    """Play one named action, then always return to neutral.

    Returns False for an unknown action so the caller can tell the Maestro to say
    something honest instead of pretending it moved.
    """
    action = normalise(name)
    steps = ACTIONS.get(action)
    if steps is None:
        logger.info("Unknown body action requested: %r", name)
        return False

    logger.info("Body action: %s", action)
    try:
        for head_kwargs, antennas, body_yaw, seconds in steps:
            _write(robot, create_head_pose, head_kwargs, antennas, body_yaw, seconds)
            pause(seconds)
    finally:
        # Runs even if a step raised: the body must not be abandoned mid-pose.
        _write(robot, create_head_pose, _NEUTRAL, [ANTENNA_NEUTRAL, ANTENNA_NEUTRAL], 0.0, 0.5)
    return True


def _write(robot, create_head_pose, head_kwargs, antennas, body_yaw, seconds) -> None:
    """One frame, clamped and failure-proof."""
    head = None
    if create_head_pose is not None:
        try:
            head = create_head_pose(
                x=0,
                y=0,
                z=_clamp(head_kwargs.get("z", 0.0), MAX_HEAD_Z),
                roll=0,
                pitch=_clamp(head_kwargs.get("pitch", 0.0), MAX_HEAD_ANGLE),
                yaw=_clamp(head_kwargs.get("yaw", 0.0), MAX_HEAD_ANGLE),
                degrees=True,
            )
        except Exception as e:
            logger.debug("create_head_pose failed for body action: %s", e)
    try:
        robot.goto_target(
            head=head,
            antennas=[clamp_antenna(antennas[0]), clamp_antenna(antennas[1])],
            body_yaw=float(body_yaw),
            duration=max(0.2, float(seconds)),
        )
    except Exception as e:
        # The device really does refuse poses; a game that stutters beats a crash.
        logger.warning("Body action frame failed: %s", e)


def _clamp(value: float, limit: float) -> float:
    return max(-limit, min(limit, float(value)))
