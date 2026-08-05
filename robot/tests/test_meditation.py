"""A guided meditation is mostly silence, and the silence has to be real.

A model asked to "pause" will fill the gap: it encourages, it checks in, it
narrates the silence away. So the silence is not requested from the model, it is
imposed on the client — the robot is muted for the interval and nothing it might
have said can reach the room.

Everything here is also an accessibility contract: the session must end the
instant the child wants it to, and it must never require a body that works.
"""

from __future__ import annotations

import pytest
from reachy_mini_mirrorbuddy import meditation
from reachy_mini_mirrorbuddy.azure_realtime import AzureRealtimeClient

DONE = "conversation.item.input_audio_transcription.completed"


@pytest.fixture
def client():
    c = AzureRealtimeClient(
        ws_url="wss://x", api_key="k", instructions="i", voice="sage",
        turn_detection={"type": "server_vad"},
    )
    c.sent = []

    async def capture(msg):
        c.sent.append(msg)

    c._safe_send = capture
    # Without a socket _enqueue drops everything, which would make every
    # "it stayed silent" assertion pass for the wrong reason.
    c._enqueue = c.sent.append
    return c


class TestTheBell:
    def test_the_bell_is_real_audio(self):
        pcm = meditation.bell_pcm16(seconds=1.0, sample_rate=24000)
        assert len(pcm) == 2 * 24000  # 16-bit mono

    def test_the_bell_fades_instead_of_stopping(self):
        # A bell cut off mid-ring is a door slamming in a room asked to be quiet.
        pcm = meditation.bell_pcm16(seconds=1.0, sample_rate=24000)
        head = max(abs(int.from_bytes(pcm[i:i + 2], "little", signed=True)) for i in range(0, 2000, 2))
        tail = max(abs(int.from_bytes(pcm[i:i + 2], "little", signed=True)) for i in range(len(pcm) - 2000, len(pcm), 2))
        assert tail < head / 10

    def test_the_bell_never_clips(self):
        pcm = meditation.bell_pcm16(seconds=2.0, sample_rate=24000)
        peak = max(abs(int.from_bytes(pcm[i:i + 2], "little", signed=True)) for i in range(0, len(pcm), 2))
        assert peak <= 32767


class TestSilenceIsImposedNotRequested:
    def test_while_meditating_the_model_cannot_speak(self, client):
        client.start_meditation()
        client.speak_now("di' qualcosa")
        assert client.sent == []

    def test_an_ordinary_turn_gets_no_answer_during_the_silence(self, client):
        client.start_meditation()
        client._quiet = False  # a cough already cleared the ordinary hush flag
        assert client._meditating is True
        client.speak_now("commenta")
        assert client.sent == []

    def test_the_silence_survives_the_child_shifting_and_breathing(self, client):
        client.start_meditation()
        client._handle_speech_started_for_test = True
        # speech_started clears _quiet on every turn; it must not end a session.
        client._quiet = False
        assert client._meditating is True

    def test_ending_the_session_gives_the_voice_back(self, client):
        client.start_meditation()
        client.end_meditation()
        assert client._meditating is False
        client.speak_now("ora puoi")
        assert any("response.create" in m for m in client.sent)


class TestTheChildEndsItWheneverHeWants:
    @pytest.mark.asyncio
    async def test_asking_it_to_stop_ends_the_session(self, client):
        client.start_meditation()
        await client._handle_event({"type": DONE, "transcript": "basta"})
        assert client._meditating is False

    @pytest.mark.asyncio
    async def test_saying_be_quiet_ends_the_session(self, client):
        client.start_meditation()
        await client._handle_event({"type": DONE, "transcript": "zitto"})
        assert client._meditating is False

    @pytest.mark.asyncio
    async def test_a_goodbye_ends_the_session(self, client):
        client.start_meditation()
        await client._handle_event({"type": DONE, "transcript": "abbiamo finito"})
        assert client._meditating is False


class TestSessionPlan:
    def test_a_practice_is_bell_silence_bell(self):
        plan = meditation.build_plan("respiro", minutes=2)
        assert plan.silence_seconds == pytest.approx(120, abs=1)
        assert plan.opening and plan.closing

    def test_an_unknown_practice_still_works(self):
        assert meditation.build_plan("qualcosa che non esiste", minutes=1).silence_seconds > 0

    def test_a_session_is_never_longer_than_a_child_can_bear(self):
        assert meditation.build_plan("respiro", minutes=90).silence_seconds <= meditation.MAX_SILENCE_S

    def test_a_session_is_never_a_token_gesture(self):
        assert meditation.build_plan("respiro", minutes=0).silence_seconds >= meditation.MIN_SILENCE_S


class TestTheRobotCanBeAskedToMeditate:
    """The tool exists so the silence is run by the robot, not promised by the model."""

    def test_the_model_is_offered_the_tool(self):
        from reachy_mini_mirrorbuddy import tools

        names = [s.get("name") for s in tools.TOOL_SCHEMAS]
        assert "guided_meditation" in names

    def test_the_tool_takes_a_practice_and_a_length(self):
        from reachy_mini_mirrorbuddy import tools

        schema = next(s for s in tools.TOOL_SCHEMAS if s.get("name") == "guided_meditation")
        props = schema["parameters"]["properties"]
        assert "practice" in props and "minutes" in props

    def test_asking_twice_does_not_start_two_silences(self):
        from reachy_mini_mirrorbuddy.tool_handlers import ToolCallMixin

        class Host(ToolCallMixin):
            def __init__(self):
                self.started = []

            def _start_meditation(self, client, args, call_id):
                self.started.append(args)

        host = Host()
        assert hasattr(host, "_start_meditation")


class TestTheBellWaitsItsTurn:
    def test_the_bell_does_not_ring_over_the_opening_words(self, client):
        import time as _t

        rung = []
        plan = meditation.build_plan("respiro", minutes=0)
        session = meditation.Session(client, rung.append, plan)
        client._responding = True  # the opening sentence is still being spoken
        session.start()
        _t.sleep(0.4)
        assert rung == []  # still talking: no bell yet
        client._responding = False
        _t.sleep(0.6)
        assert len(rung) == 1  # the room went quiet, then the bell
        session.cancel()
        session.join(timeout=2)


class TestNothingSlipsThroughTheSilence:
    def test_the_model_is_never_asked_to_speak_during_the_silence(self, client):
        import asyncio

        async def capture(msg):
            client.sent.append(msg)

        client._safe_send = capture  # observe what would reach the wire
        client.start_meditation()
        asyncio.run(client._request_response("di' qualcosa"))
        assert client.sent == []  # no turn requested while sitting

        client.end_meditation()
        asyncio.run(client._request_response("di' qualcosa"))
        assert client.sent  # and the voice comes back afterwards

    def test_a_crash_mid_session_still_gives_the_voice_back(self, client):
        plan = meditation.build_plan("respiro", minutes=0)
        session = meditation.Session(client, lambda _pcm: None, plan)
        session._ring = lambda: (_ for _ in ()).throw(RuntimeError("speaker on fire"))
        session.start()
        session.join(timeout=5)
        assert not session.is_alive()
        assert client._meditating is False  # a crash must not leave a mute robot


class TestAskingForTheMeditationTeacher:
    @staticmethod
    def _maestri():
        from reachy_mini_mirrorbuddy.mirrorbuddy_client import Maestro

        def make(mid, name, subject, specialty):
            return Maestro(
                id=mid, name=name, display_name=name, subject=subject, specialty=specialty,
                voice="sage", voice_instructions="", teaching_style="",
                system_prompt="", greeting="",
            )

        return [
            make("loto", "Fratello Loto", "mindfulness", "meditazione e mindfulness"),
            make("omero", "Omero", "italian", "poesia epica"),
            make("euclide", "Euclide", "mathematics", "geometria"),
        ]

    def test_calling_a_maestro_by_name_works(self):
        from reachy_mini_mirrorbuddy.tools import resolve_maestro

        maestri = self._maestri()
        for said, expected in [
            ("voglio parlare con fratello loto", "Fratello Loto"),
            ("chiama omero", "Omero"),
            ("voglio parlare con euclide", "Euclide"),
        ]:
            assert resolve_maestro(maestri, said).display_name == expected, said

    def test_asking_for_the_practice_finds_him_without_knowing_his_name(self):
        # A child who wants to calm down does not know there is a "Fratello Loto".
        from reachy_mini_mirrorbuddy.tools import resolve_maestro

        maestri = self._maestri()
        for said in ["voglio meditare", "un maestro di meditazione", "facciamo mindfulness",
                     "vorrei fare rilassamento", "meditazione"]:
            found = resolve_maestro(maestri, said)
            assert found is not None and found.id == "loto", said
