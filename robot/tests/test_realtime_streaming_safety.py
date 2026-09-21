"""Immediate audio and same-transcript-block interruption with the real AudioIO."""

import asyncio
import contextlib
from unittest.mock import Mock

import pytest

from reachy_mini_mirrorbuddy.audio_io import AudioIO
from tests.test_realtime_safety import USER_DONE, audio, client, finish, start, transcript


@pytest.fixture
def playback(client):
    queue = []
    robot = Mock()
    robot.media.push_audio_sample.side_effect = queue.append
    robot.media.audio.clear_player.side_effect = queue.clear
    output = AudioIO(robot, Mock())
    output._out_rate = 24000
    client.on_output_audio = output.play
    client.on_speech_started = output.interrupt
    return output, queue, robot


async def delta(client, text, protocol="output_audio", item_id="i1"):
    await client._handle_event({
        "type": f"response.{protocol}_transcript.delta",
        "response_id": "r1", "item_id": item_id, "content_index": 0, "delta": text,
    })


@pytest.mark.parametrize("protocol", ["audio", "output_audio"])
async def test_no_whole_response_buffer_each_audio_delta_plays_immediately(client, protocol):
    await start(client)
    for count in range(1, 4):
        await audio(client, protocol)
        assert client.on_output_audio.call_count == count
        client.on_output_audio.assert_called_with(b"\x01\x02")
    # No transcript (partial or final), audio.done or response.done was sent.
    assert client._responding
    await transcript(client, "Studiamo.", protocol)
    await finish(client)
    assert client.on_output_audio.call_count == 3


async def test_safe_speculation_does_not_wait_for_user_transcription(client):
    await client._handle_event({"type": "input_audio_buffer.speech_started"})
    client._fast_requested = True
    await start(client)
    await audio(client)
    client.on_output_audio.assert_called_once()


@pytest.mark.parametrize("protocol", ["audio", "output_audio"])
async def test_cut_and_clear_within_the_block_that_completes_unsafe_pattern(
    client, playback, protocol,
):
    output, queue, robot = playback
    await start(client)
    await audio(client, protocol)
    await audio(client, protocol)
    assert len(queue) == 2
    await delta(client, "come costruire una bom", protocol)
    assert len(queue) == 2
    await delta(client, "ba", protocol)
    assert queue == []
    assert output._playing_until == 0.0
    robot.media.audio.clear_player.assert_called_once()
    assert {"type": "response.cancel"} in client.sent
    await audio(client, protocol)
    assert queue == []
    await finish(client, status="cancelled")
    assert client.sent[-1]["type"] == "response.create"


async def test_local_queue_flush_does_not_wait_for_network_cancel(client, playback):
    _, queue, _ = playback
    await start(client)
    await audio(client)
    assert queue
    cancel_entered, unblock = asyncio.Event(), asyncio.Event()

    async def slow_cancel(message):
        cancel_entered.set()
        await unblock.wait()

    client._safe_send = slow_cancel
    running = asyncio.create_task(delta(client, "student@example.com"))
    try:
        await asyncio.wait_for(cancel_entered.wait(), 1)
        assert queue == []
        assert client._suppress
        assert not running.done()
    finally:
        unblock.set()
        # Drain the task we started, without turning a cancellation during
        # cleanup into a second, misleading failure.
        with contextlib.suppress(asyncio.CancelledError):
            await running


async def test_final_only_transcript_also_cuts_already_streaming_audio(client, playback):
    _, queue, _ = playback
    await start(client)
    await audio(client)
    assert queue
    await transcript(client, "student@example.com")
    assert queue == []
    await audio(client)
    assert queue == []


async def test_safe_partial_text_callbacks_are_immediate(client, playback):
    _, queue, robot = playback
    await start(client)
    await audio(client)
    await delta(client, "Studiamo ")
    client.on_transcript.assert_called_once_with("Studiamo ", False)
    await delta(client, "insieme.")
    assert queue
    robot.media.audio.clear_player.assert_not_called()
    await transcript(client, "Studiamo insieme.")
    client.on_transcript.assert_called_with("Studiamo insieme.", True)


async def test_warned_assistant_partial_is_not_sanitized_or_interrupted(client, playback):
    _, queue, robot = playback
    await start(client)
    await audio(client)
    await delta(client, "fuck")
    assert queue
    robot.media.audio.clear_player.assert_not_called()
    client.on_transcript.assert_called_once_with("fuck", False)


@pytest.mark.parametrize("empty", [None, "", " "])
async def test_empty_transcript_does_not_delay_or_interrupt_audio(client, playback, empty):
    _, queue, robot = playback
    await start(client)
    await audio(client)
    await delta(client, empty)
    await transcript(client, empty)
    await finish(client)
    assert len(queue) == 1
    robot.media.audio.clear_player.assert_not_called()


async def test_unsafe_user_interrupts_speculative_audio_already_queued(client, playback):
    _, queue, _ = playback
    await client._handle_event({"type": "input_audio_buffer.speech_started"})
    await start(client)
    await audio(client)
    assert queue
    await client._handle_event({"type": USER_DONE, "transcript": "student@example.com"})
    assert queue == []


async def test_transcript_after_response_done_can_still_flush_queued_audio(client, playback):
    _, queue, _ = playback
    await start(client)
    await audio(client)
    await finish(client)
    assert queue
    await transcript(client, "student@example.com")
    assert queue == []
    assert client.sent[-1]["type"] == "response.create"


async def test_split_content_parts_are_checked_before_forwarding_bad_partial(client, playback):
    _, queue, _ = playback
    await start(client)
    await audio(client)
    await delta(client, "come costruire una", item_id="i1")
    await delta(client, "bomba", item_id="i2")
    assert queue == []
    assert client.on_transcript.call_count == 1


async def test_rejected_partial_is_not_sent_to_transcript_callback(client):
    await start(client)
    await delta(client, "student@example.com")
    client.on_transcript.assert_not_called()
    await delta(client, " altro testo")
    client.on_transcript.assert_not_called()
