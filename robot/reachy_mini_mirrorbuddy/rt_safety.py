"""Transcript safety at the speaker boundary, for both Realtime protocols.

Unlike the web's post-playback cancellation, PCM is held until response.done
and every audio part's final transcript pass. This adds a full-response delay.
Transcription accuracy is still Azure's responsibility: this cannot recognize
unsafe sounds missing from the transcript. Crisis events are local logs only,
not the web's authenticated human-escalation service.
"""

from __future__ import annotations

import base64
import binascii
import logging

from . import rt_messages
from .transcript_safety import (
    TranscriptSafetyResult, check_assistant_transcript, check_user_transcript,
    get_redirect_message,
)

logger = logging.getLogger(__name__)
MAX_AUDIO_BYTES = rt_messages.SAMPLE_RATE * 2 * 60
MAX_TRANSCRIPT_CHARS = 32_000
_AUDIO = ("response.audio.delta", "response.output_audio.delta")
_PARTIAL = ("response.audio_transcript.delta", "response.output_audio_transcript.delta")
_FINAL = ("response.audio_transcript.done", "response.output_audio_transcript.done")


class RealtimeSafetyMixin:
    """Single live response, invalidated on cancellation and reconnect."""

    def _reset_safety(self) -> None:
        self._safety_id: str | None = None
        self._safety_audio: list[bytes] = []
        self._safety_parts: set[tuple[str, int]] = set()
        self._safety_text: dict[tuple[str, int], str] = {}
        self._safety_size = 0
        self._safety_done = False
        self._safety_blocked = True
        self._safety_user_pending = False
        self._safety_user_item: str | None = None
        self._safety_redirect: str | None = None
        self._safety_redirect_next = False
        self._safety_redirecting = False
        self._safety_awaiting_cancel = False

    def _discard_safety_output(self) -> None:
        self._safety_audio.clear()
        self._safety_parts.clear()
        self._safety_text.clear()
        self._safety_size = 0
        self._safety_done = False
        self._safety_blocked = True

    def _begin_safety_response(self, event: dict) -> None:
        self._discard_safety_output()
        self._safety_id = (event.get("response") or {}).get("id")
        self._safety_blocked = False
        self._safety_redirecting = self._safety_redirect_next
        self._safety_redirect_next = False

    def _safety_matches(self, event: dict, terminal: bool = False) -> bool:
        rid = ((event.get("response") or {}).get("id") if terminal
               else event.get("response_id"))
        return rid == self._safety_id

    async def _check_user_safety(self, text: str) -> bool:
        self._safety_user_pending = False
        self._safety_redirecting = False
        result = check_user_transcript(text)
        if result.action_taken != "allow":
            await self._intervene_safety(result)
            return False
        return True

    async def _intervene_safety(self, result: TranscriptSafetyResult) -> None:
        # Never log the child's words, including at the intervention checkpoint.
        logger.warning("Voice safety intervention", extra={
            "eventId": "VCE-004", "detectedSeverity": result.severity,
            "flaggedPatterns": result.flagged_patterns, "actionTaken": result.action_taken,
            "humanEscalationAvailable": False,
        })
        active = self._responding
        pending = self._fast_requested and not active and not self._safety_done
        repeated = self._safety_redirecting
        self._suppress = True
        self._discard_safety_output()
        self._fast_requested = False
        self._pending_farewell = self._sleep_after = False
        if self.on_speech_started:
            try:
                self.on_speech_started()
            except Exception:
                logger.exception("Safety playback flush failed")
        if active:
            await self._cancel_response()
        if repeated:
            logger.error("Safety redirect rejected; remaining silent")
            return
        self._safety_redirect = get_redirect_message(result.flagged_patterns)
        self._safety_awaiting_cancel = pending
        # Wait for the cancellation acknowledgement, not a concurrent response.create.
        if not active and not pending:
            await self._send_safety_redirect()

    async def _send_safety_redirect(self) -> None:
        message, self._safety_redirect = self._safety_redirect, None
        if message and not (self._quiet or self._asleep or self._meditating):
            self._safety_redirect_next = True
            await self._request_response(message)

    async def _handle_safety_output(self, event: dict) -> bool:
        etype = event.get("type", "")
        if etype not in (*_AUDIO, *_PARTIAL, *_FINAL):
            return False
        if self._suppress or self._safety_blocked or not self._safety_matches(event):
            return True
        if etype in _PARTIAL:
            return True  # Web checks completed transcripts; partial words are not verdicts.
        key = (event.get("item_id") or "", event.get("content_index") or 0)
        if etype in _AUDIO:
            try:
                pcm = base64.b64decode(event.get("delta") or event.get("audio") or "", validate=True)
            except (ValueError, TypeError, binascii.Error):
                await self._fail_safety("Invalid PCM encoding")
                return True
            self._safety_size += len(pcm)
            if self._safety_size > MAX_AUDIO_BYTES:
                await self._fail_safety("Audio safety buffer exceeded")
                return True
            self._safety_parts.add(key)
            self._safety_audio.append(pcm)
        else:
            text = event.get("transcript") or ""
            self._safety_text[key] = text
            if sum(map(len, self._safety_text.values())) > MAX_TRANSCRIPT_CHARS:
                await self._fail_safety("Transcript safety buffer exceeded")
                return True
            result = check_assistant_transcript(text)
            if result.action_taken == "reject":
                await self._intervene_safety(result)
        return True

    async def _fail_safety(self, reason: str) -> None:
        logger.error("%s; dropping response", reason)
        self._suppress = True
        self._discard_safety_output()
        if self._responding:
            await self._cancel_response()

    async def _finish_safety_response(self, event: dict) -> bool:
        if not self._safety_matches(event, terminal=True):
            return False
        self._responding = False
        if self._safety_redirect:
            await self._send_safety_redirect()
        if (event.get("response") or {}).get("status") != "completed":
            self._discard_safety_output()
            return True
        self._safety_done = True
        await self._release_safety_output()
        return True

    async def _release_safety_output(self) -> None:
        if not self._safety_done or self._safety_user_pending or self._safety_blocked:
            return
        if self._suppress or self._quiet or self._asleep:
            self._discard_safety_output()
            return
        if next((True for key in self._safety_parts
                 if not self._safety_text.get(key, "").strip()), False):
            await self._fail_safety("Audio has no completed nonempty transcript")
            return
        # A phrase split over content parts must not evade the completed-response check.
        result = check_assistant_transcript(" ".join(self._safety_text.values()))
        if result.action_taken == "reject":
            await self._intervene_safety(result)
            return
        audio, texts = self._safety_audio[:], tuple(self._safety_text.values())
        self._discard_safety_output()
        try:
            for text in texts:
                if text and self.on_transcript:
                    self.on_transcript(text, True)
            for pcm in audio:
                if self._suppress:  # on-device barge-in can run on the mic thread
                    break
                if self.on_output_audio:
                    self.on_output_audio(pcm)
        except Exception:
            logger.exception("Checked response playback failed")
