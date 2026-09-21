"""Preserve upstream pairing failure meaning without exposing upstream details."""

import httpx
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from reachy_mini_mirrorbuddy.settings_ui import mount_settings_routes


@pytest.mark.parametrize("upstream,expected,message", [
    (429, 429, "troppi tentativi"),
    (503, 502, "servizio"),
    (500, 502, "servizio"),
    (400, 400, "codice non valido"),
])
def test_pairing_errors_are_actionable(monkeypatch, tmp_path, upstream, expected, message):
    monkeypatch.setenv("MIRRORBUDDY_CONFIG_DIR", str(tmp_path))
    monkeypatch.setattr(httpx, "post", lambda *a, **k: httpx.Response(
        upstream, json={"error": "private upstream detail"},
    ))
    app = FastAPI()
    mount_settings_routes(app, str(tmp_path))
    response = TestClient(app).post("/api/pair", json={"code": "123456"})
    assert response.status_code == expected
    assert message in response.json()["error"]
    assert response.json()["ok"] is False
    assert "private upstream detail" not in response.text
