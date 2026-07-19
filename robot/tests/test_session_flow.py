"""Tests for the accessibility-critical session flow: stop / end / wake / friend mode.

All pure logic, no hardware or network. These behaviours matter for the child:
insistence is stressful, so "stop" and "we're done" must be honoured deterministically
and locally, never left to the model.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from reachy_mini_mirrorbuddy import rt_messages, session_flow, tools  # noqa: E402
from reachy_mini_mirrorbuddy.mirrorbuddy_client import friend_buddy, neutral_buddy  # noqa: E402


class TestStopIntent:
    def test_stop_words(self):
        for t in ["basta", "Basta!", "zitto", "stai zitto", "fermati", "silenzio",
                  "aspetta", "pausa", "stop", "taci", "smettila"]:
            assert rt_messages.is_stop(t), t

    def test_not_stop(self):
        for t in ["ciao", "quanto fa due più due", "", None, "parliamo di storia"]:
            assert not rt_messages.is_stop(t), t


class TestEndIntent:
    def test_end_words(self):
        for t in ["abbiamo finito", "ho finito", "finito per oggi", "basta per oggi",
                  "a domani", "ci vediamo", "arrivederci", "buonanotte", "buona notte",
                  "vai a dormire", "spegniti", "riposati"]:
            assert rt_messages.is_end(t), t

    def test_not_end(self):
        for t in ["ciao", "basta", "aspetta un attimo", "", None, "che ore sono"]:
            assert not rt_messages.is_end(t), t


class TestWakeIntent:
    def test_wake_words(self):
        for t in ["buddy", "Buddy!", "svegliati", "sei sveglio", "ci sei", "ehi robot"]:
            assert rt_messages.is_wake(t), t

    def test_not_wake(self):
        for t in ["ciao", "storia", "", None]:
            assert not rt_messages.is_wake(t), t


class TestDecide:
    def test_asleep_ignores_normal_speech(self):
        assert session_flow.decide("quanto fa due più due", asleep=True) == session_flow.IGNORE

    def test_asleep_wakes_on_name(self):
        assert session_flow.decide("buddy ci sei?", asleep=True) == session_flow.WAKE

    def test_awake_end_takes_precedence(self):
        assert session_flow.decide("abbiamo finito, a domani", asleep=False) == session_flow.END

    def test_awake_stop(self):
        assert session_flow.decide("basta", asleep=False) == session_flow.STOP

    def test_awake_normal_turn(self):
        assert session_flow.decide("spiegami le frazioni", asleep=False) == session_flow.SPEAK

    def test_end_beats_stop_when_both_present(self):
        # "basta per oggi" is an end intent, not a transient stop.
        assert session_flow.decide("basta per oggi", asleep=False) == session_flow.END


class TestResponseCreate:
    def test_plain(self):
        assert rt_messages.response_create() == {"type": "response.create"}

    def test_with_instructions(self):
        msg = rt_messages.response_create("saluta")
        assert msg["type"] == "response.create"
        assert msg["response"]["instructions"] == "saluta"


class TestParseCallArguments:
    def test_json_string(self):
        name, args = tools.parse_call_arguments(
            {"name": "call_professor", "arguments": '{"query": "storia"}'}
        )
        assert name == "call_professor"
        assert args == {"query": "storia"}

    def test_fallback_name_and_bad_json(self):
        name, args = tools.parse_call_arguments({"arguments": "not-json"}, "back_to_study")
        assert name == "back_to_study"
        assert args == {}


class TestFriendAndStudyTools:
    def test_friend_tools_registered(self):
        names = {t["name"] for t in tools.TOOL_SCHEMAS}
        assert "talk_as_friend" in names
        assert "back_to_study" in names

    def test_friend_buddy_persona(self):
        m = friend_buddy("Marco", "sage")
        assert m.id == "buddy-friend"
        assert m.voice == "sage"
        # A friend, not a tutor: no school-only framing.
        assert "compiti" not in m.voice_instructions.lower()

    def test_neutral_buddy_distinct_from_friend(self):
        assert neutral_buddy("Marco").id != friend_buddy("Marco").id
