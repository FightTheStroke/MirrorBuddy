"""The spoken roster must never silently drop a professor."""
from reachy_mini_mirrorbuddy import tools
from reachy_mini_mirrorbuddy.mirrorbuddy_client import Maestro


def _roster(n: int) -> list[Maestro]:
    return [
        Maestro(
            id=f"m{i}",
            name=f"Prof{i}",
            display_name=f"Prof{i}",
            subject=f"Sub{i}",
            specialty="",
            voice="alloy",
            voice_instructions="",
            teaching_style="",
            system_prompt="",
            greeting="",
        )
        for i in range(n)
    ]


def test_summary_lists_every_professor_beyond_the_old_26_cap():
    # Adding Loto made the roster 27 while the default cap stayed at 26, so the
    # last professor vanished from the list the robot reads out to the child.
    roster = _roster(27)

    summary = tools.professors_summary(roster)

    assert "Prof26" in summary
    assert summary.count(";") == 26
