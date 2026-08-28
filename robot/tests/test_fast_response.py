"""Latency fast path: answer without waiting for the transcript, safely.

Every turn used to wait for a full transcription pass before the model was even
asked to answer. These tests pin the trade we made: long utterances skip the wait,
short ones (which is what stop words are) do not, and a stop word never survives.
"""

from __future__ import annotations

import json

import pytest

from reachy_mini_mirrorbuddy import rt_messages
from reachy_mini_mirrorbuddy.azure_realtime import AzureRealtimeClient
from reachy_mini_mirrorbuddy.rt_events import _FAST_PATH_MIN_SPEECH_S


class FakeClock:
    def __init__(self) -> None:
        self.t = 1000.0

    def __call__(self) -> float:
        return self.t

    def advance(self, seconds: float) -> None:
        self.t += seconds


@pytest.fixture
def client(monkeypatch):
    c = AzureRealtimeClient(
        ws_url="wss://x", api_key="k", instructions="i", voice="coral",
        turn_detection={"type": "server_vad"},
    )
    c.sent = []

    async def capture(msg):
        c.sent.append(msg)

    c._safe_send = capture
    clock = FakeClock()
    monkeypatch.setattr("reachy_mini_mirrorbuddy.rt_events.time.monotonic", clock)
    c.clock = clock
    return c


async def _speak(client, seconds: float):
    """Simulate the student talking for ``seconds`` and then stopping."""
    await client._handle_event({"type": "input_audio_buffer.speech_started"})
    client.clock.advance(seconds)
    await client._handle_event({"type": "input_audio_buffer.speech_stopped"})


def _response_creates(client):
    out = []
    for msg in client.sent:
        try:
            if json.loads(msg).get("type") == "response.create":
                out.append(msg)
        except (ValueError, TypeError):
            pass
    return out


@pytest.mark.asyncio
class TestFastPath:
    async def test_a_long_question_is_answered_without_waiting_for_the_transcript(self, client):
        await _speak(client, _FAST_PATH_MIN_SPEECH_S + 0.5)
        assert len(_response_creates(client)) == 1
        assert client._fast_requested is True

    async def test_a_short_utterance_still_waits(self, client):
        # This is the safe path: "zitto" lives here.
        await _speak(client, 0.6)
        assert _response_creates(client) == []
        assert client._fast_requested is False

    async def test_the_short_path_still_answers_once_the_transcript_arrives(self, client):
        await _speak(client, 0.6)
        await client._handle_event(
            {"type": "conversation.item.input_audio_transcription.completed", "transcript": "quanto fa due piu' due"}
        )
        assert len(_response_creates(client)) == 1

    async def test_buddy_never_answers_twice(self, client):
        # The fast path fires, then the transcript classifies the same turn as normal.
        await _speak(client, _FAST_PATH_MIN_SPEECH_S + 0.5)
        await client._handle_event(
            {"type": "conversation.item.input_audio_transcription.completed", "transcript": "spiegami le frazioni"}
        )
        assert len(_response_creates(client)) == 1

    async def test_a_stop_word_ending_a_long_sentence_still_wins(self, client):
        # The risk we took on: the answer was already requested. It must be cancelled.
        await _speak(client, _FAST_PATH_MIN_SPEECH_S + 1.0)
        client.sent.clear()
        await client._handle_event(
            {
                "type": "conversation.item.input_audio_transcription.completed",
                "transcript": "no dai aspetta un attimo per favore zitto",
            }
        )
        assert rt_messages.CANCEL in client.sent
        assert client._quiet is True
        assert client._asleep is True

    async def test_no_fast_response_while_asleep(self, client):
        client._asleep = True
        await _speak(client, _FAST_PATH_MIN_SPEECH_S + 1.0)
        assert _response_creates(client) == []

    async def test_threshold_is_longer_than_any_stop_word(self, client):
        # Sanity on the constant itself: a child saying "fermati" slowly is ~1s.
        assert 1.5 <= _FAST_PATH_MIN_SPEECH_S <= 2.5


@pytest.mark.asyncio
async def test_no_second_response_while_one_is_streaming(client):
    """The server rejects a concurrent response; asking anyway only logs an error."""
    client._responding = True

    await client._request_response()

    assert client.sent == []


@pytest.mark.asyncio
async def test_barge_in_then_fast_path_still_answers(client):
    """Cancelling a reply must not leave the client believing it is still speaking."""
    client._responding = True
    await client._handle_event({"type": "input_audio_buffer.speech_started"})
    client.clock.advance(_FAST_PATH_MIN_SPEECH_S + 0.5)
    await client._handle_event({"type": "input_audio_buffer.speech_stopped"})

    assert rt_messages.CANCEL in client.sent
    assert any(json.loads(m).get("type") == "response.create" for m in client.sent)
