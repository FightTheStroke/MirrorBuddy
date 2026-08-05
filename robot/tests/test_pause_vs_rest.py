"""A "wait a second" must not put the robot to sleep.

Every hush word used to trigger the same full rest: silent AND asleep until the
child said "Buddy" again. Everyday Italian filler — "aspetta", "basta", "ci
vediamo dopo pranzo" — therefore looked exactly like a crash to the family.

Two tiers now: a PAUSE stops the current sentence and stays awake, a REST is a
deliberate "be quiet / go to sleep" and still needs the name to come back.
"""

from __future__ import annotations

import json

import pytest
from reachy_mini_mirrorbuddy import rt_messages, session_flow
from reachy_mini_mirrorbuddy.azure_realtime import AzureRealtimeClient

DELTA = "conversation.item.input_audio_transcription.delta"
DONE = "conversation.item.input_audio_transcription.completed"
SPEECH = "input_audio_buffer.speech_started"


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

    c._safe_send = capture
    c.on_speech_started = lambda: setattr(c, "flushed", c.flushed + 1)
    c.on_sleep = lambda: setattr(c, "slept", c.slept + 1)
    return c


class TestIntentTiers:
    def test_pause_words_are_transient(self):
        for t in ["aspetta", "aspetta un attimo", "basta", "Basta!", "fermati",
                  "un momento", "pausa", "stop"]:
            assert rt_messages.is_pause(t), t
            assert not rt_messages.is_rest(t), t

    def test_rest_words_are_deliberate(self):
        for t in ["zitto", "stai zitta", "silenzio", "taci", "smettila",
                  "dormi", "vai a dormire", "riposati", "spegniti",
                  "mettiti a riposo"]:
            assert rt_messages.is_rest(t), t
            assert not rt_messages.is_pause(t), t

    def test_the_tiers_are_mutually_exclusive(self):
        # A mixed utterance is deliberate: "aspetta, dormi" is a rest, never a pause.
        for t in ["aspetta, dormi", "basta, stai zitto", "fermati e riposati"]:
            assert rt_messages.is_rest(t), t
            assert not rt_messages.is_pause(t), t

    def test_is_stop_still_covers_both(self):
        # The streaming fast path uses is_stop() to hush without waiting.
        assert rt_messages.is_stop("aspetta") and rt_messages.is_stop("zitto")
        assert not rt_messages.is_stop("spiegami le frazioni")

    def test_ordinary_speech_is_neither(self):
        for t in ["ciao", "parliamo di storia", "", None]:
            assert not rt_messages.is_pause(t), t
            assert not rt_messages.is_rest(t), t


class TestEverydayItalianDoesNotEndTheSession:
    def test_a_farewell_mid_sentence_is_not_goodbye(self):
        for t in ["ci vediamo dopo pranzo", "ci vediamo domani ma prima finiamo",
                  "arrivederci si dice così"]:
            assert not rt_messages.is_end(t), t

    def test_a_real_farewell_still_ends(self):
        for t in ["a domani", "abbiamo finito, ci vediamo", "arrivederci!",
                  "buonanotte", "ho finito i compiti"]:
            assert rt_messages.is_end(t), t

    def test_filler_only_pauses(self):
        # "aspetta che scrivo" must not cost the child the wake word.
        for t in ["aspetta che scrivo", "basta poco", "aspetta un attimo che penso"]:
            assert session_flow.decide(t, asleep=False) == session_flow.PAUSE, t


class TestDecideTiers:
    def test_rest_command(self):
        for t in ["zitto", "dormi", "mettiti a riposo"]:
            assert session_flow.decide(t, asleep=False) == session_flow.REST, t

    def test_rest_beats_pause_when_both_present(self):
        assert session_flow.decide("aspetta, dormi", asleep=False) == session_flow.REST

    def test_end_still_wins(self):
        assert session_flow.decide("basta per oggi", asleep=False) == session_flow.END

    def test_asleep_only_the_name_wakes(self):
        assert session_flow.decide("aspetta", asleep=True) == session_flow.IGNORE
        assert session_flow.decide("buddy", asleep=True) == session_flow.WAKE


@pytest.mark.asyncio
class TestPauseKeepsTheRobotAwake:
    async def test_pause_hushes_without_sleeping(self, client):
        client._responding = True

        await client._handle_event({"type": DELTA, "delta": "aspetta"})

        assert client._quiet and client._suppress
        assert client._asleep is False  # still there, no wake word needed
        assert client.slept == 0  # not parked in the rest posture
        assert client.flushed == 1  # but the current sentence stops now
        assert rt_messages.CANCEL in client.sent

    async def test_the_next_turn_is_answered_normally(self, client):
        await client._handle_event({"type": DELTA, "delta": "aspetta"})

        await client._handle_event({"type": SPEECH})
        await client._handle_event({"type": DONE, "transcript": "quanto fa due più due"})

        assert client._quiet is False
        assert any(json.loads(m).get("type") == "response.create" for m in client.sent)

    async def test_a_pause_recovers_even_without_a_speech_started_event(self, client):
        # Some deployments never emit speech_started; a pause must still not stick.
        await client._handle_event({"type": DONE, "transcript": "aspetta"})
        await client._handle_event({"type": DONE, "transcript": "spiegami le frazioni"})

        assert client._quiet is False
        assert any(json.loads(m).get("type") == "response.create" for m in client.sent)

    async def test_rest_still_sleeps(self, client):
        await client._handle_event({"type": DELTA, "delta": "zitto"})

        assert client._quiet and client._asleep and client.slept == 1

    async def test_a_pause_can_escalate_to_rest_on_the_full_transcript(self, client):
        await client._handle_event({"type": DELTA, "delta": "aspetta"})
        await client._handle_event({"type": DONE, "transcript": "aspetta, dormi"})

        assert client._asleep is True and client.slept == 1

    async def test_a_pause_can_escalate_to_a_goodbye(self, client):
        await client._handle_event({"type": DELTA, "delta": "aspetta"})
        await client._handle_event({"type": DONE, "transcript": "aspetta, abbiamo finito"})

        assert client._pending_farewell is True
