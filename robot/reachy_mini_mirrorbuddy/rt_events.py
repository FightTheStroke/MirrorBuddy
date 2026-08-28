"""Handling of Azure Realtime protocol events.

Split from the connection itself: :mod:`azure_realtime` owns the socket, the
thread and the sending side; this is the reading side — what each event from the
model means for a child in the room, which is where all the judgement calls live
(when to stop talking, when to answer without waiting, what counts as silence).
"""

from __future__ import annotations

import base64
import json
import logging
import time
from collections.abc import Callable

from . import rt_messages, session_flow, tools

logger = logging.getLogger(__name__)

# How long an utterance must be before its answer plays as it arrives, without
# waiting for the transcript to clear it. Sized against the phrases that must never
# produce a reply — "zitto", "basta", "fermati", "hey buddy" — spoken slowly by a
# child with a motor impairment. Above this, a turn cannot be a bare stop word, so
# holding the audio back would add delay and nothing else. Below it the answer is
# still requested immediately, but stays silent until the transcript arrives. Any
# stop word inside a longer sentence is still caught: the transcript lands a moment
# later and cancels the response in flight.
_FAST_PATH_MIN_SPEECH_S = 1.8

# How long the robot believes the server when it says an answer is still
# streaming. A cancelled response never reports that it ended, so without a bound
# the robot would wait for ever and answer nothing again until it was restarted.
# Longer than any real answer, short enough that a child does not give up.
_RESPONSE_STUCK_S = 20.0

# How long a deliberate rest lasts before ordinary conversation resumes. Long
# enough to be a real silence, short enough that a forgotten wake word costs a
# coffee break and not an adult with an SSH session.
_REST_MAX_S = 600.0


def _safe_cb(cb: Callable, *args) -> None:
    try:
        cb(*args)
    except Exception as e:  # pragma: no cover
        logger.debug("callback error: %s", e)


class RealtimeEventsMixin:
    """Event handling for :class:`~reachy_mini_mirrorbuddy.azure_realtime.AzureRealtimeClient`."""

    async def _handle_event(self, event: dict) -> None:
        etype = event.get("type", "")

        if etype in ("session.created", "session.updated"):
            if not self._ready.is_set():
                self._ready.set()
                if self.on_ready:
                    _safe_cb(self.on_ready)
                await self._greet()
            return

        if etype in ("response.output_audio.delta", "response.audio.delta"):
            if self._suppress:
                return  # dropped: user barged in, this response is being cancelled
            b64 = event.get("delta") or event.get("audio")
            if not b64:
                return
            if self._gated:
                # Prepared, not yet permitted. The transcript has not said whether
                # this turn was a question or "basta"; until it does, nothing is
                # heard. Kept in order so the sentence plays back intact.
                self._gated_audio.append(base64.b64decode(b64))
                return
            if self.on_output_audio:
                _safe_cb(self.on_output_audio, base64.b64decode(b64))
            return

        if etype == "response.created":
            if self._cancelled_unconfirmed:
                # This confirms an answer the child already walked away from: it was
                # asked for, then abandoned before the server said it existed, so the
                # CANCEL was rejected as "not active". Now it is active — cancel it
                # for real, and do not let this event un-mute it on the way past.
                self._cancelled_unconfirmed = False
                self._responding = True
                self._suppress = True
                await self._cancel_response()
                return
            if self._quiet or self._asleep:
                self._responding = True  # it exists now: the CANCEL will be accepted
                await self._cancel_response()
                self._suppress = True
                return
            if self._pending_farewell:  # the goodbye is now starting → sleep once it's done
                self._pending_farewell = False
                self._sleep_after = True
            self._responding = True
            self._suppress = False
            return
        if etype == "response.done":
            self._responding = False
            if self._sleep_after:  # farewell just finished → go to sleep
                self._sleep_after = False
                self._asleep = True
                if self.on_sleep:
                    _safe_cb(self.on_sleep)
            return

        # "Zitto" cannot wait for the full transcription pass. A child who asks for
        # silence and is answered anyway is a child being talked over, so the partial
        # transcript is read as it streams and the hush fires on the first words.
        if etype.endswith("input_audio_transcription.delta"):
            if self._asleep or self._stopped_on_partial:
                return
            self._partial_user += event.get("delta") or ""
            if rt_messages.is_stop(self._partial_user):
                self._stopped_on_partial = True
                await self._apply_stop(rest=rt_messages.is_rest(self._partial_user))
            return

        # Student's speech transcribed: honour stop / end / wake intents deterministically.
        if etype.endswith("input_audio_transcription.completed"):
            text = (event.get("transcript") or "").strip()
            if not text:
                return
            action = session_flow.decide(text, self._asleep, self._rest_expired())
            if self._meditating and action != session_flow.SPEAK:
                # Any request to stop, rest or leave ends the practice at once.
                # Sitting in an imposed silence you have asked to leave is the
                # opposite of what this is for.
                logger.info("Meditation ended by the student: %r", text)
                # Both halves matter. Clearing the flag gives the voice back;
                # cancelling the session stops the bell that would otherwise
                # ring at a child who has already asked to be left alone.
                running = getattr(self, "_meditation", None)
                if running is not None:
                    running.cancel()
                self.end_meditation()
            if self._asleep:
                # The single most useful line in the journal: it says what the robot
                # actually heard while it was silent, and what it made of it.
                logger.info("Resting — heard %r → %s", text, action)
                if action != session_flow.IGNORE:
                    self._asleep = False
            # The hush belongs to the turn that triggered it. Deployments that emit
            # partials but no speech_started have nothing else to clear it, and a
            # flag that outlives its turn silences every turn after it.
            hushed, self._stopped_on_partial, self._partial_user = (
                self._stopped_on_partial, False, "",
            )
            # The wake word is never swallowed: being called by name outranks any
            # hush already applied for this turn.
            _still_matters = (session_flow.END, session_flow.REST, session_flow.WAKE)
            if hushed and action not in _still_matters:
                await self._drop_speculative()
                return  # already hushed while the student was still speaking
            if action == session_flow.IGNORE:
                await self._drop_speculative()
                return
            if action == session_flow.WAKE:
                await self._drop_speculative()
                self._asleep = self._quiet = False
                if self.on_wake:
                    _safe_cb(self.on_wake)
                await self._request_response(rt_messages.WAKE_INSTR)
                return
            if action == session_flow.END:
                self._clear_gate()
                self._pending_farewell = True
                self._suppress = self._quiet = False
                if self._responding or self._fast_requested:
                    await self._cancel_response()
                await self._request_response(rt_messages.FAREWELL_INSTR)
                return
            if action in (session_flow.REST, session_flow.PAUSE):
                logger.info("%s requested by %r", action.upper(), text)
                await self._apply_stop(rest=action == session_flow.REST)
                return
            if action == session_flow.SPEAK:
                # A pause lifts on the next thing the student says, even where the
                # deployment never emits speech_started to clear the flag for us.
                self._quiet = False
                # The turn was ordinary speech: whatever was prepared may be heard.
                self._release_gate()
                # Ordinary turn. If the fast path already asked for the response when
                # speech ended, asking again would make Buddy answer twice.
                if not self._fast_requested:
                    await self._request_response()
            return

        # Barge-in: cancel the turn, drop in-flight audio; each new turn starts un-muted.
        if etype == "input_audio_buffer.speech_started":
            # Clear the per-turn hush flags first, asleep or not: they used to
            # survive a rest, and the next transcript — even "Buddy" — was then
            # dropped before the wake word was ever read. The robot could only be
            # revived by restarting the app.
            self._partial_user = ""
            self._stopped_on_partial = False
            self._clear_gate()
            if self._asleep:
                return  # ignore ambient speech while asleep; wake word handles it
            self._suppress = True
            self._quiet = False
            self._speech_started_at = time.monotonic()
            if self._responding or self._fast_requested:
                # The fast path may have asked for an answer that the server has not
                # confirmed yet. Left alone it is created after this barge-in and
                # spoken over the turn the child has just started.
                await self._cancel_response()
            self._fast_requested = False
            if self.on_speech_started:
                _safe_cb(self.on_speech_started)
            return

        if etype == "input_audio_buffer.speech_stopped":
            # The server no longer auto-creates responses, so we normally wait for the
            # transcript before asking for one — that is a whole extra Whisper pass in
            # series on every single turn, and the child feels every millisecond of it.
            #
            # We only need the transcript to catch "zitto"/"basta"/"buddy", and those
            # are always brief. So a clearly long utterance can't be one: ask for the
            # answer straight away. Anything short keeps the safe, slower path.
            if self._asleep or self._quiet:
                return
            spoken = time.monotonic() - self._speech_started_at
            # Either way the answer is asked for now, so the model's own latency
            # runs alongside the transcription instead of after it. A turn long
            # enough that it cannot be a stop word plays as it arrives; a short one
            # is held back until the transcript clears it.
            if not (self._speech_started_at and spoken >= _FAST_PATH_MIN_SPEECH_S):
                self._hold_output()
            self._fast_requested = True
            await self._request_response()
            return

        if etype in ("response.output_audio_transcript.delta", "response.audio_transcript.delta"):
            # The final transcript only lands once the sentence is already spoken —
            # far too late to colour the body language. The opening words carry the
            # mood ("Bravo!", "Fammi pensare..."), so react to the first delta.
            delta = event.get("delta") or ""
            if delta and self.on_transcript:
                _safe_cb(self.on_transcript, delta, False)
            return

        if etype in ("response.output_audio_transcript.done", "response.audio_transcript.done"):
            text = event.get("transcript") or ""
            if text and self.on_transcript:
                _safe_cb(self.on_transcript, text, True)
            return

        if etype == "response.output_item.added":
            item = event.get("item") or {}
            if item.get("type") == "function_call":
                cid = item.get("call_id") or item.get("id") or ""
                if cid:
                    self._fc_names[cid] = item.get("name") or ""
            return

        if etype == "response.function_call_arguments.done":
            call_id = event.get("call_id") or ""
            name, args = tools.parse_call_arguments(event, self._fc_names.get(call_id, ""))
            self._fc_names.pop(call_id, None)
            logger.info("Tool call: %s(%s) call_id=%s", name, args, call_id)
            if name and self.on_tool_call:
                _safe_cb(self.on_tool_call, name, args, call_id)
            return

        if etype == "error":
            err = event.get("error", event)
            # Benign race: we ask to cancel the response the instant the child speaks
            # over Buddy, but the response may have finished on its own just before the
            # CANCEL lands. Nothing is broken, so it must not look like a failure in
            # the logs — real errors have to stay visible.
            if isinstance(err, dict) and err.get("code") == "response_cancel_not_active":
                self._responding = False
                logger.debug("Cancel arrived after the response ended (harmless)")
                return
            if isinstance(err, dict) and err.get("code") == "conversation_already_has_active_response":
                # The server is still streaming a response we thought was over.
                # Believe it and wait for its response.done, rather than firing
                # requests it will keep rejecting while the child hears nothing.
                self._responding = True
                # Our request was refused, so no response.created is coming for it.
                # A note left standing here would silence the next real answer.
                self._cancelled_unconfirmed = False
                logger.info("Server still has a response in flight; waiting for it")
                return
            logger.error("Azure Realtime error event: %s", json.dumps(err))
            return

        logger.debug("Unhandled event: %s", etype)

    @property
    def _responding(self) -> bool:
        return getattr(self, "_responding_flag", False)

    @_responding.setter
    def _responding(self, value: bool) -> None:
        """Remember when an answer started, so a wait for it can be given up on."""
        if value and not getattr(self, "_responding_flag", False):
            self._responding_since = time.monotonic()
        self._responding_flag = bool(value)

    def _responding_is_stale(self) -> bool:
        """True when the answer we are waiting for cannot still be arriving.

        A cancelled response is never reported as finished, so believing the
        server for ever leaves the child talking to a robot that has quietly
        stopped answering. Past the bound the next question wins.
        """
        if not self._responding:
            return False
        return (time.monotonic() - getattr(self, "_responding_since", 0.0)) > _RESPONSE_STUCK_S

    def _rest_expired(self) -> bool:
        """True when the robot has been resting longer than the silence was worth.

        A rest is a request for quiet, not a lock. Past the timeout the next thing
        the student says is answered normally — no child should have to remember a
        magic word to get his robot back.
        """
        if not self._asleep:
            return False
        return (time.monotonic() - self._asleep_since) > _REST_MAX_S

    async def _cancel_response(self) -> None:
        """Cancel the response in flight and forget it.

        The server will not accept a new response while it believes one is still
        streaming, and a cancelled response never emits ``response.done``, so the
        flag has to be cleared here or the next turn would stay silent.

        Cancelling an answer that has been asked for but not yet confirmed is
        remembered: the server rejects that CANCEL and creates the answer anyway,
        so ``response.created`` has to cancel it a second time instead of treating
        it as wanted.
        """
        if not self._responding:
            self._cancelled_unconfirmed = True
        self._responding = False
        await self._safe_send(rt_messages.CANCEL)

    def _hold_output(self) -> None:
        """Start preparing an answer that may not be wanted; hold back its voice."""
        self._gated = True
        self._gated_audio = []

    def _clear_gate(self) -> None:
        """Forget a held answer without ever playing it."""
        self._gated = False
        self._gated_audio = []

    def _release_gate(self) -> None:
        """Let a held answer be heard, in the order it arrived."""
        held = self._gated_audio
        self._gated = False
        self._gated_audio = []
        if self.on_output_audio:
            for chunk in held:
                _safe_cb(self.on_output_audio, chunk)

    async def _drop_speculative(self) -> None:
        """Throw away an answer prepared before the transcript said it was wanted.

        The response is still being generated, so it is cancelled as well as
        silenced: without that, clearing the gate would let the rest of it through.
        """
        if not self._gated:
            return
        self._clear_gate()
        self._suppress = True
        if self._responding or self._fast_requested:
            await self._cancel_response()
        self._fast_requested = False

    async def _apply_stop(self, rest: bool) -> None:
        """Stop talking now; go to sleep only if the silence was asked for deliberately.

        ``rest=True`` ("zitto", "dormi") parks the robot: quiet, in the rest posture,
        and awake again only when the child calls it by name. ``rest=False``
        ("aspetta") just drops the current sentence — the next turn is answered
        normally, because everyday filler must not cost the wake word.

        Either way the in-flight response is cancelled, including one requested by
        the fast path before the transcript arrived: the hush wins even when it ends
        a long sentence.
        """
        self._quiet = True
        self._suppress = True
        self._clear_gate()
        if self._responding or self._fast_requested:
            await self._cancel_response()
        # The fast path belongs to the turn that was just cancelled. Left standing,
        # it makes the *next* turn think its answer was already requested — so the
        # first thing said after waking up is answered by silence.
        self._fast_requested = False
        if self.on_speech_started:
            _safe_cb(self.on_speech_started)  # flush local playback now
        if not rest:
            return
        self._asleep = True
        if self.on_sleep:
            _safe_cb(self.on_sleep)  # settle into the rest position
