"""A child who asks for silence gets it immediately, not after transcription.

"Zitto" used to wait for the full transcription pass to land before Buddy went
quiet — a second or more of being talked over, which is exactly the insistence
these tests exist to prevent. The stop now fires on the streaming partial.
"""

from __future__ import annotations

import json

import pytest

from reachy_mini_mirrorbuddy import rt_messages
from reachy_mini_mirrorbuddy.azure_realtime import AzureRealtimeClient

DELTA = "conversation.item.input_audio_transcription.delta"
DONE = "conversation.item.input_audio_transcription.completed"


@pytest.fixture
def client():
    c = AzureRealtimeClient(
        ws_url="wss://x", api_key="k", instructions="i", voice="coral",
        turn_detection={"type": "server_vad"},
    )
    c.sent = []
    c.flushed = 0
    c.slept = 0

    async def capture(msg):
        c.sent.append(msg)

    def flush():
        c.flushed += 1

    def sleep():
        c.slept += 1

    c._safe_send = capture
    c.on_speech_started = flush
    c.on_sleep = sleep
    return c


@pytest.mark.asyncio
async def test_stop_word_in_a_partial_silences_at_once(client):
    client._responding = True

    await client._handle_event({"type": DELTA, "delta": "zitto"})

    assert client._quiet and client._asleep and client._suppress
    assert rt_messages.CANCEL in client.sent
    assert client.flushed == 1  # local playback dropped
    assert client.slept == 1  # parked in the rest posture


@pytest.mark.asyncio
async def test_partials_accumulate_across_deltas(client):
    for chunk in ("adesso ", "basta ", "grazie"):
        await client._handle_event({"type": DELTA, "delta": chunk})

    assert client._quiet is True


@pytest.mark.asyncio
async def test_ordinary_partials_do_not_silence(client):
    await client._handle_event({"type": DELTA, "delta": "puoi spiegarmi le frazioni?"})

    assert client._quiet is False and client._asleep is False
    assert client.sent == []


@pytest.mark.asyncio
async def test_stop_is_applied_once_per_turn(client):
    await client._handle_event({"type": DELTA, "delta": "zitto"})
    await client._handle_event({"type": DONE, "transcript": "zitto per favore"})

    assert client.slept == 1  # not re-parked by the late transcript


@pytest.mark.asyncio
async def test_a_new_turn_can_be_stopped_again(client):
    await client._handle_event({"type": DELTA, "delta": "zitto"})
    client._asleep = False  # woken by name
    await client._handle_event({"type": "input_audio_buffer.speech_started"})
    await client._handle_event({"type": DELTA, "delta": "basta"})

    assert client._quiet is True and client.slept == 2


@pytest.mark.asyncio
async def test_stop_still_works_from_the_final_transcript(client):
    """Deployments without partial transcription must keep the old guarantee."""
    await client._handle_event({"type": DONE, "transcript": "basta"})

    assert client._quiet and client._asleep
    assert client.slept == 1


@pytest.mark.asyncio
async def test_no_response_is_requested_after_a_stop(client):
    await client._handle_event({"type": DELTA, "delta": "zitto"})
    await client._handle_event({"type": DONE, "transcript": "zitto"})

    assert not any(json.loads(m).get("type") == "response.create" for m in client.sent)
