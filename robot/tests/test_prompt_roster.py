"""Buddy must know who it can actually call.

Roberto asked for Fratello Loto by name and was told there is no meditation
teacher — while `call_professor` was working perfectly. The model was never
given the roster, so it answered from its own assumptions about what a tutoring
app contains, and a maestro it had never heard of could not exist. The journal
shows it inventing plausible colleagues ("Manzoni per italiano") rather than
reading a list.

A tool the model refuses to reach for is the same as a tool that does not work.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from reachy_mini_mirrorbuddy.mirrorbuddy_client import Maestro  # noqa: E402
from reachy_mini_mirrorbuddy.prompt_builder import build_instructions  # noqa: E402


def _m(mid: str, display: str, subject: str, specialty: str) -> Maestro:
    return Maestro(
        id=mid,
        name=display.split()[-1],
        display_name=display,
        subject=subject,
        specialty=specialty,
        voice="alloy",
        voice_instructions="",
        teaching_style="",
        system_prompt="",
        greeting="",
    )


ROSTER = [
    _m("loto", "Fratello Loto", "mindfulness", "Meditazione e Consapevolezza"),
    _m("euclide", "Euclide", "mathematics", "Geometria"),
    _m("omero", "Omero", "italian", "Poesia epica"),
]


class TestRosterIsInThePrompt:
    def test_the_prompt_names_every_other_professor(self):
        text = build_instructions(ROSTER[1], maestri=ROSTER)

        for maestro in ROSTER:
            if maestro.id == "euclide":
                continue
            assert maestro.display_name in text, maestro.display_name

    def test_a_maestro_the_model_would_not_guess_is_named(self):
        # The one that actually failed: nothing in a language model's priors says
        # a homework app has a mindfulness teacher.
        text = build_instructions(ROSTER[1], maestri=ROSTER)

        assert "Fratello Loto" in text
        assert "Meditazione e Consapevolezza" in text or "mindfulness" in text.lower()

    def test_the_roster_is_presented_as_the_complete_truth(self):
        # Without this the model treats the list as examples and keeps inventing.
        text = build_instructions(ROSTER[1], maestri=ROSTER)

        assert "solo" in text.lower() or "esatt" in text.lower() or "unic" in text.lower()

    def test_it_still_builds_when_the_roster_is_unavailable(self):
        # The fetch can fail; a robot with no list must still hold a conversation.
        text = build_instructions(ROSTER[1])

        assert text
        assert "call_professor" in text

    def test_the_current_maestro_is_not_offered_as_someone_to_call(self):
        # Buddy telling a child "I can call Fratello Loto" while being Fratello Loto
        # is how the switch loop started last time.
        text = build_instructions(ROSTER[0], maestri=ROSTER)

        assert "Euclide" in text
        offer = text.split("Puoi passare la parola")[-1]
        assert "Fratello Loto" not in offer
