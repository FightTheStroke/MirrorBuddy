"""Take the newest published MirrorBuddy at boot, or carry on with this one.

Families do not read release notes, and nobody in a home will open a dashboard to
press Update. The robot's own daemon knows whether a newer version is published in
the app store, so at boot we ask it, and apply the update before MirrorBuddy
starts — which is safe now that the configuration lives outside the package
(see ``paths``) and can no longer be erased by an install.

One rule governs everything below: **an update must never be the reason a child
has no robot today.** Every failure is logged and stepped over, and the exit code
is always success so the boot sequence continues regardless.
"""

from __future__ import annotations

import argparse
import json
import logging
import threading
import time
import urllib.request

logger = logging.getLogger(__name__)

APP_NAME = "reachy_mini_mirrorbuddy"
DAEMON = "http://127.0.0.1:8000"
_MAX_WAIT_S = 300.0
_POLL_S = 5.0


def _http(url: str, method: str = "GET", timeout: float = 30.0) -> str:
    request = urllib.request.Request(url, method=method)  # noqa: S310 - fixed localhost URL
    with urllib.request.urlopen(request, timeout=timeout) as response:  # noqa: S310
        return response.read().decode("utf-8")


def run(
    fetch=_http,
    daemon: str = DAEMON,
    app: str = APP_NAME,
    max_wait_s: float = _MAX_WAIT_S,
    poll_s: float = _POLL_S,
) -> bool:
    """Apply a published update if there is one. Returns True only if it landed."""
    try:
        if not _update_is_published(fetch, daemon, app):
            logger.info("%s is already the published version", app)
            return False
        job_id = _start_update(fetch, daemon, app)
        if not job_id:
            return False
        return _wait_for(fetch, daemon, job_id, max_wait_s, poll_s)
    except Exception as e:  # noqa: BLE001 - deliberate: boot must continue
        logger.warning("Skipping the update check (%s); starting on this version", e)
        return False


def _update_is_published(fetch, daemon: str, app: str) -> bool:
    body = _json(fetch(f"{daemon}/api/apps/check-updates", timeout=60))
    for entry in body.get("apps_with_updates") or []:
        if entry.get("app_name") == app and entry.get("update_available"):
            return True
    return False


def _start_update(fetch, daemon: str, app: str) -> str | None:
    try:
        body = _json(fetch(f"{daemon}/api/apps/update/{app}", method="POST", timeout=60))
    except Exception as e:  # noqa: BLE001 - the robot must still start
        logger.warning("The robot refused the update (%s); keeping this version", e)
        return None
    job_id = body.get("job_id")
    if not job_id:
        logger.warning("The robot accepted no update job; keeping this version")
        return None
    logger.info("Updating %s from the app store", app)
    return str(job_id)


def _wait_for(fetch, daemon: str, job_id: str, max_wait_s: float, poll_s: float) -> bool:
    deadline = time.monotonic() + max_wait_s
    while time.monotonic() < deadline:
        try:
            status = _json(fetch(f"{daemon}/api/apps/job-status/{job_id}")).get("status", "")
        except Exception as e:  # noqa: BLE001 - the robot must still start
            logger.warning("Lost sight of the update (%s); keeping this version", e)
            return False
        if status in ("done", "completed", "success"):
            logger.info("Updated. Starting the new version.")
            return True
        if status in ("failed", "error"):
            logger.warning("The update did not install; starting the version already here")
            return False
        time.sleep(poll_s)
    logger.warning("The update is taking too long; starting the version already here")
    return False


def _json(raw: str) -> dict:
    try:
        parsed = json.loads(raw)
    except (TypeError, ValueError):
        return {}
    return parsed if isinstance(parsed, dict) else {}


def main(argv: list[str] | None = None) -> int:
    """Boot entry point. Always returns 0: booting must not depend on the store."""
    parser = argparse.ArgumentParser(description="Update MirrorBuddy from the app store.")
    parser.add_argument("--daemon", default=DAEMON)
    parser.add_argument("--timeout", type=float, default=_MAX_WAIT_S)
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="mirrorbuddy-update: %(message)s")
    try:
        updated = run(daemon=args.daemon, max_wait_s=args.timeout)
    except Exception as e:  # noqa: BLE001 - nothing here may stop the boot
        print(f"mirrorbuddy-update: skipped ({e})")
        return 0
    print("mirrorbuddy-update: updated" if updated else "mirrorbuddy-update: already current")
    return 0


if __name__ == "__main__":  # pragma: no cover - process entry point
    raise SystemExit(main())


def start_background_check(enabled: bool = True, runner=run) -> threading.Thread | None:
    """Check for a published update without ever delaying the robot's start.

    The check runs on a daemon thread: a slow or unreachable app store must not
    keep a child waiting, and an update that lands simply takes effect the next
    time MirrorBuddy starts. Returns ``None`` when the check is switched off.
    """
    if not enabled:
        logger.info("Automatic updates are disabled on this robot")
        return None

    def _guarded() -> None:
        try:
            runner()
        except Exception as e:  # noqa: BLE001 - deliberate: the app must keep running
            logger.warning("Background update check failed (%s); carrying on", e)

    thread = threading.Thread(target=_guarded, name="mirrorbuddy-self-update", daemon=True)
    thread.start()
    return thread
