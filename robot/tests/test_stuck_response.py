"""The robot must never wait for ever on an answer that will never arrive.

When Azure refuses a request because it still believes a response is streaming,
the robot believes it and waits for that response to end. But a cancelled
response never reports that it ended, so the wait had no way out: the robot said
one thing, then stopped answering for the rest of the session and only a restart
brought it back.

The wait is now bounded. Past the bound the server's view is treated as stale and
the child's next question is answered.
"""

from __future__ import annotations

import json

import pytest

from reachy_mini_mirrorbuddy.azure_realtime import AzureRealtimeClient
from reachy_mini_mirrorbuddy.rt_events import _RESPONSE_STUCK_S


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


def _sent_types(client) -> list[str]:
    out = []
    for msg in client.sent:
        try:
            out.append(json.loads(msg).get("type"))
        except Exception:
            pass
    return out


async def _server_refuses_because_it_still_has_one(client) -> None:
    await client._handle_event(
        {
            "type": "error",
            "error": {"code": "conversation_already_has_active_response"},
        }
    )


@pytest.mark.asyncio
async def test_a_response_that_never_ends_stops_blocking_the_next_question(client):
    await _server_refuses_because_it_still_has_one(client)
    client.clock.advance(_RESPONSE_STUCK_S + 1)

    await client._request_response()

    assert "response.create" in _sent_types(client)


@pytest.mark.asyncio
async def test_a_response_still_streaming_is_left_alone(client):
    await _server_refuses_because_it_still_has_one(client)
    client.clock.advance(_RESPONSE_STUCK_S / 2)

    await client._request_response()

    assert "response.create" not in _sent_types(client)


@pytest.mark.asyncio
async def test_the_wait_restarts_with_every_confirmed_answer(client):
    await client._handle_event({"type": "response.created"})
    client.clock.advance(_RESPONSE_STUCK_S / 2)

    await client._request_response()

    assert "response.create" not in _sent_types(client)


@pytest.mark.asyncio
async def test_a_finished_answer_never_looks_stuck(client):
    await client._handle_event({"type": "response.created"})
    await client._handle_event({"type": "response.done"})

    await client._request_response()

    assert "response.create" in _sent_types(client)
