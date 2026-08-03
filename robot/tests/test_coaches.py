"""Coaches on the robot: they must be reachable by voice like any professor.

Roberto asked "ma abbiamo tolto i buddy e i coach?" — they were never removed, they
were simply invisible to the robot because no public endpoint exposed them. These
tests pin the two halves of the fix: the roster includes them, and a child asking
for one by name or by need actually gets one.
"""

from __future__ import annotations

import httpx
import pytest

from reachy_mini_mirrorbuddy.mirrorbuddy_client import MirrorBuddyClient
from reachy_mini_mirrorbuddy.tools import resolve_maestro

_COACH_JSON = [
    {
        "id": "andrea",
        "name": "Andrea",
        "displayName": "Andrea",
        "subject": "coaching",
        "specialty": "energica, sportiva, pratica",
        "voice": "sage",
        "voiceInstructions": "Energica ma non stressante",
        "teachingStyle": "metodo di studio come allenamento",
        "systemPrompt": "Sei Andrea, docente di sostegno virtuale.",
        "greeting": "Ciao! Pronti ad allenarci?",
    },
    {
        "id": "melissa",
        "name": "Melissa",
        "displayName": "Melissa",
        "subject": "coaching",
        "specialty": "calma, organizzata",
        "voice": "coral",
        "voiceInstructions": "",
        "teachingStyle": "",
        "systemPrompt": "Sei Melissa.",
        "greeting": "Ciao!",
    },
]


def _client(monkeypatch, handler):
    monkeypatch.setattr(httpx, "get", handler)
    return MirrorBuddyClient("https://mirrorbuddy.test", locale="it")


class TestFetchCoaches:
    def test_returns_the_coaches(self, monkeypatch):
        seen = {}

        def fake_get(url, **kw):
            seen["url"] = url
            return httpx.Response(200, json=_COACH_JSON, request=httpx.Request("GET", url))

        coaches = _client(monkeypatch, fake_get).fetch_coaches()
        assert [c.id for c in coaches] == ["andrea", "melissa"]
        assert coaches[0].display_name == "Andrea"
        assert "/api/coaches?locale=it" in seen["url"]

    def test_a_backend_without_the_endpoint_does_not_break_startup(self, monkeypatch):
        # The robot must still boot against an older deployment: no coaches is a
        # degraded experience, a crash is a child staring at a dead robot.
        def boom(url, **kw):
            raise httpx.ConnectError("404")

        assert _client(monkeypatch, boom).fetch_coaches() == []

    def test_http_error_is_swallowed(self, monkeypatch):
        assert _client(monkeypatch, lambda url, **kw: httpx.Response(500, request=httpx.Request("GET", url))).fetch_coaches() == []

    def test_accepts_a_wrapped_payload(self, monkeypatch):
        def fake_get(url, **kw):
            return httpx.Response(200, json={"coaches": _COACH_JSON}, request=httpx.Request("GET", url))

        assert len(_client(monkeypatch, fake_get).fetch_coaches()) == 2


class TestCallingACoach:
    @pytest.fixture
    def roster(self):
        from reachy_mini_mirrorbuddy.mirrorbuddy_client import Maestro

        return [Maestro.from_json(c) for c in _COACH_JSON]

    def test_by_name(self, roster):
        assert resolve_maestro(roster, "chiama Andrea").id == "andrea"

    @pytest.mark.parametrize(
        "said",
        ["mi serve un metodo di studio", "voglio un coach", "non riesco a organizzarmi"],
    )
    def test_by_what_the_student_needs(self, roster, said):
        # A child doesn't ask for "coaching"; they say what isn't working.
        assert resolve_maestro(roster, said) is not None

    def test_an_unrelated_request_does_not_grab_a_coach(self, roster):
        assert resolve_maestro(roster, "matematica") is None
