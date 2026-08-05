"""Guided meditation: a bell, and silence that is actually silent.

The hard part of a guided session is not the words, it is the gaps. A language
model asked to "wait" will not wait — it encourages, it checks in, it narrates
the silence out of existence. So the silence is never requested from the model:
the client is muted for the interval, and whatever the model might have produced
cannot reach the room.

The bell is synthesised here rather than shipped as an asset: a struck bell is a
few decaying partials, and generating it keeps the app free of binary files it
would have to license.
"""

from __future__ import annotations

import logging
import math
import struct
import threading
from dataclasses import dataclass

logger = logging.getLogger(__name__)

SAMPLE_RATE = 24000

# A child asked to sit in silence for ten minutes learns that meditation is a
# punishment. A "session" of five seconds teaches nothing at all.
MIN_SILENCE_S = 30.0
MAX_SILENCE_S = 600.0

# Partials of a struck bell: ratios to the fundamental, and how loud each starts.
_PARTIALS = ((1.0, 1.0), (2.0, 0.45), (2.76, 0.3), (5.4, 0.12))
_FUNDAMENTAL_HZ = 432.0
_DECAY = 2.4  # amplitude e-folding: fast enough to breathe, slow enough to ring


def bell_pcm16(seconds: float = 3.0, sample_rate: int = SAMPLE_RATE) -> bytes:
    """Synthesise one strike of an invitation bell as 16-bit mono PCM."""
    n = max(1, int(seconds * sample_rate))
    out = bytearray()
    peak = sum(a for _, a in _PARTIALS)
    for i in range(n):
        t = i / sample_rate
        env = math.exp(-_DECAY * t)
        s = sum(a * math.sin(2 * math.pi * _FUNDAMENTAL_HZ * r * t) for r, a in _PARTIALS)
        # Headroom of 0.7: the bell invites, it does not startle.
        out += struct.pack("<h", int(max(-1.0, min(1.0, s / peak * env)) * 32767 * 0.7))
    return bytes(out)


@dataclass(frozen=True)
class Plan:
    """What a single practice asks of the robot: what to say, and how long to shut up."""

    practice: str
    silence_seconds: float
    opening: str
    closing: str


_PRACTICES: dict[str, tuple[str, str]] = {
    "respiro": (
        "Annuncia in UNA frase che state per stare insieme col respiro, che non deve "
        "cambiarlo né trattenerlo, e che può stare come sta — sdraiato, in carrozzina, "
        "come gli viene comodo. Poi taci: arriva la campana.",
        "La campana ha chiuso la pratica. Fai UNA domanda semplice su com'è andata. "
        "Qualsiasi risposta va bene, anche 'noiosa'. Non commentare la sua esperienza.",
    ),
    "campana": (
        "Annuncia in UNA frase che ascolterete la campana finché il suono non svanisce. "
        "Poi taci.",
        "Chiedi in UNA frase se è riuscito a sentire dove finiva il suono. Nessun giudizio.",
    ),
    "corpo": (
        "Annuncia in UNA frase che saluterete il corpo un pezzo per volta, senza chiedere "
        "a nessuna parte di rilassarsi, e che se una parte fa male la si saluta da lontano. "
        "Poi taci.",
        "Chiedi in UNA frase come stava il corpo oggi. Non interpretare la risposta.",
    ),
    "sassolino": (
        "Annuncia in UNA frase le quattro immagini — fiore, montagna, acqua ferma, spazio "
        "aperto — una per respiro. Poi taci.",
        "Chiedi in UNA frase quale immagine gli è rimasta. Nessuna è quella giusta.",
    ),
}

_DEFAULT_KEY = "respiro"


def build_plan(practice: str, minutes: float) -> Plan:
    """Turn a request into a plan, clamped to what a child can actually sit through."""
    key = (practice or "").strip().lower()
    opening, closing = _PRACTICES.get(key, _PRACTICES[_DEFAULT_KEY])
    seconds = min(MAX_SILENCE_S, max(MIN_SILENCE_S, float(minutes or 0) * 60.0))
    return Plan(practice=key or _DEFAULT_KEY, silence_seconds=seconds,
                opening=opening, closing=closing)


class Session(threading.Thread):
    """Runs one practice: opening cue, bell, real silence, bell, closing cue.

    Interruptible at any point. A child who wants out gets out immediately — the
    thread checks a single event rather than sleeping through the whole interval.
    """

    def __init__(self, client, play_audio, plan: Plan, bell_seconds: float = 3.0):
        super().__init__(name="MirrorBuddyMeditation", daemon=True)
        self._client = client
        self._play = play_audio
        self._plan = plan
        self._bell = bell_pcm16(bell_seconds)
        self._stop = threading.Event()

    def cancel(self) -> None:
        self._stop.set()

    def run(self) -> None:
        try:
            self._wait_for_a_quiet_room()
            self._client.start_meditation()
            self._ring()
            logger.info("Meditation: %s, %.0fs of silence", self._plan.practice,
                        self._plan.silence_seconds)
            self._stop.wait(self._plan.silence_seconds)
            self._ring()
        except Exception as e:  # pragma: no cover - runtime audio/socket faults
            logger.error("Meditation session failed: %s", e, exc_info=True)
        finally:
            # The voice always comes back, even if the session broke halfway:
            # a crash must never leave a child with a robot that stopped answering.
            self._client.end_meditation()
            if not self._stop.is_set():
                self._client.speak_now(self._plan.closing)

    def _wait_for_a_quiet_room(self, timeout: float = 25.0) -> None:
        """Hold the bell until the opening sentence has finished.

        A bell rung over the robot's own voice is not an invitation to silence,
        it is an interruption. Capped, so a response that never completes cannot
        strand the session before it begins.
        """
        waited = 0.0
        while getattr(self._client, "_responding", False) and waited < timeout:
            if self._stop.wait(0.1):
                return
            waited += 0.1

    def _ring(self) -> None:
        if self._stop.is_set():
            return
        try:
            self._play(self._bell)
        except Exception as e:  # pragma: no cover - runtime audio faults
            logger.error("Bell failed to ring: %s", e)
