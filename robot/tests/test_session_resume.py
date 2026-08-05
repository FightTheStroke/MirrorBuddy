"""A 60-minute Azure session cap must not kill the app.

Azure Realtime hard-closes any session at 60 minutes ("session_expired"). The
client thread then ended, `main` stopped waiting and the whole app exited — the
robot went permanently deaf, and not even the wake word could bring it back
because nothing was listening. The session loop now reconnects on its own.
"""

from __future__ import annotations

import asyncio

import pytest
from reachy_mini_mirrorbuddy.azure_realtime import AzureRealtimeClient


def make_client(**kw):
    return AzureRealtimeClient(
        ws_url="wss://x", api_key="k", instructions="i", voice="coral",
        turn_detection={"type": "server_vad"}, **kw,
    )


@pytest.fixture
def client(monkeypatch):
    c = make_client()
    c.connects = 0
    c.slept = []

    async def no_sleep(d):
        c.slept.append(d)

    monkeypatch.setattr(asyncio, "sleep", no_sleep)
    return c


@pytest.mark.asyncio
class TestSessionLoopSurvives:
    async def test_a_clean_expiry_reconnects(self, client):
        async def connect():
            client.connects += 1
            if client.connects >= 3:
                client._stop.set()  # third session: shut down for the test

        client._connect_and_listen = connect

        await client._session_loop()

        assert client.connects == 3  # expiry is not the end of the app

    async def test_a_network_error_reconnects_with_backoff(self, client):
        async def connect():
            client.connects += 1
            if client.connects >= 4:
                client._stop.set()
            raise OSError("connection refused")

        client._connect_and_listen = connect

        await client._session_loop()

        assert client.connects == 4
        assert client.slept == sorted(client.slept)  # backs off, never hammers Azure
        assert client.slept[-1] > client.slept[0]  # and the wait really grows
        assert max(client.slept) <= 30.0  # but always comes back within half a minute

    async def test_a_deliberate_stop_does_not_wait(self, client):
        # Shutting the app down must be immediate, not "after the backoff".
        async def connect():
            client.connects += 1
            if client.connects >= 3:
                client._stop.set()

        client._connect_and_listen = connect

        await client._session_loop()

        assert len(client.slept) == 2  # two reconnects, no wait after the stop

    async def test_every_session_starts_from_a_clean_slate(self, client):
        # The expired session died mid-sentence with audio suppressed; the new
        # one must not inherit that or it comes back mute.
        seen = []

        async def connect():
            client.connects += 1
            seen.append(client._suppress)
            client._suppress = True
            client._responding = True
            if client.connects >= 2:
                client._stop.set()

        client._connect_and_listen = connect

        await client._session_loop()

        assert seen == [False, False]

    async def test_stop_ends_the_loop(self, client):
        client._stop.set()

        async def connect():
            client.connects += 1

        client._connect_and_listen = connect

        await client._session_loop()

        assert client.connects == 0  # a deliberate shutdown stays shut down

    async def test_an_instant_close_is_also_backed_off(self, client):
        # A session that dies on arrival must not become a reconnect storm.
        async def connect():
            client.connects += 1
            if client.connects >= 3:
                client._stop.set()

        client._connect_and_listen = connect

        await client._session_loop()

        assert client.slept and client.slept[0] >= 1.0


@pytest.mark.asyncio
class TestResumeIsSilentAndFaithful:
    async def test_the_new_session_does_not_greet_again(self, client):
        sent = []
        client._safe_send = lambda m: sent.append(m) or asyncio.sleep(0)
        client._ready.set()  # already greeted in the session that just expired

        await client._handle_event({"type": "session.created"})

        assert sent == []  # the child is mid-homework: resume, don't re-introduce

    async def test_a_resumed_session_starts_unmuted(self, client):
        # The session died while Buddy was mid-sentence: the leftover suppression
        # would silence the whole next session.
        client._suppress = True
        client._responding = True
        client._fast_requested = True
        client._stopped_on_partial = True
        client._partial_user = "half a sentence"

        client._reset_session_state()

        assert not client._suppress and not client._responding
        assert not client._fast_requested and not client._stopped_on_partial
        assert client._partial_user == ""

    async def test_a_resumed_session_keeps_the_child_at_rest(self, client):
        # "Zitto" survives a reconnect: coming back talking would be the exact
        # insistence the rest posture exists to prevent.
        client._asleep = True
        client._quiet = True

        client._reset_session_state()

        assert client._asleep and client._quiet
