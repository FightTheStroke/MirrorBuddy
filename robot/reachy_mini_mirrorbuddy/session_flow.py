"""Pure session-flow decisions for the live voice loop.

Given a final user transcript and whether the robot is currently asleep, decide
what the realtime client should do. Keeping this pure (no I/O, no sockets) makes
the stop / end / wake behaviour — which is accessibility-critical — easy to unit
test in isolation from Azure.
"""

from __future__ import annotations

from . import rt_messages

IGNORE = "ignore"  # asleep and not addressed → do nothing
WAKE = "wake"  # asleep + wake word → resume and greet again
END = "end"  # "abbiamo finito" → say a short goodbye, then sleep
REST = "rest"  # "zitto" / "dormi" → silent AND asleep until called by name
PAUSE = "pause"  # "aspetta" → stop this sentence, stay awake for the next one
SPEAK = "speak"  # ordinary turn → let the model answer


def decide(text: str, asleep: bool, rest_expired: bool = False) -> str:
    """Classify a final transcript into the action the client should take.

    Order matters: while asleep only a call for the robot matters; otherwise an
    end-of-session intent takes precedence over a deliberate rest, which takes
    precedence over a transient pause, which takes precedence over a normal turn.

    ``rest_expired`` means the robot has been resting long enough that the silence
    has served its purpose. It then classifies the turn as if it were awake, so a
    forgotten wake word can never strand the student.
    """
    if asleep and not rest_expired:
        return WAKE if rt_messages.is_wake(text) or rt_messages.is_resume(text) else IGNORE
    if rt_messages.is_end(text):
        return END
    if rt_messages.is_rest(text):
        return REST
    if rt_messages.is_pause(text):
        return PAUSE
    return SPEAK
