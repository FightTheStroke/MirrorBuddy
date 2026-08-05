"""Wiring: the gesture the model asks for is the gesture the body performs.

The unit tests cover the poses. These cover the two joins where the feature can
be silently absent: the tool never reaching the model, and the gesture being
overwritten by the idle animation the instant it finishes.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from reachy_mini_mirrorbuddy import body_actions, tools  # noqa: E402
from reachy_mini_mirrorbuddy.movements import Movements  # noqa: E402


class DummyRobot:
    def __init__(self):
        self.goto_calls = 0

    def set_target(self, **kwargs):
        pass

    def goto_target(self, **kwargs):
        self.goto_calls += 1

    def disable_wobbling(self):
        pass

    def enable_wobbling(self):
        pass


class TestTheModelIsOfferedTheTool:
    def test_move_body_is_in_the_schemas_sent_to_azure(self):
        names = {s["name"] for s in tools.TOOL_SCHEMAS}

        assert "move_body" in names

    def test_the_enum_matches_the_actions_that_exist(self):
        # An action advertised but unimplemented makes Buddy claim it moved.
        schema = next(s for s in tools.TOOL_SCHEMAS if s["name"] == "move_body")
        advertised = set(schema["parameters"]["properties"]["action"]["enum"])

        assert advertised == set(body_actions.ACTIONS)

    def test_the_things_roberto_asked_for_are_available(self):
        for wanted in ("antenne_giu", "nascondi", "cucu"):
            assert wanted in body_actions.ACTIONS


class TestThePostureSurvivesTheAnimation:
    def test_lowering_the_antennas_leaves_them_lowered(self):
        m = Movements(DummyRobot(), enabled=False)

        assert m.play_body_action("Antenne Giu") is True
        assert m.antenna_bias < 0

    def test_rest_clears_a_held_posture(self):
        m = Movements(DummyRobot(), enabled=False)
        m.play_body_action("antenne_giu")

        m.play_body_action("riposo")

        assert m.antenna_bias == pytest.approx(0.0)

    def test_a_one_shot_gesture_does_not_change_the_held_posture(self):
        # Nodding while the antennas are deliberately down must not raise them.
        m = Movements(DummyRobot(), enabled=False)
        m.play_body_action("antenne_giu")
        held = m.antenna_bias

        m.play_body_action("annuisci")

        assert m.antenna_bias == pytest.approx(held)

    def test_an_unknown_gesture_moves_nothing(self):
        robot = DummyRobot()
        m = Movements(robot, enabled=False)

        assert m.play_body_action("teletrasporto") is False
        assert robot.goto_calls == 0

    def test_the_animation_is_released_even_if_the_gesture_fails(self):
        # A gesture that leaves the body held would freeze Buddy for good.
        class Breaking(DummyRobot):
            def goto_target(self, **kwargs):
                raise RuntimeError("IK error")

        m = Movements(Breaking(), enabled=False)

        m.play_body_action("cucu")

        assert not m._hold.is_set()


class FakeClient:
    def __init__(self):
        self.results: list[tuple[str, str, bool]] = []

    def send_function_result(self, call_id, output, respond=True):
        self.results.append((call_id, output, respond))


class Handler(__import__(
    "reachy_mini_mirrorbuddy.tool_handlers", fromlist=["ToolCallMixin"]
).ToolCallMixin):
    def __init__(self, movements):
        self.movements = movements


class TestBuddyDoesNotGoSilentAfterMoving:
    def test_the_maestro_gets_a_turn_to_acknowledge(self):
        # respond=False here would leave the child staring at a robot that moved
        # and then said nothing, waiting for a turn that never arrives.
        client = FakeClient()
        h = Handler(Movements(DummyRobot(), enabled=False))

        h._handle_move_body(client, {"action": "annuisci"}, "call-1")

        assert client.results, "no function result was sent at all"
        assert client.results[0][2] is True

    def test_an_unknown_gesture_is_reported_honestly(self):
        client = FakeClient()
        h = Handler(Movements(DummyRobot(), enabled=False))

        h._handle_move_body(client, {"action": "teletrasporto"}, "call-2")

        assert "Non conosco" in client.results[0][1]
