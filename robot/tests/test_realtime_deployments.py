"""Configured deployment recovery must not turn unrelated failures into retries."""

import json
from urllib.parse import parse_qs, urlsplit

import pytest
import websockets
from websockets.datastructures import Headers
from websockets.exceptions import InvalidStatus
from websockets.http11 import Response

from reachy_mini_mirrorbuddy.azure_realtime import AzureRealtimeClient
from reachy_mini_mirrorbuddy.config import Config


@pytest.fixture
def env(monkeypatch):
    monkeypatch.setenv("PYTHON_DOTENV_DISABLED", "1")
    for suffix in ("", "_V15", "_V2", "_V21"):
        monkeypatch.delenv(f"AZURE_OPENAI_REALTIME_DEPLOYMENT{suffix}", raising=False)
    monkeypatch.delenv("AZURE_OPENAI_REALTIME_API_VERSION", raising=False)
    monkeypatch.delenv("MIRRORBUDDY_DEVICE_TOKEN", raising=False)
    monkeypatch.setenv("AZURE_OPENAI_REALTIME_ENDPOINT", "https://example.org")
    return monkeypatch


def deployment(url):
    return parse_qs(urlsplit(url).query)["model"][0]


def test_ga_prefers_newest_and_recovers_through_configured_ga_only(env):
    for suffix, value in (("_V21", "new"), ("_V2", "preview"), ("_V15", "stable"), ("", "base")):
        env.setenv(f"AZURE_OPENAI_REALTIME_DEPLOYMENT{suffix}", value)
    cfg = Config()
    assert cfg.AZURE_DEPLOYMENT == "new"
    assert [deployment(u) for u in cfg.realtime_fallback_urls()] == ["stable", "base"]


def test_candidates_trim_deduplicate_and_never_guess_deployments(env):
    env.setenv("AZURE_OPENAI_REALTIME_DEPLOYMENT_V21", " new ")
    env.setenv("AZURE_OPENAI_REALTIME_DEPLOYMENT_V15", " new ")
    env.setenv("AZURE_OPENAI_REALTIME_DEPLOYMENT", "undefined")
    cfg = Config()
    assert cfg.AZURE_DEPLOYMENT == "new"
    assert cfg.realtime_fallback_urls() == []
    env.setenv("AZURE_OPENAI_REALTIME_DEPLOYMENT", " stable ")
    env.setenv("AZURE_OPENAI_REALTIME_DEPLOYMENT_V15", "stable")
    assert len(Config().realtime_fallback_urls()) == 1


def test_legacy_default_is_preserved_and_urls_encode_deployment(env):
    cfg = Config()
    assert cfg.AZURE_DEPLOYMENT == "gpt-realtime"
    assert cfg.realtime_fallback_urls() == []
    env.setenv("AZURE_OPENAI_REALTIME_DEPLOYMENT", "custom+name")
    assert deployment(Config().realtime_ws_url()) == "custom+name"


def test_preview_keeps_explicit_base_and_does_not_try_ga(env):
    env.setenv("AZURE_OPENAI_REALTIME_API_VERSION", "2025-04-01-preview")
    env.setenv("AZURE_OPENAI_REALTIME_DEPLOYMENT", "preview")
    env.setenv("AZURE_OPENAI_REALTIME_DEPLOYMENT_V21", "new")
    cfg = Config()
    assert cfg.AZURE_DEPLOYMENT == "preview"
    assert not cfg.use_ga_protocol
    assert cfg.realtime_fallback_urls() == []


def test_paired_credentials_never_mix_with_local_resource_candidates(env):
    env.setenv("MIRRORBUDDY_DEVICE_TOKEN", "device-token")
    env.setenv("AZURE_OPENAI_REALTIME_DEPLOYMENT_V15", "local")
    cfg = Config()
    cfg.AZURE_DEPLOYMENT = "server-selected"
    cfg.AZURE_ENDPOINT = "https://paired.example.org"
    assert cfg.realtime_fallback_urls() == []
    assert deployment(cfg.realtime_ws_url()) == "server-selected"


class Socket:
    def __init__(self, events):
        self.events = iter(events)
        self.sent = []

    async def send(self, message):
        self.sent.append(json.loads(message))

    def __aiter__(self):
        return self

    async def __anext__(self):
        try:
            return json.dumps(next(self.events))
        except StopIteration:
            raise StopAsyncIteration


class Connection:
    def __init__(self, result):
        self.result = result

    async def __aenter__(self):
        if isinstance(self.result, Exception):
            raise self.result
        return self.result

    async def __aexit__(self, *args):
        return False


def rejection(status, code):
    return InvalidStatus(Response(
        status, "Rejected", Headers(),
        body=json.dumps({"error": {"code": code}}).encode(),
    ))


def client():
    return AzureRealtimeClient(
        ws_url="wss://example.org/openai/v1/realtime?model=new",
        fallback_ws_urls=[
            "wss://example.org/openai/v1/realtime?model=stable",
            "wss://example.org/openai/v1/realtime?model=base",
        ],
        api_key="test", instructions="safe", voice="coral",
        turn_detection={"type": "server_vad", "create_response": False},
    )


@pytest.mark.asyncio
async def test_every_candidate_tried_and_success_reused_on_reconnect(monkeypatch):
    calls = []
    successful = Socket([{"type": "session.updated"}])
    outcomes = iter([
        rejection(404, "DeploymentNotFound"),
        rejection(400, "model_retired"),
        successful, Socket([]),
    ])

    def connect(url, **kwargs):
        calls.append(url)
        return Connection(next(outcomes))

    monkeypatch.setattr(websockets, "connect", connect)
    c = client()
    await c._connect_and_listen()
    assert c._ready.is_set()
    await c._connect_and_listen()
    assert [deployment(u) for u in calls] == ["new", "stable", "base", "base"]
    assert successful.sent[0]["session"]["instructions"] == "safe"


@pytest.mark.asyncio
async def test_structured_socket_error_also_advances_chain(monkeypatch):
    calls = []
    outcomes = iter([
        Socket([{"type": "error", "error": {"code": "model_deprecated"}}]),
        Socket([{"type": "session.updated"}]),
    ])

    def connect(url, **kwargs):
        calls.append(url)
        return Connection(next(outcomes))

    monkeypatch.setattr(websockets, "connect", connect)
    await client()._connect_and_listen()
    assert [deployment(u) for u in calls] == ["new", "stable"]


@pytest.mark.asyncio
@pytest.mark.parametrize("status,code", [
    (401, "DeploymentNotFound"), (403, "Forbidden"), (429, "rate_limit"),
    (500, "model_retired"), (400, "invalid_value"), (404, "unknown"),
])
async def test_unrelated_handshake_failure_does_not_fallback(monkeypatch, status, code):
    calls = []

    def connect(url, **kwargs):
        calls.append(url)
        return Connection(rejection(status, code))

    monkeypatch.setattr(websockets, "connect", connect)
    with pytest.raises(InvalidStatus):
        await client()._connect_and_listen()
    assert len(calls) == 1


@pytest.mark.asyncio
async def test_exhausted_chain_surfaces_failure_without_cycle(monkeypatch):
    calls = []

    def connect(url, **kwargs):
        calls.append(url)
        return Connection(rejection(404, "DeploymentNotFound"))

    monkeypatch.setattr(websockets, "connect", connect)
    with pytest.raises(InvalidStatus):
        await client()._connect_and_listen()
    assert len(calls) == 3


@pytest.mark.asyncio
async def test_network_error_does_not_fallback(monkeypatch):
    calls = []

    def connect(url, **kwargs):
        calls.append(url)
        return Connection(OSError("offline"))

    monkeypatch.setattr(websockets, "connect", connect)
    with pytest.raises(OSError):
        await client()._connect_and_listen()
    assert len(calls) == 1
