"""More than one child in front of the robot, and a name used like a person uses it.

Two complaints, one fix. Buddy knew exactly one human — the paired account — so a
friend sitting down next to the child was addressed with the child's name, or not
addressed at all. And it said that one name in nearly every sentence, which is what
nobody does when talking to someone in the same room.

The roster is deliberately in-memory only: a friend's name is a third child's
personal data, and keeping it on the device past the power switch is a consent
decision their parents never made.
"""

from __future__ import annotations

import pytest

from reachy_mini_mirrorbuddy import people
from reachy_mini_mirrorbuddy.mirrorbuddy_client import Maestro
from reachy_mini_mirrorbuddy.prompt_builder import build_instructions


@pytest.fixture
def maestro():
    return Maestro(
        id="buddy",
        name="Buddy",
        display_name="Buddy",
        subject="",
        specialty="",
        voice="coral",
        voice_instructions="",
        teaching_style="",
        system_prompt="Sei Buddy.",
        greeting="Ciao!",
    )


class TestRoster:
    def test_starts_with_the_paired_child_alone(self):
        r = people.Roster("Mario")
        assert r.primary == "Mario"
        assert r.guests == ()
        assert r.everyone() == ["Mario"]

    def test_a_friend_introduces_themselves(self):
        r = people.Roster("Mario")
        assert r.add_guest("giulia") == "Giulia"
        assert r.guests == ("Giulia",)
        assert r.everyone() == ["Mario", "Giulia"]

    def test_the_same_friend_is_not_added_twice(self):
        r = people.Roster("Mario")
        r.add_guest("Giulia")
        assert r.add_guest("  giulia ") == "Giulia"
        assert r.guests == ("Giulia",)

    def test_the_paired_child_is_never_also_a_guest(self):
        r = people.Roster("Mario")
        assert r.add_guest("mario") == "Mario"
        assert r.guests == ()

    @pytest.mark.parametrize(
        "junk",
        [
            "",
            "   ",
            "pii:8f3a2b",  # a decryption miss must never become a person
            "[encrypted]",
            "12345",
            "Mario2",  # ASR digits: `\w` used to let these through
            "Giulia_",
            "M4rio",
            "!!!",
            "x" * 41,  # a whole sentence mistaken for a name
        ],
    )
    def test_junk_never_becomes_a_person(self, junk):
        r = people.Roster("Mario")
        assert r.add_guest(junk) is None
        assert r.guests == ()

    def test_a_ciphertext_primary_is_treated_as_no_name(self):
        # The server encrypts names; a miss puts ciphertext on the wire, and the
        # robot must stay silent about names rather than read a blob aloud.
        r = people.Roster("pii:8f3a2b")
        assert r.primary is None
        assert r.everyone() == []

    def test_the_room_does_not_grow_without_bound(self):
        r = people.Roster("Mario")
        for i in range(people.MAX_GUESTS + 4):
            r.add_guest(f"Amico{chr(ord('a') + i)}")
        assert len(r.guests) == people.MAX_GUESTS

    def test_everyone_can_leave(self):
        r = people.Roster("Mario")
        r.add_guest("Giulia")
        r.clear_guests()
        assert r.guests == ()
        assert r.primary == "Mario"  # the paired child stays

    def test_the_paired_child_can_introduce_themselves(self):
        # No STUDENT_NAME configured: the child says their own name out loud, and it
        # must land as the student — not as a guest standing next to a nobody.
        r = people.Roster(None)
        assert r.set_primary("mario") == "Mario"
        assert r.primary == "Mario"
        assert r.guests == ()

    def test_introducing_the_student_twice_does_not_duplicate_them(self):
        r = people.Roster(None)
        r.set_primary("Mario")
        r.add_guest("Mario")
        assert r.everyone() == ["Mario"]

    def test_a_promoted_guest_stops_being_a_guest(self):
        r = people.Roster(None)
        r.add_guest("Mario")
        assert r.set_primary("Mario") == "Mario"
        assert r.guests == ()
        assert r.everyone() == ["Mario"]

    def test_junk_never_becomes_the_student(self):
        r = people.Roster(None)
        assert r.set_primary("pii:8f3a2b") is None
        assert r.primary is None

    def test_a_compound_name_survives_intact(self):
        r = people.Roster(None)
        assert r.add_guest("maria luisa d'angelo") == "Maria Luisa D'Angelo"

    def test_nothing_is_written_to_disk(self, tmp_path, monkeypatch):
        monkeypatch.chdir(tmp_path)
        r = people.Roster("Mario")
        r.add_guest("Giulia")
        assert list(tmp_path.iterdir()) == []


class TestInstructions:
    def test_the_name_is_used_sparingly_not_every_sentence(self, maestro):
        text = build_instructions(maestro, student_name="Mario")
        assert "parsimonia" in text.lower()
        # The old instruction told the model to call the child by name, full stop.
        assert "Chiamalo per nome, con affetto." not in text

    def test_buddy_is_told_it_may_have_several_people_in_front_of_it(self, maestro):
        text = build_instructions(maestro, student_name="Mario")
        assert "remember_person" in text
        assert "chi sta parlando" in text

    def test_guests_are_named_in_the_session(self, maestro):
        r = people.Roster("Mario")
        r.add_guest("Giulia")
        text = build_instructions(maestro, student_name="Mario", roster=r)
        assert "Giulia" in text

    def test_without_a_usable_name_buddy_is_told_not_to_invent_one(self, maestro):
        text = build_instructions(maestro, student_name="pii:8f3a2b")
        assert "8f3a2b" not in text
        assert "non inventare" in text.lower()

    def test_the_safety_rules_still_come_first(self, maestro):
        text = build_instructions(maestro, student_name="Mario", roster=people.Roster("Mario"))
        assert text.index("REGOLE DI SICUREZZA") < text.lower().index("parsimonia")

    def test_once_someone_introduced_themselves_buddy_is_not_told_the_room_is_unknown(self, maestro):
        r = people.Roster(None)
        r.add_guest("Giulia")
        text = build_instructions(maestro, roster=r)
        assert "Giulia" in text
        assert "Non conosci il nome dello studente" not in text
