"""Emotional colour for Buddy's body language.

Why this exists: a tutor that moves the same way whether the child just solved
something or just got it wrong is a tutor that isn't really listening. And a body
that snaps between poses reads as mechanical — children pick that up instantly.

Two ideas here:

1. **Emotions are offsets, not choreography.** Each emotion nudges the idle
   animation (posture, tempo, antenna angle) instead of replacing it, so Buddy
   never freezes mid-gesture to "play an animation".
2. **Nothing is instantaneous.** Every value eases toward its target, so a change
   of mood arrives as a movement, not as a jump.
"""

from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class Emotion:
    """A mood, expressed as gentle modifiers over the idle animation.

    scale/speed multiply the idle amplitude and tempo. The offsets are additive:
    ``pitch_offset`` is the head tilt in degrees (positive = looking up, open and
    attentive; negative = looking down, thoughtful or sorry). ``antenna_offset``
    is in radians (up = alert and happy, down = deflated).
    """

    name: str
    scale: float = 1.0
    speed: float = 1.0
    pitch_offset: float = 0.0
    antenna_offset: float = 0.0
    sway: float = 1.0  # body yaw amplitude multiplier


# Deliberately restrained: this robot sits in front of a child who needs to
# concentrate. Movement should support attention, never compete with it.
NEUTRAL = Emotion("neutral")
HAPPY = Emotion("happy", scale=1.25, speed=1.2, pitch_offset=3.0, antenna_offset=0.18, sway=1.2)
CELEBRATING = Emotion("celebrating", scale=1.5, speed=1.45, pitch_offset=5.0, antenna_offset=0.30, sway=1.5)
CURIOUS = Emotion("curious", scale=1.1, speed=0.95, pitch_offset=2.0, antenna_offset=0.10, sway=1.15)
THINKING = Emotion("thinking", scale=0.75, speed=0.6, pitch_offset=-4.0, antenna_offset=-0.05, sway=0.7)
FOCUSED = Emotion("focused", scale=0.5, speed=0.55, pitch_offset=-2.0, antenna_offset=0.0, sway=0.4)
ENCOURAGING = Emotion("encouraging", scale=1.1, speed=1.05, pitch_offset=2.5, antenna_offset=0.12, sway=1.0)
# Not sadness for its own sake: it's how a person leans in a little when a child
# is discouraged. Slower and lower, so it reads as "I'm with you", not as sulking.
EMPATHETIC = Emotion("empathetic", scale=0.7, speed=0.65, pitch_offset=-3.0, antenna_offset=-0.10, sway=0.6)
CALM = Emotion("calm", scale=0.45, speed=0.5, pitch_offset=0.0, antenna_offset=-0.08, sway=0.4)

ALL: dict[str, Emotion] = {
    e.name: e
    for e in (
        NEUTRAL,
        HAPPY,
        CELEBRATING,
        CURIOUS,
        THINKING,
        FOCUSED,
        ENCOURAGING,
        EMPATHETIC,
        CALM,
    )
}


def get(name: str | None) -> Emotion:
    """Look up an emotion by name, falling back to neutral."""
    if not name:
        return NEUTRAL
    return ALL.get(name.strip().lower(), NEUTRAL)


# What Buddy says is the most reliable signal of what Buddy means. The model is
# never asked to declare a mood (that would cost a round-trip); we read it from
# the words it just spoke.
_CUES: tuple[tuple[Emotion, tuple[str, ...]], ...] = (
    (
        CELEBRATING,
        ("bravissimo", "perfetto", "esatto", "ce l'hai fatta", "complimenti", "grandissimo", "fantastico"),
    ),
    (HAPPY, ("bravo", "brava", "benissimo", "molto bene", "ottimo", "giusto", "evviva", "che bello")),
    (
        EMPATHETIC,
        ("non ti preoccupare", "capita", "tranquillo", "tranquilla", "mi dispiace", "va bene lo stesso",
         "non fa niente", "coraggio"),
    ),
    (
        ENCOURAGING,
        ("proviamo", "riprova", "ci sei quasi", "insieme", "un passo alla volta", "puoi farcela", "dai che"),
    ),
    (THINKING, ("fammi pensare", "vediamo", "aspetta un attimo", "dunque", "allora")),
    (CURIOUS, ("che cosa", "come mai", "raccontami", "dimmi", "secondo te", "?")),
)


def _matches(cue: str, text: str) -> bool:
    """Whole-word cue match.

    Plain substring matching made Buddy sympathetic about French geography:
    "capitale" contains "capita". Cues must land on word boundaries.
    """
    if not cue.isalpha() and len(cue) == 1:  # punctuation cues like "?"
        return cue in text
    return re.search(rf"(?<!\w){re.escape(cue)}(?!\w)", text) is not None


def infer(text: str | None) -> Emotion:
    """Guess the mood behind a line Buddy is about to say.

    Order matters: praise beats a trailing question mark, because "Bravo! Come hai
    fatto?" is celebration first and curiosity second.
    """
    if not text:
        return NEUTRAL
    lowered = text.lower()
    for emotion, cues in _CUES:
        if any(_matches(cue, lowered) for cue in cues):
            return emotion
    return NEUTRAL
