"""Device pairing: fetch the paired child's profile and apply it to the config.

When the robot is paired (``MIRRORBUDDY_DEVICE_TOKEN`` set), it calls the MirrorBuddy
web app ``GET /api/devices/me`` with a Bearer token and receives the logged-in child's
learning profile — never their credentials. We map that profile onto the robot config
so Buddy starts personalised (name, accessibility, locale, calm motion) for that child.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

import httpx

logger = logging.getLogger(__name__)


@dataclass
class DeviceProfile:
    """The scoped, non-sensitive profile the web app returns for a paired device."""

    name: str | None = None
    preferred_buddy: str | None = None
    preferred_coach: str | None = None
    language: str = "it"
    subjects: list[str] = field(default_factory=list)
    accessibility: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_json(cls, d: dict[str, Any]) -> "DeviceProfile":
        acc = d.get("accessibility")
        return cls(
            name=(str(d.get("name")).strip() or None) if d.get("name") else None,
            preferred_buddy=(d.get("preferredBuddy") or None),
            preferred_coach=(d.get("preferredCoach") or None),
            language=str(d.get("language") or "it").strip() or "it",
            subjects=[str(s) for s in (d.get("subjects") or []) if s],
            accessibility=acc if isinstance(acc, dict) else {},
        )


def fetch_device_profile(api_base: str, token: str, timeout: float = 15.0) -> DeviceProfile | None:
    """GET /api/devices/me with the device token. Returns None on any failure."""
    url = f"{api_base.rstrip('/')}/api/devices/me"
    try:
        resp = httpx.get(
            url,
            timeout=timeout,
            headers={"authorization": f"Bearer {token}", "accept": "application/json"},
        )
        if resp.status_code == 401:
            logger.warning("Device token rejected (401). Re-pair the robot from the parent's settings.")
            return None
        resp.raise_for_status()
        data = resp.json()
        profile = data.get("profile") if isinstance(data, dict) else None
        if not isinstance(profile, dict):
            return None
        return DeviceProfile.from_json(profile)
    except Exception as e:  # network / parse — degrade gracefully to local config
        logger.warning("Could not fetch device profile from %s: %s", url, e)
        return None


def _dsa_from_accessibility(acc: dict[str, Any]) -> str | None:
    """Map MirrorBuddy accessibility flags to a robot DSA profile (best-effort)."""
    if acc.get("adhdMode"):
        return "adhd"
    if acc.get("dyslexiaFont"):
        return "dyslexia"
    return None


def _usable_name(name: str | None) -> bool:
    """Is this a name a child would recognise being called by?

    The server encrypts names at rest, and a decryption miss can put ciphertext or a
    placeholder on the wire. Feeding that to the model does not produce silence — it
    produces a *confident invented name*, which is worse than using none at all.
    """
    if not name:
        return False
    n = name.strip()
    return bool(n) and not n.startswith("pii:") and not n.startswith("[")


def apply_device_profile(config, profile: DeviceProfile) -> None:
    """Overlay a paired child's profile onto the runtime config (in place)."""
    if profile.name:
        if _usable_name(profile.name):
            config.STUDENT_NAME = profile.name
        else:
            logger.warning("Ignoring unreadable name from paired profile; keeping local name.")
    if profile.language:
        config.LOCALE = profile.language
    dsa = _dsa_from_accessibility(profile.accessibility)
    if dsa:
        config.DSA_PROFILE = dsa
    # The child already chose who should help them, in the app. Booting as a generic
    # assistant and making them ask again throws that choice away — so the paired
    # coach is who the robot wakes up as. The buddy is the fallback; an explicit
    # local MAESTRO_ID always wins, because someone set that on this robot on purpose.
    preferred = profile.preferred_coach or profile.preferred_buddy
    if preferred and not config.MAESTRO_ID:
        config.MAESTRO_ID = preferred
        config.START_NEUTRAL = False
    # Reduced-motion is accessibility-critical: keep the robot calm for this child.
    if profile.accessibility.get("reducedMotion"):
        config.CALM_MOVEMENT = True
    logger.info(
        "Applied paired profile: name=%s locale=%s dsa=%s calm=%s persona=%s",
        config.STUDENT_NAME, config.LOCALE, config.DSA_PROFILE, config.CALM_MOVEMENT,
        config.MAESTRO_ID or "(neutral buddy)",
    )


@dataclass(frozen=True)
class RealtimeCredentials:
    """Azure Realtime voice credentials served to a paired robot at runtime."""

    endpoint: str
    api_key: str
    deployment: str | None = None
    api_version: str | None = None


def fetch_realtime_credentials(
    api_base: str, token: str, timeout: float = 15.0
) -> RealtimeCredentials | None:
    """GET /api/devices/realtime-credentials with the device token.

    Returns ``None`` on any failure so the caller can fall back to whatever is
    configured locally: a temporary backend problem must never leave a child
    with a mute robot.
    """
    url = f"{api_base.rstrip('/')}/api/devices/realtime-credentials"
    try:
        resp = httpx.get(
            url,
            timeout=timeout,
            headers={"authorization": f"Bearer {token}", "accept": "application/json"},
        )
        if resp.status_code == 401:
            logger.warning(
                "Device token rejected while fetching voice credentials. "
                "Re-pair the robot from the parent's settings."
            )
            return None
        if resp.status_code == 503:
            logger.warning("MirrorBuddy has no voice credentials configured right now.")
            return None
        resp.raise_for_status()
        data = resp.json()
        if not isinstance(data, dict):
            return None
        endpoint = (data.get("endpoint") or "").strip()
        api_key = (data.get("apiKey") or "").strip()
        if not endpoint or not api_key:
            logger.warning("Voice credentials response was incomplete; keeping local config.")
            return None
        return RealtimeCredentials(
            endpoint=endpoint,
            api_key=api_key,
            deployment=(data.get("deployment") or "").strip() or None,
            api_version=(data.get("apiVersion") or "").strip() or None,
        )
    except Exception as e:  # network / parse — degrade to local config
        logger.warning("Could not fetch voice credentials from %s: %s", url, e)
        return None


def apply_realtime_credentials(config, creds: RealtimeCredentials) -> None:
    """Apply server-provided voice credentials to the in-memory config.

    Nothing is written to disk: the key lives only for this run, so a rotation
    on the server reaches the robot on its next start with no manual step.
    """
    config.AZURE_ENDPOINT = creds.endpoint
    config.AZURE_API_KEY = creds.api_key
    if creds.deployment:
        config.AZURE_DEPLOYMENT = creds.deployment
    if creds.api_version:
        config.AZURE_API_VERSION = creds.api_version
    logger.info("Voice credentials loaded from MirrorBuddy (endpoint=%s)", creds.endpoint)
