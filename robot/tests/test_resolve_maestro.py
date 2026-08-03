"""Picking the right professor from what a child actually says.

A child asks for "scienze motorie", not for the subject code ``sport``. Before this
was handled, the loose match sent that request to Darwin (shared word: "scienze"),
and Buddy then looped through apologies while the child waited. Choosing the wrong
teacher is worse than admitting there isn't one.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from reachy_mini_mirrorbuddy.mirrorbuddy_client import Maestro  # noqa: E402
from reachy_mini_mirrorbuddy.tools import resolve_maestro  # noqa: E402


def _m(mid: str, name: str, subject: str, specialty: str) -> Maestro:
    return Maestro(
        id=mid,
        name=name,
        display_name=name,
        subject=subject,
        specialty=specialty,
        voice="alloy",
        voice_instructions="",
        teaching_style="",
        system_prompt="",
        greeting="",
    )


ROSTER = [
    _m("darwin", "Darwin", "biology", "Scienze Naturali ed Evoluzione"),
    _m("simone", "Simone Barlaam", "sport", "Sport e Movimento"),
    _m("euclide", "Euclide", "mathematics", "Geometria"),
    _m("manzoni", "Manzoni", "italian", "Letteratura Italiana"),
]


class TestSpokenSubjectNames:
    def test_scienze_motorie_reaches_the_sport_teacher(self):
        assert resolve_maestro(ROSTER, "scienze motorie").id == "simone"

    def test_educazione_fisica_reaches_the_sport_teacher(self):
        assert resolve_maestro(ROSTER, "educazione fisica").id == "simone"

    def test_scienze_alone_still_reaches_darwin(self):
        assert resolve_maestro(ROSTER, "scienze").id == "darwin"

    def test_italian_school_name_reaches_the_right_teacher(self):
        assert resolve_maestro(ROSTER, "matematica").id == "euclide"
        assert resolve_maestro(ROSTER, "italiano").id == "manzoni"


class TestByName:
    def test_exact_name(self):
        assert resolve_maestro(ROSTER, "Euclide").id == "euclide"

    def test_name_inside_a_sentence(self):
        assert resolve_maestro(ROSTER, "vorrei parlare con Darwin").id == "darwin"


class TestNoGuessing:
    def test_unknown_subject_returns_none(self):
        """Better to say "I don't have that" than to hand the child the wrong teacher."""
        assert resolve_maestro(ROSTER, "diritto internazionale") is None

    def test_empty_query(self):
        assert resolve_maestro(ROSTER, "") is None

    def test_empty_roster(self):
        assert resolve_maestro([], "matematica") is None


class TestNoiseNeverSwitchesTeacher:
    """Silence is the right answer when the child said nothing matchable."""

    def test_a_query_of_only_short_words_matches_nobody(self):
        # No token survives the length filter, so nothing can legitimately match.
        assert resolve_maestro(ROSTER, "ai") is None
        assert resolve_maestro(ROSTER, "e la") is None

    def test_an_unrelated_word_matches_nobody(self):
        assert resolve_maestro(ROSTER, "frigorifero") is None

    def test_real_requests_still_resolve(self):
        assert resolve_maestro(ROSTER, "scienze motorie").id == "simone"
