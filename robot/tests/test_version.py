"""The robot must be able to say which build it is running.

Today's whole debugging session was spent guessing whether the code on the device
matched the code in the repo — a merged feature was invisible for hours and the
only way to tell was reading journal lines for behaviour that should exist. The
package has reported version 0.1.0 since the first commit, so it could never
answer the question.
"""

from __future__ import annotations

import re
import sys
import tomllib
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import reachy_mini_mirrorbuddy  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]


class TestTheBuildIdentifiesItself:
    def test_the_package_exposes_a_version(self):
        assert re.fullmatch(r"\d+\.\d+\.\d+", reachy_mini_mirrorbuddy.__version__)

    def test_it_matches_what_gets_packaged_and_published(self):
        # These drift the moment they are maintained in two places by hand, and a
        # wrong version is worse than none: it is a confident lie about the device.
        declared = tomllib.loads((ROOT / "pyproject.toml").read_text())["project"]["version"]

        assert reachy_mini_mirrorbuddy.__version__ == declared

    def test_it_is_no_longer_the_placeholder(self):
        assert reachy_mini_mirrorbuddy.__version__ != "0.1.0"

    def test_startup_announces_it(self):
        # It has to reach the journal: that is the only surface available when the
        # robot is in another room and something is wrong.
        source = (ROOT / "reachy_mini_mirrorbuddy" / "main.py").read_text()

        assert "__version__" in source
