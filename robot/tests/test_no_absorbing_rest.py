"""Rest must never be a room without a door.

Resting used to have exactly one exit: the word "Buddy", transcribed correctly,
through mic → Azure → Whisper. One missed token and the child was locked out of
his own robot until an adult restarted the app — which is what kept happening.

So rest keeps listening (it always did) and now offers several cheap exits: the
name in any of the spellings the ASR actually produces, a plain "puoi parlare",
and a timeout, because a child cannot be asked to remember a magic word.
"""

from __future__ import annotations

import json

import pytest
from reachy_mini_mirrorbuddy import rt_messages, session_flow
from reachy_mini_mirrorbuddy.azure_realtime import AzureRealtimeClient

DONE = "conversation.item.input_audio_transcription.completed"


@pytest.fixture
def client():
    c = AzureRealtimeClient(
        ws_url="wss://x", api_key="k", instructions="i", voice="coral",
        turn_detection={"type": "server_vad"},
    )
    c.sent = []
    c.woke = 0

    async def capture(msg):
        c.sent.append(msg)

    c._safe_send = capture
    c.on_wake = lambda: setattr(c, "woke", c.woke + 1)
    return c


def _said(text: str) -> dict:
    return {"type": DONE, "transcript": text}


class TestWakeWordTolerance:
    def test_asr_spellings_of_the_name_all_wake(self):
        # What Whisper actually returns for an Italian child saying "Buddy".
        for heard in ["Buddy", "buddi", "budy", "Baddy", "badi", "Bady",
                      "boddy", "Buddie", "BUDDY!", "ehi buddy?"]:
            assert rt_messages.is_wake(heard), heard

    def test_unrelated_words_do_not_wake(self):
        for heard in ["abbiamo finito", "il budino", "va bene", "buonanotte"]:
            assert not rt_messages.is_wake(heard), heard


class TestResumePhrases:
    def test_plain_requests_to_speak_again_are_wake(self):
        for heard in ["puoi parlare", "riprendi", "svegliati", "sveglia",
                      "ci sei?", "torna", "parla pure", "puoi rispondere"]:
            assert rt_messages.is_resume(heard), heard

    def test_ordinary_sentences_are_not_resume(self):
        for heard in ["quanto fa sette per otto", "zitto", "aspetta un attimo"]:
            assert not rt_messages.is_resume(heard), heard

    def test_resume_phrase_wakes_a_sleeping_robot(self):
        assert session_flow.decide("puoi parlare", asleep=True) == session_flow.WAKE


class TestRestExpires:
    def test_while_rest_is_fresh_an_ordinary_turn_is_ignored(self):
        assert session_flow.decide("quanto fa due più due", asleep=True) == session_flow.IGNORE

    def test_once_rest_expired_an_ordinary_turn_is_answered(self):
        action = session_flow.decide("quanto fa due più due", asleep=True, rest_expired=True)
        assert action == session_flow.SPEAK

    def test_an_expired_rest_can_still_be_asked_for_again(self):
        assert session_flow.decide("zitto", asleep=True, rest_expired=True) == session_flow.REST


class TestClientRecoversFromRest:
    @pytest.mark.asyncio
    async def test_an_old_rest_lapses_and_the_robot_answers(self, client):
        client._asleep = True
        client._quiet = True
        client._asleep_since = -10_000.0  # rested far longer than the timeout
        await client._handle_event(_said("mi aiuti con i compiti?"))
        assert client._asleep is False
        assert client._quiet is False
        assert any("response.create" in m for m in client.sent)

    @pytest.mark.asyncio
    async def test_a_recent_rest_still_holds(self, client):
        client._asleep = True
        await client._handle_event(_said("mi aiuti con i compiti?"))
        assert client._asleep is True
        assert not any("response.create" in m for m in client.sent)

    @pytest.mark.asyncio
    async def test_what_was_heard_while_asleep_is_logged(self, client, caplog):
        client._asleep = True
        with caplog.at_level("INFO"):
            await client._handle_event(_said("mi aiuti con i compiti?"))
        # Without this line no one can tell why the robot stayed silent.
        assert "mi aiuti con i compiti?" in caplog.text

    @pytest.mark.asyncio
    async def test_the_words_that_caused_the_rest_are_logged(self, client, caplog):
        with caplog.at_level("INFO"):
            await client._handle_event(_said("zitto per favore"))
        assert "zitto per favore" in caplog.text

    @pytest.mark.asyncio
    async def test_returning_to_the_desk_lifts_the_rest_without_a_word(self, client):
        client._asleep = True
        client._quiet = True
        client.resume_silently()
        assert client._asleep is False
        assert client._quiet is False
        assert client.sent == []  # a silent resume never makes the robot speak

    @pytest.mark.asyncio
    async def test_an_active_response_reported_by_the_server_is_remembered(self, client):
        client._responding = False
        await client._handle_event({
            "type": "error",
            "error": {"code": "conversation_already_has_active_response"},
        })
        # The server owns the truth: keep quiet until its response.done arrives,
        # instead of hammering it with requests it will keep rejecting.
        assert client._responding is True


class TestSilentResumeIsNotAWakeGreeting:
    @pytest.mark.asyncio
    async def test_wake_word_still_greets(self, client):
        client._asleep = True
        await client._handle_event(_said("Buddy"))
        assert client.woke == 1
        assert any(json.loads(m).get("type") == "response.create" for m in client.sent)


class TestTheDoorIsNotJammedByTheLastTurn:
    @pytest.mark.asyncio
    async def test_a_hush_mid_sentence_does_not_mute_the_turn_after_the_rest(self, client):
        # The child interrupted a long answer with "zitto": the fast path had
        # already asked for that response, and that stale flag used to survive the
        # rest — so the first sentence after waking up was silently dropped.
        client._fast_requested = True
        client._responding = True
        await client._handle_event(_said("zitto"))
        assert client._asleep is True

        client._asleep_since = 0.0  # ten minutes pass
        client.sent.clear()
        await client._handle_event(_said("come si fa questo esercizio?"))
        assert any(json.loads(m).get("type") == "response.create" for m in client.sent)
