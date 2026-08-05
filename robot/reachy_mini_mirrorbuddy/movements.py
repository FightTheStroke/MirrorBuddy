"""Expressive full-body movement for MirrorBuddy.

A living idle drives antennas + body (and head when not face-following); while listening
the head tracks the student's face. In *calm* mode the audio wobbler stays off and
amplitudes are gentle. Intensity is scaled by a per-Maestro **temperament**.
``hold_still`` freezes everything so the camera can grab a sharp homework frame.
"""

from __future__ import annotations

import logging
import math
import threading
import time

import numpy as np

from . import camera, gestures
from .temperament import CALM, LIVELY, NEUTRAL, Temperament, temperament_for  # noqa: F401
from .motion_shapes import idle_pose
from .body_control import BodyControlMixin
from .pose_writer import ANTENNA_NEUTRAL, PoseWriter
from .emotions import NEUTRAL as EMOTION_NEUTRAL, Emotion, blend_mood, infer as infer_emotion

logger = logging.getLogger(__name__)

# Antennas are in radians. Neutral is a small offset to reduce servo shaking
# (matches the conversation app's ~10deg rest).

# Motion smoothing. The loop runs faster than before and every value is eased
# toward its target instead of being written directly: a servo asked to jump
# stutters, a servo led there glides. TAU is the time constant in seconds — how
# long a value takes to cover ~63% of the distance to its target.
_LOOP_HZ = 50.0
_POSE_TAU = 0.09  # head/body: quick enough to feel alive, slow enough to be smooth
_MOOD_TAU = 0.65  # mood changes arrive as a movement, not as a jump


def _ease(current: float, target: float, tau: float, dt: float) -> float:
    """Exponential approach of ``current`` toward ``target`` (frame-rate independent)."""
    if tau <= 0.0:
        return target
    alpha = 1.0 - math.exp(-dt / tau)
    return current + (target - current) * alpha


class Movements(BodyControlMixin):
    """Background full-body animation driven by speech energy + idle liveliness."""

    def __init__(self, robot, enabled: bool = True, temperament: Temperament = NEUTRAL,
                 follow_face: bool = True, calm: bool = True) -> None:
        self.robot = robot
        self.enabled = enabled
        self.temp = temperament
        self.follow_face = follow_face
        self.calm = calm  # calm: no audio wobbler, gentler amplitudes, softer face-follow
        self._energy = 0.0
        self._lock = threading.Lock()
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self._writer = PoseWriter(robot)
        self._antenna_bias = 0.0
        self._track_weight = -1.0  # unset; managed on speaking transitions
        self._hold = threading.Event()  # when set, freeze all motion (e.g. camera capture)
        # Current mood and the eased values that actually reach the servos. Emotions
        # are blended in gradually (see _MOOD_TAU) so a change of mood is itself a
        # movement rather than a snap to a new posture.
        self._emotion: Emotion = EMOTION_NEUTRAL
        self._mood = {"scale": 1.0, "speed": 1.0, "pitch": 0.0, "antenna": 0.0, "sway": 1.0}
        self._out = {"z": 0.0, "pitch": 0.0, "yaw": 0.0, "body": 0.0, "ant_r": ANTENNA_NEUTRAL,
                     "ant_l": ANTENNA_NEUTRAL}
        self._speak_env = 0.0  # smoothed "is speaking" envelope, 0..1

    def set_emotion(self, emotion: Emotion | str | None) -> None:
        """Set the current mood. Blended in smoothly by the animation loop."""
        target = emotion if isinstance(emotion, Emotion) else None
        if target is None:
            from .emotions import get as _get

            target = _get(emotion if isinstance(emotion, str) else None)
        with self._lock:
            if target.name != self._emotion.name:
                logger.debug("Emotion: %s -> %s", self._emotion.name, target.name)
            self._emotion = target

    def express(self, text: str | None) -> None:
        """Colour the body language from what Buddy is about to say."""
        self.set_emotion(infer_emotion(text))

    def hold_still(self) -> None:
        """Freeze head/body and pause tracking + wobbler so the camera gets a sharp frame."""
        self._hold.set()
        camera.set_tracking_weight(self.robot, 0.0)
        try:
            self.robot.disable_wobbling()
        except Exception:
            pass
        gestures.settle(self.robot, self._writer.create_head_pose)
        time.sleep(0.8)  # let the head settle and the camera pipeline produce a fresh frame

    def release_hold(self) -> None:
        """Resume normal motion after a camera capture."""
        if not self._hold.is_set():
            return
        if not self.calm:
            try:
                self.robot.enable_wobbling()
            except Exception:
                pass
        if self.follow_face:
            camera.set_tracking_weight(self.robot, 1.0)
            self._track_weight = 1.0
        self._hold.clear()

    def set_temperament(self, temperament: Temperament) -> None:
        """Update liveliness when the Maestro changes (kept in sync with the persona)."""
        with self._lock:
            self.temp = temperament

    def start(self) -> None:
        if not self.enabled:
            return
        try:
            from reachy_mini.utils import create_head_pose

            self._writer.create_head_pose = create_head_pose
        except Exception as e:
            logger.warning("create_head_pose unavailable, head motion disabled: %s", e)
        try:
            self.robot.enable_motors()
            logger.info("Motors enabled")
        except Exception as e:
            # Not debug: if the motors never come on, the robot sits there mute-bodied
            # and there was no trace anywhere explaining why.
            logger.warning("enable_motors failed — the robot will not move: %s", e)
        # Speech-reactive head wobbler. In calm mode we keep it OFF so the head does not
        # jitter while talking (less distracting for the student).
        if not self.calm:
            try:
                self.robot.enable_wobbling()
                logger.info("Audio wobbler enabled (speech-reactive head motion)")
            except Exception as e:
                logger.warning("enable_wobbling failed: %s", e)
        if self.follow_face:
            camera.start_tracking(self.robot, 1.0)
            self._track_weight = 1.0
        self._stop.clear()
        self._thread = threading.Thread(target=self._loop, name="MirrorBuddyMoves", daemon=True)
        self._thread.start()

    def wake(self) -> None:
        """A short, clearly visible greeting gesture (look around + nod + antennas up)."""
        if not self.enabled:
            return
        gestures.wake(self.robot, self._writer.create_head_pose)

    def stop(self) -> None:
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=1.5)
            self._thread = None
        try:
            self.robot.disable_wobbling()
        except Exception:
            pass
        if self.follow_face:
            camera.stop_tracking(self.robot)
        self._writer.neutral()

    def reset(self) -> None:
        with self._lock:
            self._energy = 0.0

    def feed(self, audio: np.ndarray, sample_rate: int) -> None:
        """Update the current speech energy from a chunk of PCM16 audio."""
        if audio is None or audio.size == 0:
            return
        rms = float(np.sqrt(np.mean((audio.astype(np.float32) / 32768.0) ** 2)))
        with self._lock:
            self._energy = 0.6 * self._energy + 0.4 * min(1.0, rms * 4.0)

    def _loop(self) -> None:
        t0 = time.monotonic()
        last = t0
        period = 1.0 / _LOOP_HZ
        while not self._stop.is_set():
            if self._hold.is_set():
                time.sleep(0.05)  # frozen for camera capture; drive nothing
                continue
            now = time.monotonic()
            dt = min(0.2, max(1e-3, now - last))  # cap dt so a stall can't cause a lurch
            last = now
            t = now - t0
            with self._lock:
                energy = self._energy
                # Decay is time-based now that the loop rate can vary.
                self._energy *= math.exp(-dt / 0.32)
                s = self.temp.scale * (0.55 if self.calm else 1.0)
                w = self.temp.speed
                emotion = self._emotion

            # Blend the mood in gradually: the child sees Buddy *become* happy.
            m = blend_mood(self._mood, emotion, _MOOD_TAU, dt)
            s *= m["scale"]
            w *= m["speed"]

            # A smoothed envelope instead of a boolean: speech starting and stopping
            # used to switch whole motion patterns on and off between two frames,
            # which is exactly what read as "jerky".
            raw = 1.0 if energy > 0.06 else 0.0
            self._speak_env = _ease(self._speak_env, raw, 0.12 if raw else 0.30, dt)
            env = self._speak_env
            speaking = env > 0.5

            # Face-follow: while speaking keep a gentle track (calm) or hand off to the
            # wobbler (0); while listening, full tracking (1).
            if self.follow_face:
                # Listening: the tracker follows the student's face. Speaking: hand the
                # head over to our own animation, which is now smoothed — the earlier
                # half-weight compromise existed only to hide the jitter.
                target_weight = 0.0 if speaking else 1.0
                if target_weight != self._track_weight:
                    camera.set_tracking_weight(self.robot, target_weight)
                    self._track_weight = target_weight

            z, pitch, yaw_head, body_yaw, right, left = idle_pose(
                t=t, scale=s, speed=w, energy=energy, env=env, mood=m
            )

            # Final smoothing pass: whatever the maths produced, the servos are led
            # there rather than commanded there.
            o = self._out
            o["z"] = _ease(o["z"], z, _POSE_TAU, dt)
            o["pitch"] = _ease(o["pitch"], pitch, _POSE_TAU, dt)
            o["yaw"] = _ease(o["yaw"], yaw_head, _POSE_TAU, dt)
            o["body"] = _ease(o["body"], body_yaw, _POSE_TAU, dt)
            o["ant_r"] = _ease(o["ant_r"], right, _POSE_TAU, dt)
            o["ant_l"] = _ease(o["ant_l"], left, _POSE_TAU, dt)

            # The daemon's face tracker owns the head whenever it is weighted in;
            # we only drive the head once it hands off, so we never fight it.
            drive_head = not (self.follow_face and self._track_weight > 0.0)
            ant_r, ant_l = self.apply_antenna_bias(o["ant_r"], o["ant_l"])
            self._writer.write(z=o["z"], pitch=o["pitch"], yaw=o["yaw"], body_yaw=o["body"],
                               antennas=(ant_r, ant_l), drive_head=drive_head)
            time.sleep(max(0.0, period - (time.monotonic() - now)))

