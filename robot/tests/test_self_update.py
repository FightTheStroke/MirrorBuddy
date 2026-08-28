"""A robot switched on takes the newest published MirrorBuddy — or carries on.

Families do not read release notes, and nobody in a home is going to open a
dashboard to press Update. So the robot does it itself at boot, from the app store.

The rule that shapes every decision here: **an update must never be the reason a
child has no robot today.** Anything unexpected — no network, a slow store, a
refused install — is logged and stepped over, and the robot starts on the version
it already has.
"""

from __future__ import annotations

import json

import pytest

from reachy_mini_mirrorbuddy import self_update

APP = "reachy_mini_mirrorbuddy"


class _Daemon:
    """A stand-in for the robot's local daemon."""

    def __init__(self, updates=None, job_states=None, fail_on=None):
        self.updates = updates if updates is not None else []
        self.job_states = list(job_states or ["done"])
        self.fail_on = fail_on or set()
        self.calls: list[str] = []

    def __call__(self, url, method="GET", timeout=10):
        self.calls.append(f"{method} {url}")
        for marker in self.fail_on:
            if marker in url:
                raise OSError("the store is unreachable")
        if "check-updates" in url:
            return json.dumps({"apps_with_updates": self.updates})
        if "/api/apps/update/" in url:
            return json.dumps({"job_id": "job-1"})
        if "job-status" in url:
            state = self.job_states.pop(0) if self.job_states else "done"
            return json.dumps({"status": state, "logs": []})
        raise AssertionError(f"unexpected call: {url}")


def _update_for(app=APP):
    return [{"app_name": app, "update_available": True, "space_id": "Roberdan/mirrorbuddy"}]


class TestTheRobotTakesTheNewVersion:
    def test_it_installs_when_a_newer_version_is_published(self):
        daemon = _Daemon(updates=_update_for())

        assert self_update.run(fetch=daemon) is True
        assert any("/api/apps/update/" + APP in c for c in daemon.calls)

    def test_it_does_nothing_when_already_current(self):
        daemon = _Daemon(updates=[])

        assert self_update.run(fetch=daemon) is False
        assert not any("/api/apps/update/" in c for c in daemon.calls)

    def test_it_ignores_updates_for_other_apps(self):
        daemon = _Daemon(updates=_update_for("some_other_app"))

        assert self_update.run(fetch=daemon) is False
        assert not any("/api/apps/update/" in c for c in daemon.calls)


class TestAnUpdateNeverCostsAChildTheirRobot:
    def test_an_unreachable_store_is_stepped_over(self):
        daemon = _Daemon(fail_on={"check-updates"})

        assert self_update.run(fetch=daemon) is False

    def test_a_refused_install_is_stepped_over(self):
        daemon = _Daemon(updates=_update_for(), fail_on={"/api/apps/update/"})

        assert self_update.run(fetch=daemon) is False

    def test_a_failed_install_job_is_reported_but_not_raised(self):
        daemon = _Daemon(updates=_update_for(), job_states=["failed"])

        assert self_update.run(fetch=daemon) is False

    def test_it_gives_up_instead_of_waiting_for_ever(self):
        daemon = _Daemon(updates=_update_for(), job_states=["running"] * 500)

        assert self_update.run(fetch=daemon, max_wait_s=0.2, poll_s=0.01) is False

    def test_nothing_it_meets_is_allowed_to_raise(self):
        def hostile(url, method="GET", timeout=10):
            return "this is not json"

        assert self_update.run(fetch=hostile) is False


class TestItIsUsableFromTheBootScript:
    def test_the_command_line_entry_point_always_succeeds(self, monkeypatch):
        monkeypatch.setattr(self_update, "run", lambda **kw: (_ for _ in ()).throw(RuntimeError()))

        assert self_update.main([]) == 0

    @pytest.mark.parametrize("updated", [True, False])
    def test_it_reports_what_it_did(self, monkeypatch, capsys, updated):
        monkeypatch.setattr(self_update, "run", lambda **kw: updated)

        assert self_update.main([]) == 0
        assert capsys.readouterr().out.strip() != ""


def test_background_check_is_skipped_when_disabled():
    from reachy_mini_mirrorbuddy.self_update import start_background_check

    calls = []
    thread = start_background_check(enabled=False, runner=lambda: calls.append(1))
    assert thread is None
    assert calls == []


def test_background_check_runs_off_the_startup_path():
    from reachy_mini_mirrorbuddy.self_update import start_background_check

    calls = []
    thread = start_background_check(enabled=True, runner=lambda: calls.append(1))
    assert thread is not None
    assert thread.daemon is True
    thread.join(timeout=5)
    assert calls == [1]


def test_background_check_never_raises_into_the_app():
    from reachy_mini_mirrorbuddy.self_update import start_background_check

    def boom():
        raise RuntimeError("store unreachable")

    thread = start_background_check(enabled=True, runner=boom)
    assert thread is not None
    thread.join(timeout=5)
    assert not thread.is_alive()
