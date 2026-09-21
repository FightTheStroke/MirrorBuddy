"""The publish script must report the reason a push was refused.

For three days the app store served an old MirrorBuddy while the script insisted
the token lacked write access. The token was fine: the Hub was rejecting a binary
file. The real message was on stderr, and the script threw it away, so the
diagnosis started from a false statement. These tests make the script repeat what
the remote said — without leaking the credential that is embedded in the URL.
"""

from __future__ import annotations

import os
import stat
import subprocess
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "publish-space.sh"
TOKEN = "hf_averysecrettokenvalue"

GIT_STUB = """#!/usr/bin/env bash
case "$1" in
  clone)
    target="${@: -1}"
    mkdir -p "$target/.git"
    ;;
  diff)
    exit 1
    ;;
  push)
    echo "remote: Your push was rejected because it contains binary files." >&2
    echo "remote: Offending files: icon.png" >&2
    echo "error: failed to push some refs" >&2
    exit 1
    ;;
esac
exit 0
"""

CLONE_FAIL_STUB = """#!/usr/bin/env bash
case "$1" in
  clone)
    echo "remote: Repository not found." >&2
    echo "fatal: authentication failed" >&2
    exit 1
    ;;
esac
exit 0
"""


def _run_with_stub(tmp_path: Path, stub: str) -> subprocess.CompletedProcess[str]:
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir()
    fake_git = bin_dir / "git"
    fake_git.write_text(stub)
    fake_git.chmod(fake_git.stat().st_mode | stat.S_IEXEC)

    env = dict(os.environ)
    env["PATH"] = f"{bin_dir}:{env['PATH']}"
    env["HF_TOKEN"] = TOKEN
    return subprocess.run(
        ["bash", str(SCRIPT)],
        capture_output=True,
        text=True,
        env=env,
        timeout=120,
    )


def test_push_failure_repeats_the_remote_message(tmp_path: Path) -> None:
    result = _run_with_stub(tmp_path, GIT_STUB)

    assert result.returncode != 0
    combined = result.stdout + result.stderr
    assert "rejected because it contains binary files" in combined
    assert "icon.png" in combined


def test_push_failure_does_not_leak_the_token(tmp_path: Path) -> None:
    result = _run_with_stub(tmp_path, GIT_STUB)

    combined = result.stdout + result.stderr
    assert TOKEN not in combined


def test_push_failure_still_names_the_likely_cause(tmp_path: Path) -> None:
    """The old hint stays, demoted to a hint, because it is sometimes right."""
    result = _run_with_stub(tmp_path, GIT_STUB)

    combined = result.stdout + result.stderr
    assert "write access" in combined


def test_clone_failure_repeats_the_remote_message(tmp_path: Path) -> None:
    result = _run_with_stub(tmp_path, CLONE_FAIL_STUB)

    assert result.returncode != 0
    combined = result.stdout + result.stderr
    assert "Repository not found" in combined
    assert TOKEN not in combined
