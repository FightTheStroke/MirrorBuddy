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
from dataclasses import dataclass

import numpy as np

from . import camera
from .emotions import NEUTRAL as EMOTION_NEUTRAL, Emotion, infer as infer_emotion

logger = logging.getLogger(__name__)

# Antennas are in radians. Neutral is a small offset to reduce servo shaking
# (matches the conversation app's ~10deg rest).
_ANTENNA_NEUTRAL = 0.1745  # ~10 deg
_ANTENNA_MAX = 0.6

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


@dataclass(frozen=True)
class Temperament:
    """How lively the Maestro moves. ``scale`` = amplitude, ``speed`` = frequency."""

    scale: float = 1.0
    speed: float = 1.0


CALM = Temperament(scale=0.7, speed=0.8)
NEUTRAL = Temperament(scale=1.0, speed=1.0)
LIVELY = Temperament(scale=1.35, speed=1.25)


def temperament_for(subject: str = "", teaching_style: str = "", voice_instructions: str = "") -> Temperament:
    """Derive a movement temperament from a Maestro's persona (best-effort keywords)."""
    text = f"{subject} {teaching_style} {voice_instructions}".lower()
    lively_kw = ("energe", "vivac", "entusias", "playful", "dynamic", "passion", "espressiv", "teatral", "lively")
    calm_kw = ("calm", "tranquil", "gentle", "paz", "serio", "riflessiv", "pacato", "soft", "measured", "sober")
    if any(k in text for k in lively_kw):
        return LIVELY
    if any(k in text for k in calm_kw):
        return CALM
    return NEUTRAL


class Movements:
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
        self._apply_errors = 0  # consecutive failed motion frames (see _apply)
        self._create_head_pose = None
        self._track_weight = -1.0  # unset; managed on speaking transitions
        self._hold = threading.Event()  # when set, freeze all motion (e.g. camera capture)
        # Current mood and the eased values that actually reach the servos. Emotions
        # are blended in gradually (see _MOOD_TAU) so a change of mood is itself a
        # movement rather than a snap to a new posture.
        self._emotion: Emotion = EMOTION_NEUTRAL
        self._mood = {"scale": 1.0, "speed": 1.0, "pitch": 0.0, "antenna": 0.0, "sway": 1.0}
        self._out = {"z": 0.0, "pitch": 0.0, "yaw": 0.0, "body": 0.0, "ant_r": _ANTENNA_NEUTRAL,
                     "ant_l": _ANTENNA_NEUTRAL}
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
        try:
            head = self._create_head_pose(0, 0, 0, 0, 0, 0, degrees=True) if self._create_head_pose else None
            self.robot.goto_target(head=head, antennas=[_ANTENNA_NEUTRAL, _ANTENNA_NEUTRAL], body_yaw=0.0, duration=0.5)
        except Exception as e:
            logger.debug("hold_still goto failed: %s", e)
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

            self._create_head_pose = create_head_pose
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
        if not self.enabled or self._create_head_pose is None:
            return
        cp = self._create_head_pose
        seq = [
            (cp(yaw=22, degrees=True), [0.5, -0.5], 0.28),
            (cp(yaw=-22, degrees=True), [-0.5, 0.5], -0.28),
            (cp(pitch=16, degrees=True), [0.45, 0.45], 0.0),
            (cp(0, 0, 0, 0, 0, 0, degrees=True), [_ANTENNA_NEUTRAL, _ANTENNA_NEUTRAL], 0.0),
        ]
        for pose, ant, byaw in seq:
            try:
                self.robot.goto_target(head=pose, antennas=ant, body_yaw=byaw, duration=0.55)
            except Exception as e:
                logger.debug("wake goto failed: %s", e)
            time.sleep(0.6)

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
        self._neutral()

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
            m = self._mood
            m["scale"] = _ease(m["scale"], emotion.scale, _MOOD_TAU, dt)
            m["speed"] = _ease(m["speed"], emotion.speed, _MOOD_TAU, dt)
            m["pitch"] = _ease(m["pitch"], emotion.pitch_offset, _MOOD_TAU, dt)
            m["antenna"] = _ease(m["antenna"], emotion.antenna_offset, _MOOD_TAU, dt)
            m["sway"] = _ease(m["sway"], emotion.sway, _MOOD_TAU, dt)
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

            z = 0.010 * s * math.sin(2 * math.pi * 0.12 * w * t)  # gentle breathing (m)
            pitch = 5.0 * s * math.sin(2 * math.pi * 0.09 * w * t) + m["pitch"]  # deg
            yaw_head = 8.0 * s * math.sin(2 * math.pi * 0.06 * w * t)  # deg
            pitch += env * 6.0 * s * energy * math.sin(2 * math.pi * 1.1 * t)
            yaw_head += env * 5.0 * s * energy * math.sin(2 * math.pi * 0.5 * t)

            body_yaw = math.radians(12.0 * s * m["sway"] * math.sin(2 * math.pi * 0.05 * w * t))
            body_yaw += env * math.radians(8.0 * s * energy * math.sin(2 * math.pi * 0.6 * t))

            # Antennas: idle sway plus a gentle lift while speaking, cross-faded by the
            # same envelope so they rise and settle instead of snapping.
            sway = math.radians(18.0 * s) * math.sin(2 * math.pi * 0.5 * w * t)
            perk = _ANTENNA_MAX * min(1.0, 0.4 + energy) * 0.22
            flutter = math.radians(2.0 * s) * math.sin(2 * math.pi * 2.5 * t)
            base = _ANTENNA_NEUTRAL + m["antenna"]
            right = _clamp(base + (1.0 - env) * sway + env * (perk + flutter))
            left = _clamp(base - (1.0 - env) * sway + env * (perk - flutter))

            # Final smoothing pass: whatever the maths produced, the servos are led
            # there rather than commanded there.
            o = self._out
            o["z"] = _ease(o["z"], z, _POSE_TAU, dt)
            o["pitch"] = _ease(o["pitch"], pitch, _POSE_TAU, dt)
            o["yaw"] = _ease(o["yaw"], yaw_head, _POSE_TAU, dt)
            o["body"] = _ease(o["body"], body_yaw, _POSE_TAU, dt)
            o["ant_r"] = _ease(o["ant_r"], right, _POSE_TAU, dt)
            o["ant_l"] = _ease(o["ant_l"], left, _POSE_TAU, dt)

            self._apply(z=o["z"], pitch=o["pitch"], yaw=o["yaw"], body_yaw=o["body"],
                        antennas=(o["ant_r"], o["ant_l"]))
            time.sleep(max(0.0, period - (time.monotonic() - now)))

    def _apply(self, z: float, pitch: float, yaw: float, body_yaw: float, antennas: tuple[float, float]) -> None:
        head = None
        # The daemon's face tracker owns the head whenever it is weighted in; we only
        # drive the head when the tracker is handed off, so we never fight it.
        tracker_owns_head = self.follow_face and self._track_weight > 0.0
        if not tracker_owns_head and self._create_head_pose is not None:
            try:
                head = self._create_head_pose(x=0, y=0, z=z, roll=0, pitch=pitch, yaw=yaw, degrees=True)
            except Exception as e:
                logger.debug("create_head_pose failed: %s", e)
        try:
            self.robot.set_target(
                head=head, antennas=[float(antennas[0]), float(antennas[1])], body_yaw=float(body_yaw)
            )
            if self._apply_errors:
                logger.info("Motion recovered after %d failed frames", self._apply_errors)
                self._apply_errors = 0
        except Exception as e:
            # This runs ~30x/second, so it can't shout every frame — but staying silent
            # is how "the robot doesn't move" stayed unexplained. Report the first one.
            self._apply_errors += 1
            if self._apply_errors == 1:
                logger.warning("set_target failed — no body motion: %s", e)
            elif self._apply_errors % 300 == 0:
                logger.warning("set_target still failing (%d frames)", self._apply_errors)

    def _neutral(self) -> None:
        try:
            head = self._create_head_pose(0, 0, 0, 0, 0, 0, degrees=True) if self._create_head_pose else None
            self.robot.set_target(head=head, antennas=[_ANTENNA_NEUTRAL, _ANTENNA_NEUTRAL], body_yaw=0.0)
        except Exception:
            pass


def _clamp(v: float) -> float:
    return max(-_ANTENNA_MAX, min(_ANTENNA_MAX, v))
