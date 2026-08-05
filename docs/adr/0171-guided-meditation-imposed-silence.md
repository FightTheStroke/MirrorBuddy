# ADR 0171: Guided meditation as an imposed silence, not a conversation

- **Status**: Accepted
- **Date**: 2026-08-05
- **Deciders**: Roberto D'Angelo

## Context

Fratello Loto is the 27th Maestro: a mindfulness teacher in the tradition of
Thich Nhat Hanh. Unlike every other Maestro, his value is not in what he says.
It is in the pauses between what he says.

That is a problem, because every part of the voice stack is built to eliminate
silence. The realtime session hears a pause and offers to help. The robot hears
a pause and asks if you are still there. A child breathing in for four counts
looks, to the system, exactly like a child who has lost interest.

A first attempt simply told the model to "leave long pauses". It did not work
and could not: the pauses are not the model's to give. They are produced by the
turn-taking machinery underneath it.

## Decision

A meditation is a **session object that imposes silence on the stack**, not a
prompt that asks for it.

1. **`meditation.Session` owns the clock.** `build_plan()` turns a requested
   duration into a sequence of cues and gaps (clamped to 30 s–600 s: shorter is
   not a meditation, longer loses a child). A background thread speaks each cue
   at its appointed second.
2. **The rest of the stack is muted, not asked to be quiet.** For the duration,
   the VAD does not trigger a response and the robot does not fill silence.
3. **The bell waits for a quiet room.** `_wait_for_a_quiet_room()` polls until
   the maestro has finished his opening words before striking, capped at 25 s so
   a stuck flag cannot swallow the session. Ringing over the opening line was the
   first bug found, and it made the whole thing feel cheap.
4. **The voice is always restored in a `finally`.** Whatever happens — an error,
   an interruption, a hangup — the session cannot leave the robot mute. This is
   the same class of defect as the rest trap (ADR 0170): a state with no
   guaranteed exit.
5. **The web mirrors the robot's semantics** (`lib/meditation/session.ts` +
   `browser.ts`), so a meditation feels the same on a screen and on the device.

## Consequences

**Good**

- Silence is guaranteed by construction rather than requested politely.
- The 432 Hz bell is synthesised locally (partials at 864 and 1192 Hz, clean
  exponential decay, peak 0.618 so it never clips) — no asset, no network, no
  latency at the moment it matters most.
- The `finally` discipline means a failed meditation degrades to a normal
  conversation, never to a frozen robot.

**Bad / accepted**

- Meditation is a genuinely special case in the voice stack. Anyone changing
  turn-taking must now consider it. The tests in `robot/tests/test_meditation.py`
  and `lib/meditation/__tests__/` exist to make that failure loud.
- Deferred arming means a meditation requested mid-sentence starts after the
  current response finishes, not instantly. That delay is correct: cutting the
  maestro off mid-word to begin a calming exercise is its own small violence.

## References

- ADR 0170 — Reachy Mini robot embodiment (and the rest trap)
- https://plumvillage.org/about/thich-nhat-hanh
