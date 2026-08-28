"""Tests for the runtime voice-credential fetch (no network: httpx is stubbed)."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from reachy_mini_mirrorbuddy import device as device_mod  # noqa: E402
from reachy_mini_mirrorbuddy.device import (  # noqa: E402
    RealtimeCredentials,
    apply_realtime_credentials,
    fetch_realtime_credentials,
)


class _FakeResponse:
    def __init__(self, status_code: int, payload: dict | None = None) -> None:
        self.status_code = status_code
        self._payload = payload or {}

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")

    def json(self) -> dict:
        return self._payload


class _FakeConfig:
    AZURE_ENDPOINT = None
    AZURE_API_KEY = None
    AZURE_DEPLOYMENT = None
    AZURE_API_VERSION = None


def _stub_get(monkeypatch, response, captured=None):
    def fake_get(url, timeout=None, headers=None):
        if captured is not None:
            captured["url"] = url
            captured["headers"] = headers
        if isinstance(response, Exception):
            raise response
        return response

    monkeypatch.setattr(device_mod.httpx, "get", fake_get)


def test_fetch_returns_credentials(monkeypatch):
    captured: dict = {}
    _stub_get(
        monkeypatch,
        _FakeResponse(
            200,
            {
                "endpoint": "https://example.openai.azure.com/",
                "apiKey": "secret",
                "deployment": "gpt-realtime",
                "apiVersion": None,
            },
        ),
        captured,
    )

    creds = fetch_realtime_credentials("https://mirrorbuddy.org", "tok")

    assert creds == RealtimeCredentials(
        endpoint="https://example.openai.azure.com/",
        api_key="secret",
        deployment="gpt-realtime",
        api_version=None,
    )
    assert captured["url"].endswith("/api/devices/realtime-credentials")
    assert captured["headers"]["authorization"] == "Bearer tok"


def test_fetch_returns_none_on_rejected_token(monkeypatch):
    _stub_get(monkeypatch, _FakeResponse(401))
    assert fetch_realtime_credentials("https://mirrorbuddy.org", "bad") is None


def test_fetch_returns_none_when_server_has_no_credentials(monkeypatch):
    _stub_get(monkeypatch, _FakeResponse(503))
    assert fetch_realtime_credentials("https://mirrorbuddy.org", "tok") is None


def test_fetch_returns_none_on_network_failure(monkeypatch):
    _stub_get(monkeypatch, RuntimeError("boom"))
    assert fetch_realtime_credentials("https://mirrorbuddy.org", "tok") is None


def test_fetch_returns_none_on_incomplete_payload(monkeypatch):
    _stub_get(monkeypatch, _FakeResponse(200, {"endpoint": "https://x/", "apiKey": ""}))
    assert fetch_realtime_credentials("https://mirrorbuddy.org", "tok") is None


def test_apply_sets_config_values():
    cfg = _FakeConfig()
    apply_realtime_credentials(
        cfg,
        RealtimeCredentials(
            endpoint="https://example.openai.azure.com/",
            api_key="secret",
            deployment="gpt-realtime",
            api_version="2024-10-01-preview",
        ),
    )
    assert cfg.AZURE_ENDPOINT == "https://example.openai.azure.com/"
    assert cfg.AZURE_API_KEY == "secret"
    assert cfg.AZURE_DEPLOYMENT == "gpt-realtime"
    assert cfg.AZURE_API_VERSION == "2024-10-01-preview"


def test_apply_keeps_local_deployment_when_server_omits_it():
    cfg = _FakeConfig()
    cfg.AZURE_DEPLOYMENT = "local-deployment"
    apply_realtime_credentials(
        cfg,
        RealtimeCredentials(
            endpoint="https://example.openai.azure.com/",
            api_key="secret",
            deployment=None,
            api_version=None,
        ),
    )
    assert cfg.AZURE_DEPLOYMENT == "local-deployment"
