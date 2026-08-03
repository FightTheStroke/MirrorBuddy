"""The settings page must actually persist what a parent types into it.

This is a regression test for a silent failure: because ``Request`` was imported
inside the mount function while annotations were postponed, FastAPI could not
resolve the annotation, treated ``request`` as a query parameter, and answered
every save with "Field required". The page looked fine and saved nothing —
volume, student name and the pairing code all quietly went nowhere.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

fastapi = pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402

from reachy_mini_mirrorbuddy.settings_ui import mount_settings_routes  # noqa: E402


@pytest.fixture()
def client(tmp_path: Path) -> TestClient:
    app = fastapi.FastAPI()
    mount_settings_routes(app, str(tmp_path))
    return TestClient(app)


def test_saving_settings_persists_to_the_env_file(client: TestClient, tmp_path: Path) -> None:
    r = client.post(
        "/api/config",
        json={"MIRRORBUDDY_STUDENT_NAME": "Mario", "MIRRORBUDDY_OUTPUT_GAIN": "4.5"},
    )
    assert r.status_code == 200, r.text
    assert r.json().get("ok") is True

    written = (tmp_path / ".env").read_text()
    assert "MIRRORBUDDY_STUDENT_NAME=Mario" in written
    assert "MIRRORBUDDY_OUTPUT_GAIN=4.5" in written


def test_body_is_read_as_json_not_as_a_query_parameter(client: TestClient) -> None:
    """The exact shape of the original bug: a 422 asking for a 'request' query param."""
    r = client.post("/api/config", json={"MIRRORBUDDY_STUDENT_NAME": "Mario"})
    assert r.status_code != 422, f"body was not accepted: {r.text}"


def test_unknown_keys_are_ignored(client: TestClient, tmp_path: Path) -> None:
    client.post("/api/config", json={"EVIL_KEY": "x", "MIRRORBUDDY_STUDENT_NAME": "Mario"})
    assert "EVIL_KEY" not in (tmp_path / ".env").read_text()


def test_pairing_route_also_accepts_a_body(client: TestClient) -> None:
    r = client.post("/api/pair", json={"code": "000000"})
    assert r.status_code != 422, f"pairing body was not accepted: {r.text}"


def test_status_is_served(client: TestClient) -> None:
    r = client.get("/api/status")
    assert r.status_code == 200
    assert "outputGain" in r.json()
