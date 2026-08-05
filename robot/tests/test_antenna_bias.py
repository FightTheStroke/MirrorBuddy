"""An antenna told to stay down must stay down.

The idle animation writes every joint fifty times a second. So a one-shot gesture
that lowers the antennas is overwritten within 20ms — Mario would say "lower your
antennas", see them dip, and watch them spring back before he finished the
sentence. Sustained postures have to live inside the animation, not fight it.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from reachy_mini_mirrorbuddy.movements import Movements  # noqa: E402
from reachy_mini_mirrorbuddy.pose_writer import ANTENNA_MAX  # noqa: E402


class DummyRobot:
    def set_target(self, **kwargs):
        pass

    def goto_target(self, **kwargs):
        pass


def _movements() -> Movements:
    return Movements(DummyRobot(), enabled=False)


class TestSustainedAntennaPosture:
    def test_it_starts_with_no_bias(self):
        assert _movements().antenna_bias == pytest.approx(0.0)

    def test_a_lowered_posture_is_remembered(self):
        m = _movements()

        m.set_antenna_bias(-0.4)

        assert m.antenna_bias == pytest.approx(-0.4)

    def test_the_bias_is_applied_to_what_the_animation_produced(self):
        m = _movements()
        m.set_antenna_bias(-0.3)

        right, left = m.apply_antenna_bias(0.1, 0.1)

        assert right == pytest.approx(-0.2)
        assert left == pytest.approx(-0.2)

    def test_the_bias_can_never_push_an_antenna_past_its_limit(self):
        # Animation peak plus a full-down bias must still be a legal command.
        m = _movements()
        m.set_antenna_bias(-ANTENNA_MAX)

        right, left = m.apply_antenna_bias(ANTENNA_MAX, -ANTENNA_MAX)

        assert abs(right) <= ANTENNA_MAX + 1e-9
        assert abs(left) <= ANTENNA_MAX + 1e-9

    def test_a_bias_beyond_the_limit_is_clamped_when_it_is_set(self):
        m = _movements()

        m.set_antenna_bias(-99.0)

        assert abs(m.antenna_bias) <= ANTENNA_MAX + 1e-9

    def test_a_nonsense_bias_is_ignored_rather_than_crashing(self):
        # Tool arguments come from a language model; they are not always numbers.
        m = _movements()
        m.set_antenna_bias(-0.4)

        m.set_antenna_bias("giù")  # type: ignore[arg-type]

        assert m.antenna_bias == pytest.approx(-0.4)

    def test_returning_to_rest_clears_the_posture(self):
        m = _movements()
        m.set_antenna_bias(-0.4)

        m.set_antenna_bias(0.0)

        assert m.antenna_bias == pytest.approx(0.0)


class RecordingRobot:
    """Captures what the animation thread actually commands."""

    def __init__(self) -> None:
        self.antennas: list[list[float]] = []

    def set_target(self, head=None, antennas=None, body_yaw=None):
        self.antennas.append(list(antennas or []))

    def goto_target(self, **kwargs):
        pass

    def enable_motors(self):
        pass

    def enable_wobbling(self):
        pass

    def disable_wobbling(self):
        pass


class TestTheBiasReachesTheMotors:
    def test_the_running_animation_commands_the_lowered_antennas(self):
        # The bias is only real if the 50Hz loop honours it; holding it in a
        # field the loop ignores looks identical in every other test.
        import time

        robot = RecordingRobot()
        m = Movements(robot, enabled=True, follow_face=False)
        m.set_antenna_bias(-0.5)
        m.start()
        try:
            time.sleep(0.4)
        finally:
            m.stop()

        assert robot.antennas, "the animation never wrote a frame"
        assert min(min(a) for a in robot.antennas) < -0.2
