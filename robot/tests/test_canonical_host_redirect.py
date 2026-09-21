"""The robot must survive the site's canonical-host redirect.

A real robot on a family's desk refused to start. The log said only this:

    Could not load Maestri from MirrorBuddy (https://mirrorbuddy.org):
    Redirect response '308 Permanent Redirect'
    Redirect location: 'https://www.mirrorbuddy.org/api/maestri?locale=it'
    Process exited with code 1

The site answers the apex domain with a permanent redirect to ``www``. httpx
does **not** follow redirects unless asked, so every call the robot makes to
MirrorBuddy came back as a 308 the code treated as a failure. Fetching the
Maestri happens during start-up, so the app did not degrade — it exited, and
the dashboard showed "error" with no working tutor.

Two things are held here, because either alone leaves the failure reachable:
the configured address is the canonical host, and every remote call follows a
redirect if the site ever moves again.
"""

from __future__ import annotations

import sys
from pathlib import Path
from urllib.parse import urlsplit

import httpx
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from reachy_mini_mirrorbuddy import config as config_module  # noqa: E402
from reachy_mini_mirrorbuddy.device import (  # noqa: E402
    fetch_device_profile,
    fetch_realtime_credentials,
)
from reachy_mini_mirrorbuddy.mirrorbuddy_client import MirrorBuddyClient  # noqa: E402

APEX = "https://mirrorbuddy.org"
CANONICAL_HOST = "www.mirrorbuddy.org"


def _redirecting_transport(payload: dict) -> httpx.MockTransport:
    """Answer the apex host with a 308, exactly as production does."""

    def handle(request: httpx.Request) -> httpx.Response:
        if request.url.host == "mirrorbuddy.org":
            target = str(request.url.copy_with(host=CANONICAL_HOST))
            return httpx.Response(308, headers={"location": target})
        return httpx.Response(200, json=payload)

    return httpx.MockTransport(handle)


@pytest.fixture()
def through_the_redirect(monkeypatch: pytest.MonkeyPatch):
    """Route httpx through a transport that redirects, honouring the caller's flag.

    The client is built with whatever ``follow_redirects`` the production code
    passed, so code that omits it really does see the 308.
    """
    payloads: dict[str, dict] = {}

    def fake_request(method: str, url: str, **kwargs) -> httpx.Response:
        payload = payloads.get(urlsplit(url).path, {})
        with httpx.Client(
            transport=_redirecting_transport(payload),
            follow_redirects=bool(kwargs.get("follow_redirects", False)),
        ) as client:
            return client.request(
                method,
                url,
                headers=kwargs.get("headers"),
                json=kwargs.get("json"),
            )

    monkeypatch.setattr(httpx, "get", lambda url, **kw: fake_request("GET", url, **kw))
    monkeypatch.setattr(httpx, "post", lambda url, **kw: fake_request("POST", url, **kw))
    return payloads


class TestEveryRemoteCallSurvivesTheRedirect:
    def test_maestri_are_loaded_through_the_redirect(self, through_the_redirect):
        through_the_redirect["/api/maestri"] = {
            "maestri": [{"id": "m1", "name": "Archimede", "subject": "matematica"}]
        }
        maestri = MirrorBuddyClient(APEX).fetch_maestri()
        assert [m.id for m in maestri] == ["m1"]

    def test_coaches_are_loaded_through_the_redirect(self, through_the_redirect):
        through_the_redirect["/api/coaches"] = {"coaches": [{"id": "c1", "name": "Melissa"}]}
        coaches = MirrorBuddyClient(APEX).fetch_coaches()
        assert [c.id for c in coaches] == ["c1"]

    def test_the_paired_profile_is_read_through_the_redirect(self, through_the_redirect):
        through_the_redirect["/api/devices/me"] = {
            "profile": {"name": "Mario", "language": "it"}
        }
        profile = fetch_device_profile(APEX, "device-token")
        assert profile is not None
        assert profile.name == "Mario"

    def test_voice_credentials_are_read_through_the_redirect(self, through_the_redirect):
        through_the_redirect["/api/devices/realtime-credentials"] = {
            "endpoint": "https://example.openai.azure.com",
            "apiKey": "k",
            "deployment": "gpt-realtime",
        }
        assert fetch_realtime_credentials(APEX, "device-token") is not None


class TestTheConfiguredAddressIsCanonical:
    def test_the_default_url_does_not_rely_on_a_redirect(self, monkeypatch):
        monkeypatch.delenv("MIRRORBUDDY_URL", raising=False)
        monkeypatch.delenv("MIRRORBUDDY_API_BASE", raising=False)
        cfg = config_module.Config()
        assert urlsplit(cfg.MIRRORBUDDY_URL).hostname == CANONICAL_HOST
