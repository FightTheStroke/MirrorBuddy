"""The app store card must show MirrorBuddy, not a stand-in.

The robot dashboard lists the app with whatever icon the published Space
carries. It shipped with a mirror emoji, so on the robot's own screen the
tutor a family installed was represented by a glyph that appears nowhere in
MirrorBuddy: no brain mark, no relation to the product the child uses on the
web. The card is the first thing anyone sees, and it was wrong.

A card is only ever published by `publish-space.sh`, so the icon has to be
staged by that script as well as declared in the front-matter — declaring it
alone would point the store at a file it never receives.
"""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPACE = ROOT / "space"
ICON = SPACE / "icon.png"
# The eight-byte PNG signature. Reading the header beats trusting the suffix:
# a renamed file would be published and then fail to render in the store.
PNG_MAGIC = b"\x89PNG\r\n\x1a\n"


def _front_matter(path: Path) -> str:
    text = path.read_text()
    assert text.startswith("---\n"), f"{path.name} has no front-matter block"
    return text.split("---\n", 2)[1]


class TestTheStoreCardCarriesTheMirrorBuddyMark:
    def test_the_icon_is_a_real_png(self):
        assert ICON.exists(), "space/icon.png is missing"
        assert ICON.read_bytes()[:8] == PNG_MAGIC

    def test_the_card_points_at_that_icon(self):
        assert "thumbnail:" in _front_matter(SPACE / "README.md")
        assert "icon.png" in _front_matter(SPACE / "README.md")

    def test_the_publish_script_stages_the_icon(self):
        # Declared but unstaged means the store resolves the thumbnail to a 404.
        assert "space/icon.png" in (ROOT / "publish-space.sh").read_text()

    def test_the_fallback_emoji_is_not_the_mirror(self):
        # Clients that ignore the thumbnail fall back to the emoji, so it has to
        # be defensible on its own.
        assert "🪞" not in _front_matter(SPACE / "README.md")
