"""Speculative answering: overlap the model's start with the transcription pass.

Short turns used to wait for the whole transcription before the model was even
asked to answer, because a short turn might be "basta" and a stop word must
produce zero spoken reply. That safety was paid for twice: first the transcript,
then the model, one after the other.

The answer is now requested straight away, but its audio is held back until the
transcript says the turn was ordinary speech. The two waits overlap; the
guarantee is unchanged — nothing is ever heard before the transcript clears it.
"""

from __future__ import annotations

import base64
import json

import pytest

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
    c.heard = []

    async def capture(msg):
        c.sent.append(msg)

    c._safe_send = capture
    c.on_output_audio = c.heard.append
    clock = FakeClock()
    monkeypatch.setattr("reachy_mini_mirrorbuddy.rt_events.time.monotonic", clock)
    c.clock = clock
    return c


def _sent_types(client) -> list[str]:
    out = []
    for msg in client.sent:
        try:
            out.append(json.loads(msg).get("type"))
        except Exception:
            pass
    return out


async def _speak_briefly(client) -> None:
    """The student says something short — the length a stop word would be."""
    await client._handle_event({"type": "input_audio_buffer.speech_started"})
    client.clock.advance(_FAST_PATH_MIN_SPEECH_S / 2)
    await client._handle_event({"type": "input_audio_buffer.speech_stopped"})


async def _audio(client, payload: bytes) -> None:
    await client._handle_event(
        {"type": "response.output_audio.delta", "delta": base64.b64encode(payload).decode()}
    )


async def _transcript(client, text: str) -> None:
    await client._handle_event(
        {"type": "conversation.item.input_audio_transcription.completed", "transcript": text}
    )


@pytest.mark.asyncio
async def test_short_turn_asks_for_the_answer_without_waiting(client):
    await _speak_briefly(client)

    assert "response.create" in _sent_types(client)


@pytest.mark.asyncio
async def test_nothing_is_heard_before_the_transcript_clears_the_turn(client):
    await _speak_briefly(client)
    await client._handle_event({"type": "response.created"})
    await _audio(client, b"ciao")

    assert client.heard == []


@pytest.mark.asyncio
async def test_ordinary_speech_releases_the_held_audio_in_order(client):
    await _speak_briefly(client)
    await client._handle_event({"type": "response.created"})
    await _audio(client, b"uno")
    await _audio(client, b"due")

    await _transcript(client, "quanto fa due più due")

    assert client.heard == [b"uno", b"due"]


@pytest.mark.asyncio
async def test_audio_flows_normally_once_the_turn_is_cleared(client):
    await _speak_briefly(client)
    await client._handle_event({"type": "response.created"})
    await _transcript(client, "quanto fa due più due")
    await _audio(client, b"tre")

    assert client.heard == [b"tre"]


@pytest.mark.asyncio
async def test_a_stop_word_is_never_spoken_over(client):
    await _speak_briefly(client)
    await client._handle_event({"type": "response.created"})
    await _audio(client, b"non dovrei parlare")

    await _transcript(client, "basta")

    assert client.heard == []
    assert "response.cancel" in _sent_types(client)


@pytest.mark.asyncio
async def test_a_stop_word_caught_mid_speech_discards_the_held_audio(client):
    await _speak_briefly(client)
    await client._handle_event({"type": "response.created"})
    await _audio(client, b"non dovrei parlare")

    await client._handle_event(
        {
            "type": "conversation.item.input_audio_transcription.delta",
            "delta": "basta",
        }
    )

    assert client.heard == []


@pytest.mark.asyncio
async def test_the_turn_is_answered_once_not_twice(client):
    await _speak_briefly(client)
    await client._handle_event({"type": "response.created"})
    await _transcript(client, "quanto fa due più due")

    assert _sent_types(client).count("response.create") == 1


@pytest.mark.asyncio
async def test_a_new_turn_drops_audio_held_from_the_previous_one(client):
    await _speak_briefly(client)
    await client._handle_event({"type": "response.created"})
    await _audio(client, b"vecchio")

    await client._handle_event({"type": "input_audio_buffer.speech_started"})
    await _transcript(client, "quanto fa due più due")

    assert b"vecchio" not in client.heard


@pytest.mark.asyncio
async def test_a_new_turn_before_the_answer_exists_still_cancels_it(client):
    """The child speaks again before Azure has confirmed the answer exists.

    Asking for the answer immediately opens a window the old code never had: the
    request is in flight but ``response.created`` has not come back, so nothing
    looks like it is "responding" yet. Without a cancel here, that answer belongs
    to a turn the child has already abandoned and would be spoken over the new one.
    """
    await _speak_briefly(client)
    client.sent.clear()

    await client._handle_event({"type": "input_audio_buffer.speech_started"})

    assert "response.cancel" in _sent_types(client)


@pytest.mark.asyncio
async def test_an_abandoned_answer_stays_silent_when_it_finally_arrives(client):
    """The late ``response.created`` must not un-mute the answer it confirms."""
    await _speak_briefly(client)
    await client._handle_event({"type": "input_audio_buffer.speech_started"})

    await client._handle_event({"type": "response.created"})
    await _audio(client, b"risposta vecchia")

    assert client.heard == []


@pytest.mark.asyncio
async def test_the_answer_to_the_new_turn_is_still_heard(client):
    """Cancelling the abandoned answer must not mute the one the child waits for."""
    await client._handle_event({"type": "input_audio_buffer.speech_started"})
    client.clock.advance(_FAST_PATH_MIN_SPEECH_S * 2)
    await client._handle_event({"type": "input_audio_buffer.speech_stopped"})
    await client._handle_event({"type": "response.created"})
    await _audio(client, b"risposta nuova")

    assert client.heard == [b"risposta nuova"]


@pytest.mark.asyncio
async def test_a_dropped_connection_forgets_the_held_answer(client):
    """A held answer belongs to the session that died with it.

    After a reconnect the buffered bytes are from a response that no longer
    exists. A deployment that then delivers a completed transcript without a
    fresh ``speech_started`` would release them into the new session.
    """
    await _speak_briefly(client)
    await client._handle_event({"type": "response.created"})
    await _audio(client, b"vecchia sessione")

    client._reset_session_state()

    assert client._gated is False
    assert client._gated_audio == []


@pytest.mark.asyncio
async def test_the_abandoned_answer_does_not_silence_the_one_after_it(client):
    """Both answers are confirmed, in order: only the abandoned one is dropped.

    The socket delivers events in the order the server processed them, so the
    abandoned answer is always confirmed before the new one. Muting the wrong
    confirmation would leave the child asking a question and hearing nothing.
    """
    await _speak_briefly(client)  # turn one: answer requested, not yet confirmed
    await client._handle_event({"type": "input_audio_buffer.speech_started"})
    client.clock.advance(_FAST_PATH_MIN_SPEECH_S * 2)
    await client._handle_event({"type": "input_audio_buffer.speech_stopped"})

    await client._handle_event({"type": "response.created"})  # the abandoned one
    await _audio(client, b"vecchia")
    await client._handle_event({"type": "response.created"})  # the one being waited for
    await _audio(client, b"nuova")

    assert client.heard == [b"nuova"]
