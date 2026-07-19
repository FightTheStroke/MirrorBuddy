"""Pure builders for Azure Realtime protocol messages.

Keeping these here keeps :mod:`azure_realtime` focused on the socket lifecycle.
The event schema differs between the Realtime GA and Preview protocols, so
:func:`session_update` emits the right shape for each.
"""

from __future__ import annotations

import json
import re

SAMPLE_RATE = 24000  # PCM sample rate (in and out)

# Pre-serialised cancel of the model's current response (used on barge-in / stop).
CANCEL = json.dumps({"type": "response.cancel"})

# Stop-intent words. When the student says any of these the robot must go silent
# immediately, deterministically — never relying on the model to choose to yield.
# This is an accessibility requirement: insistence stresses the student.
_STOP_RE = re.compile(
    r"\b(basta|ferma(?:ti|te|lo)?|zitt[oaie]|silenzio|silence|aspetta|"
    r"pausa|stop|taci|smettila|smetti|shh+|sh+t?|"
    r"dormi|dormire|riposati|riposa|spegniti|mettiti\s+a\s+riposo)\b",
    re.IGNORECASE,
)


def is_stop(text: str | None) -> bool:
    """True if the user utterance is a command to stop / be quiet."""
    return bool(text and _STOP_RE.search(text))


# End-of-session intent: the student signals they are done for now. Unlike a stop
# (be quiet a moment), this ends the session — the robot says a short goodbye and
# goes to sleep until it hears its name again. Deterministic, like the stop word.
_END_RE = re.compile(
    r"\b("
    r"(?:abbiamo|ho|hai)\s+(?:finito|terminato|concluso)|"
    r"finito\s+per\s+oggi|basta\s+(?:studiare|compiti|per\s+oggi)|"
    r"a\s+domani|ci\s+vediamo|arrivederci|buonanotte|buona\s+notte|"
    r"abbiamo\s+finito"
    r")\b",
    re.IGNORECASE,
)

# Wake intent: while asleep, only the robot's name (or a clear call) brings it back.
_WAKE_RE = re.compile(r"\b(buddy|svegliati|sei\s+sveglio|ci\s+sei|ehi\s+robot)\b", re.IGNORECASE)


def is_end(text: str | None) -> bool:
    """True if the student is ending the session ('abbiamo finito', 'a domani'...)."""
    return bool(text and _END_RE.search(text))


def is_wake(text: str | None) -> bool:
    """True if the student is calling the robot back from sleep."""
    return bool(text and _WAKE_RE.search(text))


# Spoken cues driven by the model on session end / wake (kept here so the client
# stays focused on socket I/O and the copy is easy to review/translate).
FAREWELL_INSTR = (
    "Lo studente ha detto che avete finito. Salutalo con UNA frase breve, calda e "
    "rassicurante (es. «Bravo, per oggi basta così: riposati, ci vediamo presto!»). "
    "Non fare altre domande, non proporre altro: è un congedo."
)
WAKE_INSTR = (
    "Sei appena stato richiamato. Saluta di nuovo con UNA frase breve e allegra e "
    "chiedi con calma cosa vuole fare adesso."
)


def response_create(instructions: str | None = None) -> dict:
    """Build a ``response.create`` (optionally steering what the model should say)."""
    if instructions:
        return {"type": "response.create", "response": {"instructions": instructions}}
    return {"type": "response.create"}


def session_update(
    instructions: str,
    voice: str,
    turn_detection: dict,
    tools: list[dict] | None,
    use_ga: bool,
) -> dict:
    """Build the ``session.update`` message for the active protocol."""
    if use_ga:
        session: dict = {
            "type": "realtime",
            "instructions": instructions,
            "output_modalities": ["audio"],
            "audio": {
                "input": {
                    "format": {"type": "audio/pcm", "rate": SAMPLE_RATE},
                    "turn_detection": turn_detection,
                    "transcription": {"model": "whisper-1"},
                    "noise_reduction": {"type": "near_field"},
                },
                "output": {
                    "format": {"type": "audio/pcm", "rate": SAMPLE_RATE},
                    "voice": voice,
                },
            },
        }
    else:
        session = {
            "modalities": ["audio", "text"],
            "instructions": instructions,
            "voice": voice,
            "input_audio_format": "pcm16",
            "output_audio_format": "pcm16",
            "input_audio_transcription": {"model": "whisper-1"},
            "turn_detection": turn_detection,
        }
    if tools:
        session["tools"] = tools
        session["tool_choice"] = "auto"
    return {"type": "session.update", "session": session}


def audio_append(b64: str) -> dict:
    return {"type": "input_audio_buffer.append", "audio": b64}


def function_call_output(call_id: str, output: str) -> dict:
    return {
        "type": "conversation.item.create",
        "item": {"type": "function_call_output", "call_id": call_id, "output": output},
    }


def image_message(data_url: str, prompt: str) -> dict:
    return {
        "type": "conversation.item.create",
        "item": {
            "type": "message",
            "role": "user",
            "content": [
                {"type": "input_text", "text": prompt},
                {"type": "input_image", "image_url": data_url},
            ],
        },
    }
