"""The keeper must lift a robot to the published version, and do nothing else.

Roberto's robot sat three versions behind the store because nobody was watching:
the app worked, so the gap was invisible until a fix shipped and never arrived.
The keeper closes that gap, but an updater that acts when it should not is worse
than no updater at all — it restarts a robot a child is talking to. These tests
pin both halves: it updates when the versions differ, and it stays out of the way
when they match or the robot is unreachable.

The robot is replaced by stub `curl` and `ssh` on PATH, so nothing here touches a
real device or the app store.
"""

from __future__ import annotations

import os
import stat
import subprocess
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "tools" / "robot-keeper.sh"

CURL_STUB = """#!/usr/bin/env bash
# Records every call, then answers the way a robot daemon would.
echo "$@" >>"$CALLS"
url=""
for arg in "$@"; do
  case "$arg" in http*) url="$arg" ;; esac
done
case "$url" in
  *"/api/daemon/status"*)
    [ "${ROBOT_REACHABLE:-1}" = "1" ] || exit 7
    echo '{"status":"ok"}' ;;
  *raw/main/pyproject.toml*)
    echo 'version = "'"$STORE_VERSION"'"' ;;
  *"/api/apps/stop-current-app"*) echo '{}' ;;
  *"/api/apps/update/"*) echo '{"job_id":"job-1"}' ;;
  *"/api/apps/job-status/"*) echo '{"status":"done"}' ;;
  *"/api/apps/start-app/"*) echo '{}' ;;
  *"/api/apps/current-app-status"*) echo '{"state":"running"}' ;;
  *) echo '{}' ;;
esac
"""

SSH_STUB = """#!/usr/bin/env bash
echo "$INSTALLED_VERSION"
"""


def _write_stub(directory: Path, name: str, body: str) -> None:
    path = directory / name
    path.write_text(body)
    path.chmod(path.stat().st_mode | stat.S_IEXEC)


def run_keeper(tmp_path: Path, *, store: str, installed: str, reachable: str = "1"):
    """One pass of the keeper against a stubbed robot."""
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir(exist_ok=True)
    _write_stub(bin_dir, "curl", CURL_STUB)
    _write_stub(bin_dir, "ssh", SSH_STUB)
    calls = tmp_path / "calls.txt"
    calls.write_text("")

    env = dict(os.environ)
    env.update(
        {
            "PATH": f"{bin_dir}:{env['PATH']}",
            "CALLS": str(calls),
            "STORE_VERSION": store,
            "INSTALLED_VERSION": installed,
            "ROBOT_REACHABLE": reachable,
            "ROBOT_KEEPER_ONCE": "1",
            "ROBOT_KEEPER_SLEEP": "0",
        }
    )
    result = subprocess.run(
        ["bash", str(SCRIPT)],
        env=env,
        capture_output=True,
        text=True,
        timeout=60,
    )
    return result, calls.read_text()


def test_script_is_valid_bash():
    check = subprocess.run(["bash", "-n", str(SCRIPT)], capture_output=True, text=True)
    assert check.returncode == 0, check.stderr


def test_updates_a_robot_left_behind(tmp_path: Path):
    result, calls = run_keeper(tmp_path, store="0.41.0", installed="0.40.8")

    assert result.returncode == 0, result.stderr
    assert "/api/apps/update/reachy_mini_mirrorbuddy" in calls
    assert "/api/apps/start-app/reachy_mini_mirrorbuddy" in calls
    assert "0.40.8" in result.stdout and "0.41.0" in result.stdout


def test_leaves_a_current_robot_alone(tmp_path: Path):
    result, calls = run_keeper(tmp_path, store="0.41.0", installed="0.41.0")

    assert result.returncode == 0, result.stderr
    assert "/api/apps/update/" not in calls
    assert "/api/apps/stop-current-app" not in calls


def test_does_nothing_when_the_robot_is_offline(tmp_path: Path):
    result, calls = run_keeper(tmp_path, store="0.41.0", installed="0.40.8", reachable="0")

    assert result.returncode == 0, result.stderr
    assert "/api/apps/update/" not in calls
    assert "/api/apps/stop-current-app" not in calls


def test_never_prints_the_ssh_host_credentials(tmp_path: Path):
    result, _ = run_keeper(tmp_path, store="0.41.0", installed="0.40.8")

    assert "BatchMode" not in result.stdout
