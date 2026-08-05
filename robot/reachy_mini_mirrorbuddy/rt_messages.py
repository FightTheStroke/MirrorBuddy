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

# Hush intents come in two tiers, because the cost of getting them wrong differs.
#
# REST is deliberate: "zitto", "dormi". The robot goes silent and stays asleep
# until the child calls it by name. Honouring it instantly is an accessibility
# requirement — insistence stresses the student.
#
# PAUSE is everyday filler: "aspetta", "basta", "un attimo". It stops the current
# sentence and nothing more; the next thing the child says is answered normally.
# These words are far too common in ordinary Italian ("aspetta che scrivo") to
# cost the wake word — a robot that needs its name after "aspetta" reads as broken.
_REST_RE = re.compile(
    r"\b(zitt[oaie]|silenzio|silence|taci|smettila|smetti|shh+|sh+t?|"
    r"dormi|dormire|riposati|riposa|spegniti|mettiti\s+a\s+riposo)\b",
    re.IGNORECASE,
)

_PAUSE_RE = re.compile(
    r"\b(basta|ferma(?:ti|te|lo)?|aspetta|attendi|pausa|stop|"
    r"un\s+attimo|un\s+momento)\b",
    re.IGNORECASE,
)


def is_rest(text: str | None) -> bool:
    """True if the student deliberately asked for silence ('zitto', 'dormi')."""
    return bool(text and _REST_RE.search(text))


def is_pause(text: str | None) -> bool:
    """True if the student asked the robot to hold on a moment ('aspetta')."""
    return bool(text and not is_rest(text) and _PAUSE_RE.search(text))


def is_stop(text: str | None) -> bool:
    """True for either tier: the robot must stop talking right now."""
    return is_rest(text) or is_pause(text)


# End-of-session intent: the student signals they are done for now. Unlike a stop
# (be quiet a moment), this ends the session — the robot says a short goodbye and
# goes to sleep until it hears its name again. Deterministic, like the stop word.
_DONE_RE = re.compile(
    r"\b("
    r"(?:abbiamo|ho|hai)\s+(?:finito|terminato|concluso)|"
    r"finito\s+per\s+oggi|basta\s+(?:studiare|compiti|per\s+oggi)"
    r")\b",
    re.IGNORECASE,
)

# Farewells only end the session when they actually close the utterance: "ci
# vediamo dopo pranzo" is a plan, not a goodbye.
_BYE_RE = re.compile(
    r"\b(a\s+domani|ci\s+vediamo|ci\s+sentiamo|arrivederci|"
    r"buonanotte|buona\s+notte)\W*$",
    re.IGNORECASE,
)

# Wake intent. Being generous here costs nothing: the pattern is only consulted
# while the robot is already resting, where the worst case is answering a child
# who wanted silence — against a child locked out of his robot altogether.
# An Italian "Buddy" comes back from Whisper as badi, bady, baddy, boddy, buddi...
_WAKE_RE = re.compile(r"\bb[uoae]dd?(?:y|i|ie)\b", re.IGNORECASE)

# The name is not the only way back. A child who has forgotten the magic word
# still says the obvious thing — "puoi parlare?", "ci sei?" — and that has to work.
_RESUME_RE = re.compile(
    r"\b(sveglia(?:ti)?|riprendi|ricominciamo|torna|ritorna|"
    r"puoi\s+(?:parlare|rispondere|tornare)|parla\s+(?:pure|di\s+nuovo)|"
    r"ci\s+sei|mi\s+senti|rispondimi)\b",
    re.IGNORECASE,
)


def is_end(text: str | None) -> bool:
    """True if the student is ending the session ('abbiamo finito', 'a domani'...)."""
    if not text:
        return False
    return bool(_DONE_RE.search(text) or _BYE_RE.search(text))


def is_wake(text: str | None) -> bool:
    """True if the student is calling the robot back from sleep."""
    return bool(text and _WAKE_RE.search(text))


def is_resume(text: str | None) -> bool:
    """True if the student asked the robot to speak again without using its name."""
    return bool(text and _RESUME_RE.search(text))


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
