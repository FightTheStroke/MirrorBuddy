"""Emotional body language: mood inference and smooth blending.

The point of these tests is the thing Roberto actually complained about — the
movement was jerky and always the same. So we assert two properties: the mood
changes with what Buddy says, and nothing ever jumps.
"""

from __future__ import annotations

import math

import pytest

from reachy_mini_mirrorbuddy import emotions
from reachy_mini_mirrorbuddy.movements import _ease


class TestInfer:
    @pytest.mark.parametrize(
        "text,expected",
        [
            ("Bravissimo Mario, ce l'hai fatta!", "celebrating"),
            ("Bravo, molto bene", "happy"),
            ("Non ti preoccupare, capita a tutti", "empathetic"),
            ("Proviamo insieme, un passo alla volta", "encouraging"),
            ("Fammi pensare un attimo", "thinking"),
            ("Come mai secondo te?", "curious"),
            ("La capitale della Francia e' Parigi.", "neutral"),
        ],
    )
    def test_reads_the_mood_from_the_words(self, text, expected):
        assert emotions.infer(text).name == expected

    def test_praise_wins_over_a_trailing_question(self):
        # "Bravo! Come hai fatto?" is celebration first, curiosity second.
        assert emotions.infer("Bravo! Come hai fatto?").name == "happy"

    def test_a_cue_inside_a_longer_word_does_not_count(self):
        # Found by this suite: "capitale" contains "capita", so Buddy used to answer
        # a geography question with a consoling posture.
        assert emotions.infer("La capitale della Francia e' Parigi.").name == "neutral"
        assert emotions.infer("Il bravo ragazzo").name == "happy"

    def test_no_text_is_neutral(self):
        assert emotions.infer(None).name == "neutral"
        assert emotions.infer("").name == "neutral"

    def test_unknown_name_falls_back_instead_of_raising(self):
        assert emotions.get("euphoric").name == "neutral"
        assert emotions.get(None).name == "neutral"

    def test_every_emotion_stays_within_safe_limits(self):
        # A tutor robot in front of a child must never thrash, whatever the mood.
        for e in emotions.ALL.values():
            assert 0.3 <= e.scale <= 1.6, e.name
            assert 0.4 <= e.speed <= 1.6, e.name
            assert abs(e.pitch_offset) <= 8.0, e.name
            assert abs(e.antenna_offset) <= 0.35, e.name


class TestEase:
    def test_converges_to_the_target(self):
        v = 0.0
        for _ in range(200):
            v = _ease(v, 1.0, 0.1, 0.02)
        assert v == pytest.approx(1.0, abs=1e-3)

    def test_never_jumps_in_a_single_frame(self):
        # The whole fix: one frame must only ever cover a fraction of the gap.
        step = _ease(0.0, 1.0, 0.09, 1 / 50.0)
        assert 0.0 < step < 0.25

    def test_is_frame_rate_independent(self):
        # Same wall-clock time, different frame rates, same result — otherwise the
        # motion would change character whenever the loop hiccups.
        slow = 0.0
        for _ in range(50):
            slow = _ease(slow, 1.0, 0.2, 0.02)
        fast = 0.0
        for _ in range(100):
            fast = _ease(fast, 1.0, 0.2, 0.01)
        assert slow == pytest.approx(fast, abs=1e-3)

    def test_zero_time_constant_snaps(self):
        assert _ease(0.0, 5.0, 0.0, 0.02) == 5.0

    def test_smoothing_actually_removes_the_jerk(self):
        # A square wave (what the old boolean speaking flag did to the amplitude)
        # becomes a bounded-slope signal once eased.
        raw = [0.0 if (i // 10) % 2 == 0 else 1.0 for i in range(80)]
        out, prev = [], 0.0
        for target in raw:
            prev = _ease(prev, target, 0.12, 1 / 50.0)
            out.append(prev)
        jumps = [abs(b - a) for a, b in zip(out, out[1:])]
        assert max(jumps) < 0.2  # raw signal jumps a full 1.0


class TestMovementsExpression:
    def test_express_sets_the_inferred_emotion(self):
        m = _bare_movements()
        m.express("Bravissimo, ce l'hai fatta!")
        assert m._emotion.name == "celebrating"

    def test_set_emotion_accepts_name_or_object(self):
        m = _bare_movements()
        m.set_emotion("thinking")
        assert m._emotion.name == "thinking"
        m.set_emotion(emotions.HAPPY)
        assert m._emotion.name == "happy"
        m.set_emotion(None)
        assert m._emotion.name == "neutral"

    def test_mood_blends_in_gradually(self):
        from reachy_mini_mirrorbuddy.movements import _MOOD_TAU

        m = _bare_movements()
        m.set_emotion("celebrating")
        blended = m._mood["scale"]
        blended = _ease(blended, m._emotion.scale, _MOOD_TAU, 1 / 50.0)
        # After a single frame we are still nearly at the old mood, not the new one.
        assert blended < 1.05
        for _ in range(200):
            blended = _ease(blended, m._emotion.scale, _MOOD_TAU, 1 / 50.0)
        assert blended == pytest.approx(emotions.CELEBRATING.scale, abs=1e-2)


def _bare_movements():
    """A Movements instance without touching the SDK or the robot."""
    from reachy_mini_mirrorbuddy.movements import Movements

    return Movements(robot=object(), enabled=False)


def test_loop_rate_is_higher_than_the_old_thirty_hz():
    from reachy_mini_mirrorbuddy.movements import _LOOP_HZ

    assert _LOOP_HZ >= 50.0
    assert not math.isinf(_LOOP_HZ)
