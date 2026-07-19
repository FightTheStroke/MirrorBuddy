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


def apply_device_profile(config, profile: DeviceProfile) -> None:
    """Overlay a paired child's profile onto the runtime config (in place)."""
    if profile.name:
        config.STUDENT_NAME = profile.name
    if profile.language:
        config.LOCALE = profile.language
    dsa = _dsa_from_accessibility(profile.accessibility)
    if dsa:
        config.DSA_PROFILE = dsa
    # Reduced-motion is accessibility-critical: keep the robot calm for this child.
    if profile.accessibility.get("reducedMotion"):
        config.CALM_MOVEMENT = True
    logger.info(
        "Applied paired profile: name=%s locale=%s dsa=%s calm=%s",
        config.STUDENT_NAME, config.LOCALE, config.DSA_PROFILE, config.CALM_MOVEMENT,
    )
