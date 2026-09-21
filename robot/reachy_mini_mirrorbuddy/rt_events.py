"""Realtime events; rt_safety owns streaming transcript checks and interruption."""

from __future__ import annotations

import json
import logging
import time
from collections.abc import Callable

from . import rt_messages, session_flow, tools

logger = logging.getLogger(__name__)

# Long speech can start a response before transcription; a later verdict can cut it.
_FAST_PATH_MIN_SPEECH_S = 1.8

# A forgotten wake word must not lock the child out indefinitely.
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
        if await self._handle_safety_output(event):
            return

        if etype in ("session.created", "session.updated"):
            if not self._ready.is_set():
                self._ready.set()
                if self.on_ready:
                    _safe_cb(self.on_ready)
                await self._greet()
            return

        if etype == "response.created":
            if self._safety_awaiting_cancel:
                self._safety_id = (event.get("response") or {}).get("id")
                self._safety_awaiting_cancel = False
                await self._cancel_response()
                return
            if self._quiet or self._asleep:
                await self._cancel_response()
                self._suppress = True
                return
            if self._pending_farewell:  # the goodbye is now starting → sleep once it's done
                self._pending_farewell = False
                self._sleep_after = True
            self._responding = True
            self._suppress = False
            self._begin_safety_response(event)
            return
        if etype == "response.done":
            if not await self._finish_safety_response(event):
                return
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
            if self._safety_user_item and event.get("item_id") != self._safety_user_item:
                return  # Do not apply a previous turn's verdict to the current response.
            self._safety_user_item = None
            text = (event.get("transcript") or "").strip()
            if not text:
                self._partial_user = ""
                self._stopped_on_partial = False
                return
            if not await self._check_user_safety(text):
                self._partial_user = ""
                self._stopped_on_partial = False
                return
            action = session_flow.decide(text, self._asleep, self._rest_expired())
            if self._meditating and action != session_flow.SPEAK:
                # Any request to stop, rest or leave ends the practice at once.
                # Sitting in an imposed silence you have asked to leave is the
                # opposite of what this is for.
                logger.info("Meditation ended by the student: %r", text)
                # Cancel both the silence and its pending bell.
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
            # Also clear hush on deployments without speech_started.
            hushed, self._stopped_on_partial, self._partial_user = (
                self._stopped_on_partial, False, "",
            )
            # The wake word is never swallowed: being called by name outranks any
            # hush already applied for this turn.
            _still_matters = (session_flow.END, session_flow.REST, session_flow.WAKE)
            if hushed and action not in _still_matters:
                return  # already hushed while the student was still speaking
            if action == session_flow.IGNORE:
                return
            if action == session_flow.WAKE:
                self._asleep = self._quiet = False
                if self.on_wake:
                    _safe_cb(self.on_wake)
                await self._request_response(rt_messages.WAKE_INSTR)
                return
            if action == session_flow.END:
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
                # Ordinary turn. If the fast path already asked for the response when
                # speech ended, asking again would make Buddy answer twice.
                if not self._fast_requested:
                    await self._request_response()
            return

        # Barge-in: cancel the turn, drop in-flight audio; each new turn starts un-muted.
        if etype == "input_audio_buffer.speech_started":
            # Clear hush even during rest so the next wake word is not dropped.
            self._partial_user = ""
            self._stopped_on_partial = False
            if self._asleep:
                return  # ignore ambient speech while asleep; wake word handles it
            self._suppress = True
            self._discard_safety_output()
            self._safety_user_item = event.get("item_id")
            self._safety_redirect = None
            self._safety_redirect_next = self._safety_redirecting = False
            self._quiet = False
            self._speech_started_at = time.monotonic()
            self._fast_requested = False
            if self._responding:
                await self._cancel_response()
            if self.on_speech_started:
                _safe_cb(self.on_speech_started)
            return

        if etype == "input_audio_buffer.speech_stopped":
            # Preserve the low-latency path. Transcript safety interrupts rather
            # than delaying speculative speech, matching the web's exposure tradeoff.
            if self._asleep or self._quiet:
                return
            spoken = time.monotonic() - self._speech_started_at
            if self._speech_started_at and spoken >= _FAST_PATH_MIN_SPEECH_S:
                self._fast_requested = True
                await self._request_response()
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
            # The response may finish just before cancellation reaches Azure.
            if isinstance(err, dict) and err.get("code") == "response_cancel_not_active":
                self._responding = False
                await self._send_safety_redirect()
                logger.debug("Cancel arrived after the response ended (harmless)")
                return
            if isinstance(err, dict) and err.get("code") == "conversation_already_has_active_response":
                # The server is still streaming a response we thought was over.
                # Believe it and wait for its response.done, rather than firing
                # requests it will keep rejecting while the child hears nothing.
                self._responding = True
                logger.info("Server still has a response in flight; waiting for it")
                return
            logger.error("Azure Realtime error event: %s", json.dumps(err))
            return

        logger.debug("Unhandled event: %s", etype)

    def _rest_expired(self) -> bool:
        """After the rest timeout, ordinary speech can wake the robot."""
        if not self._asleep:
            return False
        return (time.monotonic() - self._asleep_since) > _REST_MAX_S

    async def _cancel_response(self) -> None:
        """Drop local output immediately; Azure acknowledges via response.done."""
        self._responding = False
        self._discard_safety_output()
        await self._safe_send(rt_messages.CANCEL)

    async def _apply_stop(self, rest: bool) -> None:
        """Cancel even speculative output; only explicit rest parks the robot."""
        self._quiet = True
        self._suppress = True
        if self._responding or self._fast_requested:
            await self._cancel_response()
        # Never carry a cancelled speculative request into the next turn.
        self._fast_requested = False
        if self.on_speech_started:
            _safe_cb(self.on_speech_started)  # flush local playback now
        if not rest:
            return
        self._asleep = True
        if self.on_sleep:
            _safe_cb(self.on_sleep)  # settle into the rest position
