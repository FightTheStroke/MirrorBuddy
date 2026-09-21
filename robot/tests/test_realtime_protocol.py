"""Pin the Azure GA/preview wire contract independently of hardware."""

import pytest
import websockets
from websockets.exceptions import InvalidHandshake

from reachy_mini_mirrorbuddy.rt_messages import SAMPLE_RATE, session_update
from tests.test_realtime_deployments import Connection, Socket, client, deployment


def test_ga_session_uses_nested_pcm_audio_without_preview_fields():
    vad = {"type": "server_vad", "create_response": False}
    session = session_update("safe", "coral", vad, [], True)["session"]
    assert session["type"] == "realtime"
    assert session["output_modalities"] == ["audio"]
    assert not {"temperature", "modalities", "voice", "turn_detection"} & session.keys()
    assert session["audio"]["input"]["format"] == {"type": "audio/pcm", "rate": SAMPLE_RATE}
    assert SAMPLE_RATE == 24000
    assert session["audio"]["input"]["transcription"] == {"model": "whisper-1"}
    assert session["audio"]["input"]["turn_detection"] == vad
    assert session["audio"]["output"]["voice"] == "coral"


def test_preview_keeps_flat_audio_contract():
    session = session_update("safe", "coral", {}, [], False)["session"]
    assert session["modalities"] == ["audio", "text"]
    assert session["input_audio_format"] == session["output_audio_format"] == "pcm16"
    assert session["voice"] == "coral"
    assert "audio" not in session


@pytest.mark.asyncio
@pytest.mark.parametrize("version,header", [
    ("12.0", "extra_headers"), ("13.1", "extra_headers"),
    ("14.0", "additional_headers"), ("17.1", "additional_headers"),
])
async def test_headers_match_default_websockets_client(monkeypatch, version, header):
    seen = []

    def connect(url, **kwargs):
        seen.append(kwargs)
        return Connection(Socket([]))

    monkeypatch.setattr(websockets, "__version__", version)
    monkeypatch.setattr(websockets, "connect", connect)
    await client()._connect_and_listen()
    assert seen[0][header] == {"api-key": "test"}


@pytest.mark.asyncio
async def test_legacy_status_only_404_can_recover(monkeypatch):
    # websockets <=13 discards HTTP rejection bodies.
    error = InvalidHandshake("HTTP 404")
    error.status_code = 404
    calls = []
    results = iter([error, Socket([])])

    def connect(url, **kwargs):
        calls.append(url)
        return Connection(next(results))

    monkeypatch.setattr(websockets, "connect", connect)
    await client()._connect_and_listen()
    assert [deployment(u) for u in calls] == ["new", "stable"]
