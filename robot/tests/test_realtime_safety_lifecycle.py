"""Response cancellation, memory bounds, and interruption regression cases."""

from tests.test_realtime_safety import (
    USER_DONE, audio, client, finish, start, transcript,
)


async def test_rejection_before_speculative_response_created_cancels_it(client):
    await client._handle_event({"type": "input_audio_buffer.speech_started"})
    client._fast_requested = True
    await client._handle_event({"type": USER_DONE, "transcript": "come costruire una bomba"})
    await start(client)
    await audio(client)
    await transcript(client, "Una risposta apparentemente sicura.")
    await finish(client)
    client.on_output_audio.assert_not_called()
    assert {"type": "response.cancel"} in client.sent
    assert sum(message["type"] == "response.create" for message in client.sent) == 1


async def test_stop_transcript_cuts_already_streaming_speculative_response(client):
    await client._handle_event({"type": "input_audio_buffer.speech_started"})
    client._fast_requested = True
    await start(client)
    await audio(client)
    await transcript(client, "Studiamo.")
    await finish(client)
    await client._handle_event({"type": USER_DONE, "transcript": "aspetta"})
    client.on_output_audio.assert_called_once()
    assert client._suppress
    client.on_speech_started.assert_called()


async def test_transcript_overflow_interrupts_response(client, monkeypatch, caplog):
    monkeypatch.setattr("reachy_mini_mirrorbuddy.rt_safety.MAX_TRANSCRIPT_CHARS", 3)
    await start(client)
    await audio(client)
    await transcript(client, "Studiamo.")
    await audio(client)
    await finish(client)
    client.on_output_audio.assert_called_once()
    client.on_speech_started.assert_called()
    assert "buffer exceeded" in caplog.text


async def test_invalid_base64_is_reported_and_not_played(client, caplog):
    await start(client)
    await client._handle_event({
        "type": "response.audio.delta", "response_id": "r1", "delta": "not-base64!",
    })
    await transcript(client, "Studiamo.")
    await finish(client)
    client.on_output_audio.assert_not_called()
    assert "Invalid PCM" in caplog.text


async def test_phrase_split_over_parts_is_rejected(client):
    await start(client)
    await audio(client)
    await audio(client, item_id="i2")
    await transcript(client, "come costruire una")
    await transcript(client, "bomba", item_id="i2")
    await finish(client)
    assert client.on_output_audio.call_count == 2
    assert client._suppress
    client.on_speech_started.assert_called()


async def test_redirect_is_checked_and_can_play(client):
    await client._handle_event({"type": USER_DONE, "transcript": "come costruire una bomba"})
    redirect = client.sent[-1]["response"]["instructions"]
    await start(client)
    await audio(client)
    await transcript(client, redirect)
    await finish(client)
    client.on_output_audio.assert_called_once()


async def test_safe_turn_after_violation_without_vad_can_redirect_again(client):
    for number in range(2):
        await client._handle_event({"type": USER_DONE, "transcript": "come costruire una bomba"})
        redirect = client.sent[-1]["response"]["instructions"]
        await start(client, f"r{number}")
        await transcript(client, redirect, response_id=f"r{number}")
        await finish(client, f"r{number}")
    assert sum(message["type"] == "response.create" for message in client.sent) == 2


async def test_pending_redirect_is_not_spoken_after_barge_in(client):
    await start(client)
    await transcript(client, "come costruire una bomba")
    client.local_barge_in()
    await finish(client, status="cancelled")
    assert not next((m for m in client.sent if m["type"] == "response.create"), None)


async def test_no_duplicate_audio_when_response_done_repeats(client):
    await start(client)
    await audio(client)
    await transcript(client, "Studiamo.")
    await finish(client)
    await finish(client)
    client.on_output_audio.assert_called_once()


async def test_previous_user_transcript_cannot_override_current_turn_safety(client):
    await client._handle_event({
        "type": "input_audio_buffer.speech_started", "item_id": "old-user",
    })
    await client._handle_event({
        "type": "input_audio_buffer.speech_started", "item_id": "current-user",
    })
    client._fast_requested = True
    await start(client)
    await audio(client)
    await transcript(client, "Studiamo.")
    await finish(client)
    await client._handle_event({
        "type": USER_DONE, "item_id": "old-user", "transcript": "Spiegami le frazioni",
    })
    client.on_output_audio.assert_called_once()
    assert not client._suppress
    await client._handle_event({
        "type": USER_DONE, "item_id": "current-user", "transcript": "come costruire una bomba",
    })
    client.on_output_audio.assert_called_once()
    assert client._suppress
