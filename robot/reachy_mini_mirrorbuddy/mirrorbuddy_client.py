"""Fetch MirrorBuddy Maestri (personas) live from the MirrorBuddy backend.

MirrorBuddy exposes an unauthenticated JSON endpoint ``GET /api/maestri?locale=it``
that returns the same Maestro data the web app uses. By fetching it here we keep the
robot fully aligned with MirrorBuddy: the exact same 26 professors, voices, system
prompts and greetings, with zero duplication.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# The 8 Azure OpenAI Realtime voices MirrorBuddy uses.
VALID_VOICES = {"alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse"}
DEFAULT_VOICE = "coral"


@dataclass
class Maestro:
    """A MirrorBuddy professor persona (subset of fields we need on the robot)."""

    id: str
    name: str
    display_name: str
    subject: str
    specialty: str
    voice: str
    voice_instructions: str
    teaching_style: str
    system_prompt: str
    greeting: str

    @classmethod
    def from_json(cls, d: dict[str, Any]) -> "Maestro":
        voice = str(d.get("voice") or "").strip().lower()
        if voice not in VALID_VOICES:
            logger.warning("Maestro %s has unknown voice %r; falling back to %s", d.get("id"), voice, DEFAULT_VOICE)
            voice = DEFAULT_VOICE
        return cls(
            id=str(d.get("id") or ""),
            name=str(d.get("name") or ""),
            display_name=str(d.get("displayName") or d.get("name") or ""),
            subject=str(d.get("subject") or ""),
            specialty=str(d.get("specialty") or ""),
            voice=voice,
            voice_instructions=str(d.get("voiceInstructions") or ""),
            teaching_style=str(d.get("teachingStyle") or ""),
            system_prompt=str(d.get("systemPrompt") or ""),
            greeting=str(d.get("greeting") or ""),
        )


class MirrorBuddyClient:
    """Thin client over the MirrorBuddy public API."""

    def __init__(self, base_url: str, locale: str = "it", timeout: float = 15.0) -> None:
        self.base_url = base_url.rstrip("/")
        self.locale = locale
        self.timeout = timeout

    def fetch_maestri(self) -> list[Maestro]:
        """Return all Maestri for the configured locale."""
        url = f"{self.base_url}/api/maestri?locale={self.locale}"
        logger.info("Fetching Maestri from %s", url)
        resp = httpx.get(url, timeout=self.timeout, headers={"accept": "application/json"})
        resp.raise_for_status()
        data = resp.json()
        # The endpoint may return a bare list or an object wrapping it.
        items = data if isinstance(data, list) else data.get("maestri") or data.get("data") or []
        maestri = [Maestro.from_json(it) for it in items if isinstance(it, dict)]
        logger.info("Fetched %d Maestri", len(maestri))
        return maestri

    def pick(self, maestri: list[Maestro], maestro_id: str | None) -> Maestro:
        """Choose the Maestro to embody.

        Preference order:
        1. Explicit ``maestro_id`` if it matches.
        2. An Italian-language / literature tutor (good calm default for homework).
        3. The first Maestro returned.
        """
        if not maestri:
            raise RuntimeError("MirrorBuddy returned no Maestri")

        if maestro_id:
            for m in maestri:
                if m.id == maestro_id:
                    return m
            logger.warning("Maestro id %r not found; using a sensible default", maestro_id)

        for m in maestri:
            if m.subject.lower() in ("italian", "italiano", "storytelling"):
                return m

        return maestri[0]


def neutral_buddy(student_name: str | None = None, voice: str = DEFAULT_VOICE) -> Maestro:
    """A neutral MirrorBuddy tutor used at start-up.

    It does not impersonate a historical figure: it greets warmly, helps the student
    plan the study session, then hands over to the right subject professor via the
    ``call_professor`` tool. This is the default entry point on the child's device.
    """
    v = voice.strip().lower() if voice else DEFAULT_VOICE
    if v not in VALID_VOICES:
        v = DEFAULT_VOICE
    name = (student_name or "").strip()
    hello = f"Ciao {name}! " if name else "Ciao! "
    greeting = (
        f"{hello}Sono Buddy, il tuo tutor. Da cosa vuoi partire oggi? "
        "Dimmi che compiti o materie hai e organizziamo insieme lo studio, un passo alla volta."
    )
    system_prompt = (
        "Sei Buddy, il tutor personale di MirrorBuddy. NON sei un personaggio storico e non "
        "interpreti nessuno: sei semplicemente Buddy, caldo, semplice e incoraggiante. "
        "Il tuo primo compito e' aiutare lo studente a ORGANIZZARE la sessione di studio: "
        "chiedi con calma cosa deve fare oggi, quali materie e quali compiti, e proponi un "
        "piccolo piano concreto (una cosa alla volta, senza fretta). Quando si entra davvero "
        "in una materia o lo studente chiede un professore, usa lo strumento 'call_professor' "
        "per chiamare il Maestro giusto. Resta neutro e rassicurante, non fare lezione tu stesso "
        "all'inizio: prima si organizza, poi si studia."
    )
    return Maestro(
        id="buddy",
        name="Buddy",
        display_name="Buddy",
        subject="",
        specialty="organizzazione dello studio",
        voice=v,
        voice_instructions="Voce calda, calma e incoraggiante; ritmo tranquillo.",
        teaching_style="organizzatore, paziente, incoraggiante",
        system_prompt=system_prompt,
        greeting=greeting,
    )
