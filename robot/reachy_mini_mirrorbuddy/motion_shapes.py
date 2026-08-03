"""The arithmetic of looking alive.

Pure functions over time: no robot, no threads, no state. A body that never
moves reads as switched off, and a body that moves in straight lines reads as a
machine — so everything here is a sum of slow sines at unrelated frequencies,
which never repeats visibly and never lands twice in the same place.
"""

from __future__ import annotations

import math

from .pose_writer import ANTENNA_MAX, ANTENNA_NEUTRAL, clamp_antenna


def idle_pose(
    *, t: float, scale: float, speed: float, energy: float, env: float, mood: dict[str, float]
) -> tuple[float, float, float, float, float, float]:
    """One frame of body language.

    ``env`` is the smoothed speaking envelope (0..1): idle sway and speech motion
    are cross-faded by it, so starting and stopping a sentence is a transition
    rather than a switch. Returns ``(z, pitch, yaw, body_yaw, antenna_r, antenna_l)``.
    """
    s, w = scale, speed

    z = 0.010 * s * math.sin(2 * math.pi * 0.12 * w * t)  # gentle breathing (m)
    pitch = 5.0 * s * math.sin(2 * math.pi * 0.09 * w * t) + mood["pitch"]  # deg
    yaw = 8.0 * s * math.sin(2 * math.pi * 0.06 * w * t)  # deg
    pitch += env * 6.0 * s * energy * math.sin(2 * math.pi * 1.1 * t)
    yaw += env * 5.0 * s * energy * math.sin(2 * math.pi * 0.5 * t)

    body_yaw = math.radians(12.0 * s * mood["sway"] * math.sin(2 * math.pi * 0.05 * w * t))
    body_yaw += env * math.radians(8.0 * s * energy * math.sin(2 * math.pi * 0.6 * t))

    # Antennas: idle sway plus a gentle lift while speaking, cross-faded by the same
    # envelope so they rise and settle instead of snapping.
    sway = math.radians(18.0 * s) * math.sin(2 * math.pi * 0.5 * w * t)
    perk = ANTENNA_MAX * min(1.0, 0.4 + energy) * 0.22
    flutter = math.radians(2.0 * s) * math.sin(2 * math.pi * 2.5 * t)
    base = ANTENNA_NEUTRAL + mood["antenna"]
    right = clamp_antenna(base + (1.0 - env) * sway + env * (perk + flutter))
    left = clamp_antenna(base - (1.0 - env) * sway + env * (perk - flutter))

    return z, pitch, yaw, body_yaw, right, left
