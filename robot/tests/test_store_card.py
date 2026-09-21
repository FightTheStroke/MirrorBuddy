"""The app store card must show MirrorBuddy, and must still publish.

The robot dashboard lists the app with whatever icon the published Space
carries. It shipped with a mirror emoji, so on the robot's own screen the
tutor a family installed was represented by a glyph that appears nowhere in
MirrorBuddy: no brain mark, no relation to the product the child uses on the
web. The card is the first thing anyone sees, and it was wrong.

The first fix was worse than the bug. It added ``space/icon.png`` to the staged
Space, and Hugging Face refuses a plain git push carrying binary files:

    Your push was rejected because it contains binary files.
    Offending files:
      - icon.png

So every publish failed from that moment on and the store silently kept serving
the previous release — the exact failure ``--check`` exists to catch. The card
therefore points at the icon the production site already serves: one canonical
mark, no binary in the Space, no way for this to fail again. These tests hold
that shape.
"""

from __future__ import annotations

import re
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
SPACE = ROOT / "space"
PUBLISH = ROOT / "publish-space.sh"

# Anything Hugging Face's pre-receive hook rejects on a plain git push.
BINARY_SUFFIXES = (".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".mp4", ".bin")


def _front_matter(path: Path) -> str:
    text = path.read_text()
    assert text.startswith("---\n"), f"{path.name} has no front-matter block"
    return text.split("---\n", 2)[1]


def _thumbnail() -> str:
    match = re.search(r"^thumbnail:\s*(\S+)", _front_matter(SPACE / "README.md"), re.M)
    assert match, "the card declares no thumbnail"
    return match.group(1)


class TestTheStoreCardCarriesTheMirrorBuddyMark:
    def test_the_card_points_at_an_absolute_icon_url(self):
        assert _thumbnail().startswith("https://"), "the thumbnail must be an absolute URL"

    def test_the_icon_is_served_by_mirrorbuddy_itself(self):
        # A Space-relative icon is what broke publishing; a third-party host
        # would put the product mark outside anyone's control. Compare the host
        # exactly: a substring check would accept mirrorbuddy.org.example.com.
        host = urlsplit(_thumbnail()).hostname
        assert host in {"mirrorbuddy.org", "www.mirrorbuddy.org"}, f"unexpected icon host: {host}"

    def test_the_fallback_emoji_is_not_the_mirror(self):
        # Clients that ignore the thumbnail fall back to the emoji, so it has to
        # be defensible on its own.
        assert "\U0001fa9e" not in _front_matter(SPACE / "README.md")


class TestThePublishedSpaceStaysPushable:
    def test_no_binary_file_sits_in_the_space_folder(self):
        offenders = [p.name for p in SPACE.iterdir() if p.suffix.lower() in BINARY_SUFFIXES]
        assert not offenders, (
            f"Hugging Face rejects a plain git push carrying {offenders}. "
            "Serve the asset over https instead of staging it."
        )

    def test_the_publish_script_stages_no_binary(self):
        staged = re.findall(r"space/(\S+)", PUBLISH.read_text())
        offenders = [n for n in staged if Path(n).suffix.lower() in BINARY_SUFFIXES]
        assert not offenders, f"publish-space.sh stages binary files: {offenders}"

    def test_the_publish_script_refuses_binaries_before_pushing(self):
        # A guard that fails while staging beats a rejected push nobody reads.
        assert "binary" in PUBLISH.read_text().lower()
