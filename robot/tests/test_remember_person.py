"""A friend says their name and Buddy actually keeps it — for this session.

The failure this pins: the model would happily *say* "piacere Giulia!" and then
address her as Mario two turns later, because nothing on the device ever recorded
that a second person existed. The tool is what turns the courtesy into state.
"""

from __future__ import annotations

import pytest

from reachy_mini_mirrorbuddy import people, tools
from reachy_mini_mirrorbuddy.tool_handlers import ToolCallMixin


class FakeClient:
    def __init__(self):
        self.results: list[tuple[str, str, bool]] = []

    def send_function_result(self, call_id, text, respond=True):
        self.results.append((call_id, text, respond))


class Buddy(ToolCallMixin):
    """The tool surface of Controller, without the robot underneath it."""

    def __init__(self, primary="Mario"):
        self.people = people.Roster(primary)
        self._client = FakeClient()
        self.maestri = []


@pytest.fixture
def buddy():
    return Buddy()


def _said(buddy):
    return " ".join(text for _, text, _ in buddy._client.results)


class TestRememberPerson:
    def test_the_tool_is_offered_to_the_model(self):
        assert any(t["name"] == "remember_person" for t in tools.TOOL_SCHEMAS)

    def test_a_new_friend_is_added_to_the_room(self, buddy):
        buddy._on_tool_call("remember_person", {"name": "Giulia"}, "c1")

        assert buddy.people.guests == ("Giulia",)
        assert "Giulia" in _said(buddy)

    def test_the_answer_lists_who_is_in_the_room(self, buddy):
        buddy._on_tool_call("remember_person", {"name": "Giulia"}, "c1")
        buddy._on_tool_call("remember_person", {"name": "Luca"}, "c2")

        last = buddy._client.results[-1][1]
        assert "Mario" in last and "Giulia" in last and "Luca" in last

    def test_an_unusable_name_is_reported_not_invented(self, buddy):
        buddy._on_tool_call("remember_person", {"name": "   "}, "c1")

        assert buddy.people.guests == ()
        # Buddy must ask again rather than silently pretend it understood.
        assert "chiedi" in _said(buddy).lower()

    def test_ciphertext_is_never_accepted_as_a_name(self, buddy):
        buddy._on_tool_call("remember_person", {"name": "pii:8f3a2b"}, "c1")

        assert buddy.people.guests == ()
        assert "8f3a2b" not in _said(buddy)

    def test_a_missing_argument_does_not_crash_the_session(self, buddy):
        buddy._on_tool_call("remember_person", {}, "c1")

        assert buddy.people.guests == ()
        assert buddy._client.results  # the model always gets an answer back


class TestWhoIsHere:
    def test_buddy_can_recall_the_room(self, buddy):
        buddy.people.add_guest("Giulia")

        buddy._on_tool_call("who_is_here", {}, "c1")

        assert "Mario" in _said(buddy) and "Giulia" in _said(buddy)

    def test_an_empty_room_is_stated_plainly(self):
        b = Buddy(primary=None)

        b._on_tool_call("who_is_here", {}, "c1")

        assert "non so" in _said(b).lower()
