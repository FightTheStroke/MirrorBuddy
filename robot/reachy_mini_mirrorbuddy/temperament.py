"""How lively a given Maestro moves.

A physics teacher who explains with her hands and a philosopher who thinks in
pauses should not share the same body language, so each persona's text is read
for temperament and the animation is scaled from it. Kept separate from the
animation loop because it is a property of the *character*, not of the motion.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Temperament:
    """How lively the Maestro moves. ``scale`` = amplitude, ``speed`` = frequency."""

    scale: float = 1.0
    speed: float = 1.0


CALM = Temperament(scale=0.7, speed=0.8)
NEUTRAL = Temperament(scale=1.0, speed=1.0)
LIVELY = Temperament(scale=1.35, speed=1.25)


def temperament_for(
    subject: str = "", teaching_style: str = "", voice_instructions: str = ""
) -> Temperament:
    """Derive a movement temperament from a Maestro's persona (best-effort keywords)."""
    text = f"{subject} {teaching_style} {voice_instructions}".lower()
    lively_kw = ("energe", "vivac", "entusias", "playful", "dynamic", "passion", "espressiv", "teatral", "lively")
    calm_kw = ("calm", "tranquil", "gentle", "paz", "serio", "riflessiv", "pacato", "soft", "measured", "sober")
    if any(k in text for k in lively_kw):
        return LIVELY
    if any(k in text for k in calm_kw):
        return CALM
    return NEUTRAL
