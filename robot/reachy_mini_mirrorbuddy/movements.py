"""Expressive full-body movement for MirrorBuddy.

Layers, from the proven Reachy Mini conversation app:

1. **Speech-reactive head** — the daemon's audio wobbler (``enable_wobbling``) moves the
   head in real time while Buddy talks. This is the primary "lip-sync" and needs no
   timing work from us.
2. **Living idle** — a gentle base pose we set continuously: breathing (head z),
   slow head drift, body rotation (``body_yaw``) and antenna sway. The wobbler overlays
   speech motion on top of this base.
3. **Speech energy -> antennas / body** — antennas perk up and the body engages slightly
   while Buddy speaks, proportional to loudness.

The intensity/speed of the idle + speech motion is scaled by a per-Maestro
**temperament**, so a lively teacher moves more than a calm one (alignment with the
MirrorBuddy persona).
"""

from __future__ import annotations

import logging
import math
import threading
import time
from dataclasses import dataclass

import numpy as np

from . import camera

logger = logging.getLogger(__name__)

# Antennas are in radians. Neutral is a small offset to reduce servo shaking
# (matches the conversation app's ~10deg rest).
_ANTENNA_NEUTRAL = 0.1745  # ~10 deg
_ANTENNA_MAX = 0.6


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

    def __init__(self, robot, enabled: bool = True, temperament: Temperament = NEUTRAL, follow_face: bool = True) -> None:
        self.robot = robot
        self.enabled = enabled
        self.temp = temperament
        self.follow_face = follow_face
        self._energy = 0.0
        self._lock = threading.Lock()
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self._create_head_pose = None
        self._track_weight = -1.0  # unset; managed on speaking transitions

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
        except Exception as e:
            logger.debug("enable_motors not available/failed: %s", e)
        # Daemon-driven, speech-reactive head motion (real-time lip-sync).
        try:
            self.robot.enable_wobbling()
            logger.info("Audio wobbler enabled (speech-reactive head motion)")
        except Exception as e:
            logger.warning("enable_wobbling failed: %s", e)
        # Daemon-driven face tracking: the head follows the student's face.
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

    # ------------------------------------------------------------------ internals
    def _loop(self) -> None:
        t0 = time.monotonic()
        while not self._stop.is_set():
            t = time.monotonic() - t0
            with self._lock:
                energy = self._energy
                self._energy *= 0.9
                s = self.temp.scale
                w = self.temp.speed

            speaking = energy > 0.06

            # Face-follow handoff: while Buddy speaks, hand the head to the wobbler
            # (weight 0); when idle/listening, let the head track the student (weight 1).
            if self.follow_face:
                target_weight = 0.0 if speaking else 1.0
                if target_weight != self._track_weight:
                    camera.set_tracking_weight(self.robot, target_weight)
                    self._track_weight = target_weight

            # --- base head pose: breathing + slow idle drift -----------------
            # Amplitudes are intentionally clearly visible (a still robot reads as broken).
            z = 0.010 * s * math.sin(2 * math.pi * 0.12 * w * t)  # gentle breathing (m)
            pitch = 5.0 * s * math.sin(2 * math.pi * 0.09 * w * t)  # deg
            yaw_head = 8.0 * s * math.sin(2 * math.pi * 0.06 * w * t)  # deg
            if speaking:
                # Extra nod while talking (wobbler adds the fast motion on top).
                pitch += 6.0 * s * energy * math.sin(2 * math.pi * 1.1 * t)
                yaw_head += 5.0 * s * energy * math.sin(2 * math.pi * 0.5 * t)

            # --- body rotation: slow sway, engages more while speaking -------
            body_yaw = math.radians(12.0 * s * math.sin(2 * math.pi * 0.05 * w * t))
            if speaking:
                body_yaw += math.radians(8.0 * s * energy * math.sin(2 * math.pi * 0.6 * t))

            # --- antennas: idle sway + perk up while speaking ----------------
            sway = math.radians(18.0 * s) * math.sin(2 * math.pi * 0.5 * w * t)
            if speaking:
                perk = _ANTENNA_MAX * min(1.0, 0.4 + energy)
                flutter = math.radians(12.0) * math.sin(2 * math.pi * 6.0 * t)
                right = _clamp(_ANTENNA_NEUTRAL + perk * 0.6 + flutter)
                left = _clamp(_ANTENNA_NEUTRAL + perk * 0.6 - flutter)
            else:
                right = _clamp(_ANTENNA_NEUTRAL + sway)
                left = _clamp(_ANTENNA_NEUTRAL - sway)

            self._apply(z=z, pitch=pitch, yaw=yaw_head, body_yaw=body_yaw, antennas=(right, left))
            time.sleep(0.033)  # ~30 Hz

    def _apply(self, z: float, pitch: float, yaw: float, body_yaw: float, antennas: tuple[float, float]) -> None:
        head = None
        # When face-follow is on, the daemon owns the head (track + wobble); we only
        # animate antennas and body so we never fight the tracker.
        if not self.follow_face and self._create_head_pose is not None:
            try:
                head = self._create_head_pose(x=0, y=0, z=z, roll=0, pitch=pitch, yaw=yaw, degrees=True)
            except Exception as e:
                logger.debug("create_head_pose failed: %s", e)
        try:
            self.robot.set_target(
                head=head,
                antennas=[float(antennas[0]), float(antennas[1])],
                body_yaw=float(body_yaw),
            )
        except Exception as e:
            logger.debug("set_target failed: %s", e)

    def _neutral(self) -> None:
        try:
            head = self._create_head_pose(0, 0, 0, 0, 0, 0, degrees=True) if self._create_head_pose else None
            self.robot.set_target(head=head, antennas=[_ANTENNA_NEUTRAL, _ANTENNA_NEUTRAL], body_yaw=0.0)
        except Exception:
            pass


def _clamp(v: float) -> float:
    return max(-_ANTENNA_MAX, min(_ANTENNA_MAX, v))
