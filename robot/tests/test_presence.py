"""Presence: the robot must notice whether the child is actually there.

The detector flickers, and Mario has cerebral palsy — he moves, he leans out of
frame, he turns away. So the interesting cases here are not "does it see a face"
but "does it refuse to over-react to one that comes and goes".
"""

from __future__ import annotations

import pytest

from reachy_mini_mirrorbuddy import presence
from reachy_mini_mirrorbuddy.presence import PresenceTracker


@pytest.fixture
def tracker():
    return PresenceTracker(arrive_after=1.0, leave_after=10.0, same_visit=60.0)


def feed(tracker, detected: bool, start: float, duration: float, step: float = 0.33):
    """Hold ``detected`` steady for ``duration`` seconds; return (events, end time)."""
    events, t = [], start
    while t <= start + duration:
        e = tracker.update(detected, t)
        if e:
            events.append((e, t))
        t += step
    return events, t


class TestArriving:
    def test_a_face_that_stays_counts_as_arrival(self, tracker):
        events, _ = feed(tracker, True, 0.0, 2.0)
        assert [e for e, _ in events] == [presence.ARRIVED]
        assert tracker.state.present is True

    def test_arrival_is_not_declared_instantly(self, tracker):
        assert tracker.update(True, 0.0) is None
        assert tracker.update(True, 0.5) is None
        assert tracker.state.present is False

    def test_arrival_is_reported_only_once(self, tracker):
        events, _ = feed(tracker, True, 0.0, 30.0)
        assert len(events) == 1


class TestLeaving:
    def test_a_brief_disappearance_is_not_a_departure(self, tracker):
        _, t = feed(tracker, True, 0.0, 2.0)
        # He leans down to pick up a pen for four seconds.
        events, t = feed(tracker, False, t, 4.0)
        assert events == []
        assert tracker.state.present is True

    def test_really_leaving_is_eventually_noticed(self, tracker):
        _, t = feed(tracker, True, 0.0, 2.0)
        events, _ = feed(tracker, False, t, 12.0)
        assert [e for e, _ in events] == [presence.LEFT]
        assert tracker.state.present is False

    def test_leaving_is_much_more_patient_than_arriving(self):
        t = PresenceTracker()
        # Telling a child "you left" while he bends over is worse than saying nothing.
        assert t.leave_after >= 5 * t.arrive_after

    def test_flicker_never_produces_an_event(self, tracker):
        events, t = feed(tracker, True, 0.0, 2.0)
        now = t
        for i in range(60):  # alternating detection, ~20 s of noise
            e = tracker.update(i % 2 == 0, now)
            assert e is None
            now += 0.33


class TestComingBack:
    def test_a_short_absence_is_the_same_visit(self, tracker):
        _, t = feed(tracker, True, 0.0, 2.0)
        _, t = feed(tracker, False, t, 12.0)  # LEFT
        events, _ = feed(tracker, True, t + 20.0, 2.0)  # back after 20s
        assert events == []  # not worth a "bentornato"

    def test_a_long_absence_earns_a_welcome_back(self, tracker):
        _, t = feed(tracker, True, 0.0, 2.0)
        _, t = feed(tracker, False, t, 12.0)
        events, _ = feed(tracker, True, t + 120.0, 2.0)
        assert [e for e, _ in events] == [presence.RETURNED]

    def test_away_for_is_zero_while_present(self, tracker):
        feed(tracker, True, 0.0, 2.0)
        assert tracker.away_for(5.0) == 0.0


class TestHowTheGreetingAddressesTheChild:
    """Being called by a stranger's name is a small betrayal a child remembers."""

    @staticmethod
    def _clause(name):
        from reachy_mini_mirrorbuddy.controller import Controller

        c = Controller.__new__(Controller)
        c.cfg = type("Cfg", (), {"STUDENT_NAME": name})()
        return c._name_clause()

    def test_a_known_name_is_handed_to_the_model(self):
        assert "Mario" in self._clause("Mario")

    def test_no_name_means_an_explicit_ban_on_inventing_one(self):
        clause = self._clause(None)
        assert "senza usare nomi" in clause

    def test_ciphertext_never_reaches_the_greeting(self):
        clause = self._clause("pii:v1:yO6kRLN95WvcdZfsME")
        assert "pii" not in clause
        assert "senza usare nomi" in clause

    def test_a_failed_decryption_placeholder_is_refused(self):
        assert "senza usare nomi" in self._clause("[decryption-failed]")
