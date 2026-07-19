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
STOP = "stop"  # "basta" → go silent immediately (transient)
SPEAK = "speak"  # ordinary turn → let the model answer


def decide(text: str, asleep: bool) -> str:
    """Classify a final transcript into the action the client should take.

    Order matters: while asleep only the wake word matters; otherwise an
    end-of-session intent takes precedence over a plain stop, which takes
    precedence over a normal turn.
    """
    if asleep:
        return WAKE if rt_messages.is_wake(text) else IGNORE
    if rt_messages.is_end(text):
        return END
    if rt_messages.is_stop(text):
        return STOP
    return SPEAK
