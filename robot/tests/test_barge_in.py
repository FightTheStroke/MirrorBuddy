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
