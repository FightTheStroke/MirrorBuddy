"""Every professor can move the robot's body, not just its voice.

Roberto asked for this after watching Mario try to play with Buddy: "if I tell it
to lower its antennas it should lower them; if I say hide, it should hide" — the
peekaboo game a child plays with a puppet. Voice alone makes a speaker; a body
that answers makes a companion.

The tests below are about the two ways this feature hurts a child rather than
helping: a pose the arms cannot reach (the robot freezes mid-game and says
nothing), and a pose it never comes back from (the robot is left staring at the
floor for the rest of the lesson).
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from reachy_mini_mirrorbuddy import body_actions  # noqa: E402
from reachy_mini_mirrorbuddy.pose_writer import ANTENNA_MAX  # noqa: E402


class FakeRobot:
    def __init__(self, fail_on: int | None = None) -> None:
        self.frames: list[dict] = []
        self._n = 0
        self._fail_on = fail_on

    def goto_target(self, head=None, antennas=None, body_yaw=None, duration=None):
        self._n += 1
        if self._fail_on is not None and self._n == self._fail_on:
            raise RuntimeError("IK error: Collision detected or head pose not achievable!")
        self.frames.append(
            {"head": head, "antennas": list(antennas or []), "body_yaw": body_yaw}
        )


def _pose(**kwargs):
    return dict(kwargs)


def _run(action: str, fail_on: int | None = None) -> FakeRobot:
    robot = FakeRobot(fail_on=fail_on)
    body_actions.perform(action, robot, _pose, pause=lambda _s: None)
    return robot


class TestTheActionsChildrenAskFor:
    @pytest.mark.parametrize("action", sorted(body_actions.ACTIONS))
    def test_every_action_moves_the_robot(self, action):
        robot = _run(action)

        assert robot.frames, f"{action} produced no motion at all"

    @pytest.mark.parametrize("action", sorted(body_actions.ACTIONS))
    def test_every_action_ends_back_at_a_neutral_pose(self, action):
        # A robot left hiding after the game is over reads as broken, and the
        # idle animation will fight whatever pose we abandoned it in.
        robot = _run(action)

        last = robot.frames[-1]
        assert last["antennas"] == pytest.approx(
            [body_actions.ANTENNA_NEUTRAL, body_actions.ANTENNA_NEUTRAL]
        )
        assert last["body_yaw"] == pytest.approx(0.0)

    @pytest.mark.parametrize("action", sorted(body_actions.ACTIONS))
    def test_no_action_ever_drives_an_antenna_past_its_limit(self, action):
        robot = _run(action)

        for frame in robot.frames:
            for value in frame["antennas"]:
                assert abs(value) <= ANTENNA_MAX + 1e-9

    @pytest.mark.parametrize("action", sorted(body_actions.ACTIONS))
    def test_no_action_asks_for_a_head_height_the_robot_cannot_reach(self, action):
        robot = _run(action)

        for frame in robot.frames:
            head = frame["head"] or {}
            assert abs(head.get("z", 0.0)) <= body_actions.MAX_HEAD_Z + 1e-9
            assert abs(head.get("pitch", 0.0)) <= body_actions.MAX_HEAD_ANGLE + 1e-9
            assert abs(head.get("yaw", 0.0)) <= body_actions.MAX_HEAD_ANGLE + 1e-9

    def test_the_peekaboo_game_actually_hides_then_reappears(self):
        robot = _run("nascondi")
        hidden = min(f["head"].get("z", 0.0) for f in robot.frames if f["head"])

        assert hidden < 0, "nascondi never lowered the head"

        robot = _run("cucu")
        heights = [f["head"].get("z", 0.0) for f in robot.frames if f["head"]]
        assert min(heights) < 0 < max(heights), "cucu did not hide and pop back up"

    def test_lowering_the_antennas_lowers_them(self):
        robot = _run("antenne_giu")

        assert min(min(f["antennas"]) for f in robot.frames) < body_actions.ANTENNA_NEUTRAL

    def test_raising_the_antennas_raises_them(self):
        robot = _run("antenne_su")

        assert max(max(f["antennas"]) for f in robot.frames) > body_actions.ANTENNA_NEUTRAL


class TestItNeverBreaksTheConversation:
    def test_a_hardware_failure_mid_gesture_does_not_raise(self):
        # goto_target really does throw on unreachable poses — the device logs it.
        # This runs off the websocket loop, but a traceback still kills the game.
        robot = FakeRobot(fail_on=1)

        body_actions.perform("nascondi", robot, _pose, pause=lambda _s: None)

        assert True  # reaching here is the assertion

    def test_it_still_returns_to_neutral_after_a_failure(self):
        robot = FakeRobot(fail_on=1)

        body_actions.perform("nascondi", robot, _pose, pause=lambda _s: None)

        assert robot.frames, "gave up entirely after one bad frame"
        assert robot.frames[-1]["body_yaw"] == pytest.approx(0.0)

    def test_an_unknown_action_is_reported_not_performed(self):
        robot = FakeRobot()

        ok = body_actions.perform("teletrasporto", robot, _pose, pause=lambda _s: None)

        assert ok is False
        assert robot.frames == []

    def test_a_known_action_reports_success(self):
        robot = FakeRobot()

        assert body_actions.perform("annuisci", robot, _pose, pause=lambda _s: None) is True

    def test_it_survives_a_robot_with_no_pose_factory(self):
        # create_head_pose is None until the robot is fully up.
        robot = FakeRobot()

        assert body_actions.perform("annuisci", robot, None, pause=lambda _s: None) is True

    def test_action_names_are_matched_regardless_of_case_or_spacing(self):
        # The model writes what it hears: "Antenne Giu", "cucù".
        assert body_actions.normalise("  Antenne Giu ") == "antenne_giu"
        assert body_actions.normalise("cucù") == "cucu"


class TestTheLimitsAreEnforcedNotJustRespected:
    """The pose tables happen to be legal today. The clamp is what keeps them legal
    when someone adds a more dramatic gesture next month — and an unreachable pose
    means the robot silently stops moving mid-game."""

    def test_a_pose_written_beyond_the_head_limits_is_clamped(self, monkeypatch):
        robot = FakeRobot()
        monkeypatch.setitem(
            body_actions.ACTIONS,
            "_reckless",
            [({"z": 5.0, "pitch": 400.0, "yaw": -400.0}, [0.0, 0.0], 0.0, 0.2)],
        )

        body_actions.perform("_reckless", robot, _pose, pause=lambda _s: None)

        head = robot.frames[0]["head"]
        assert abs(head["z"]) <= body_actions.MAX_HEAD_Z + 1e-9
        assert abs(head["pitch"]) <= body_actions.MAX_HEAD_ANGLE + 1e-9
        assert abs(head["yaw"]) <= body_actions.MAX_HEAD_ANGLE + 1e-9

    def test_an_antenna_written_beyond_its_limit_is_clamped(self, monkeypatch):
        robot = FakeRobot()
        monkeypatch.setitem(
            body_actions.ACTIONS, "_reckless", [({}, [9.0, -9.0], 0.0, 0.2)]
        )

        body_actions.perform("_reckless", robot, _pose, pause=lambda _s: None)

        for value in robot.frames[0]["antennas"]:
            assert abs(value) <= ANTENNA_MAX + 1e-9
