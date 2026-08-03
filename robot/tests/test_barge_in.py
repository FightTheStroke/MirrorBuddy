"""Tests for the on-device (local) barge-in used to cut Buddy off the instant the
child speaks.

Why it matters for the child: waiting for the server's ``speech_started`` round-trip
leaves a noticeable tail of speech after "basta". Because the Reachy Mini mic is
echo-cancelled in hardware, mic energy while Buddy is speaking is a real voice, so we
can flush playback locally and immediately. These tests cover the client-side hook in
isolation (no hardware, no network).
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from reachy_mini_mirrorbuddy import rt_messages  # noqa: E402
from reachy_mini_mirrorbuddy.azure_realtime import AzureRealtimeClient  # noqa: E402


def _client() -> AzureRealtimeClient:
    return AzureRealtimeClient(
        ws_url="wss://example/invalid",
        api_key="",
        instructions="",
        voice="alloy",
        turn_detection={},
    )


class TestLocalBargeIn:
    def test_suppresses_in_flight_audio(self):
        c = _client()
        assert c._suppress is False
        c.local_barge_in()
        assert c._suppress is True  # any queued audio deltas are now dropped

    def test_stays_unmuted_for_a_normal_turn(self):
        c = _client()
        c._quiet = True
        c.local_barge_in()
        # A normal turn must not stay muted; a stop word re-mutes via the transcript path.
        assert c._quiet is False

    def test_sends_cancel_only_while_responding(self):
        sent: list[str] = []
        c = _client()
        c._enqueue = lambda msg: sent.append(msg)  # type: ignore[assignment]

        c._responding = False
        c.local_barge_in()
        assert sent == []  # nothing to cancel

        c._responding = True
        c.local_barge_in()
        assert sent == [rt_messages.CANCEL]  # cancel the active response

    def test_cancel_is_sent_once_per_response(self):
        """Two quick barge-ins on one response must not queue two cancels: the second
        would come back as a spurious 'no active response' error."""
        sent: list[str] = []
        c = _client()
        c._enqueue = lambda msg: sent.append(msg)  # type: ignore[assignment]

        c._responding = True
        c.local_barge_in()
        c.local_barge_in()
        assert sent == [rt_messages.CANCEL]


class TestCancelRaceIsNotAnError:
    """Cancelling a response that just ended is normal, not a failure."""

    def _dispatch(self, client, event):
        import asyncio

        asyncio.run(client._handle_event(event))

    def test_late_cancel_is_not_logged_as_error(self, caplog):
        import logging

        c = _client()
        with caplog.at_level(logging.ERROR, logger="reachy_mini_mirrorbuddy.azure_realtime"):
            self._dispatch(
                c,
                {"type": "error", "error": {"code": "response_cancel_not_active", "message": "x"}},
            )
        assert caplog.records == []

    def test_real_errors_are_still_logged(self, caplog):
        import logging

        c = _client()
        with caplog.at_level(logging.ERROR, logger="reachy_mini_mirrorbuddy.azure_realtime"):
            self._dispatch(c, {"type": "error", "error": {"code": "invalid_api_key"}})
        assert any("invalid_api_key" in r.getMessage() for r in caplog.records)
