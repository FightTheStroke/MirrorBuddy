"""Configuration for the MirrorBuddy Reachy Mini app.

All configuration is read from environment variables (optionally from an instance
``.env`` file loaded by the host). Nothing sensitive is hard-coded.

Required:
    AZURE_OPENAI_REALTIME_ENDPOINT   e.g. https://<resource>.openai.azure.com/
    AZURE_OPENAI_REALTIME_API_KEY    Azure OpenAI key (kept only in the robot .env)
    AZURE_OPENAI_REALTIME_DEPLOYMENT realtime deployment name, e.g. gpt-realtime

Optional:
    AZURE_OPENAI_REALTIME_API_VERSION  if set -> use the Preview WS protocol; else GA
    MIRRORBUDDY_URL                    default https://www.mirrorbuddy.org
    MIRRORBUDDY_LOCALE                 default "it"
    MIRRORBUDDY_MAESTRO_ID             which Maestro to embody (default: first Italian tutor)
    MIRRORBUDDY_DSA_PROFILE            one of the DSA profiles (see dsa.py); default "cerebral"
    MIRRORBUDDY_STUDENT_NAME           personalise the greeting (e.g. "Mario")
    MIRRORBUDDY_DEVICE_TOKEN           pairing token; when set, the logged-in child's profile
                                       (name, accessibility, locale) is fetched and applied
    MIRRORBUDDY_API_BASE               where the pairing API lives (default: MIRRORBUDDY_URL)
    MIRRORBUDDY_BARGE_RMS              local barge-in mic sensitivity, 0..1 (default 0.045);
                                       lower = more sensitive (cuts sooner)
    MIRRORBUDDY_BARGE_FRAMES           consecutive loud mic frames before cutting (default 3);
                                       higher = more robust to background noise
"""

from __future__ import annotations

import logging
import os
from urllib.parse import urlencode

from dotenv import load_dotenv

logger = logging.getLogger(__name__)


class Config:
    """Runtime configuration loaded from environment / .env."""

    def __init__(self) -> None:
        self.env_path: str | None = None
        load_dotenv()
        self.reload()

    def reload(self) -> None:
        """(Re)read all values from the environment."""
        load_dotenv(self.env_path or None, override=True)

        # --- Azure OpenAI Realtime (the brain + voice) ---
        endpoint = (os.getenv("AZURE_OPENAI_REALTIME_ENDPOINT") or "").strip()
        self.AZURE_ENDPOINT: str = endpoint.rstrip("/")
        self.AZURE_API_KEY: str | None = (os.getenv("AZURE_OPENAI_REALTIME_API_KEY") or "").strip() or None
        # When set, we speak the deprecated Preview protocol; otherwise the GA protocol.
        self.AZURE_API_VERSION: str | None = (os.getenv("AZURE_OPENAI_REALTIME_API_VERSION") or "").strip() or None
        base = _deployment("")
        v15 = _deployment("_V15")
        candidates = [_deployment("_V21"), _deployment("_V2"), v15, base]
        self.AZURE_DEPLOYMENT: str = (
            next((name for name in candidates if name), "gpt-realtime")
            if self.use_ga_protocol else base or "gpt-realtime"
        )
        self._ga_fallbacks = tuple(dict.fromkeys(name for name in (v15, base) if name))

        # --- MirrorBuddy alignment ---
        self.MIRRORBUDDY_URL: str = (os.getenv("MIRRORBUDDY_URL") or "https://www.mirrorbuddy.org").strip().rstrip("/")
        self.LOCALE: str = (os.getenv("MIRRORBUDDY_LOCALE") or "it").strip()
        self.MAESTRO_ID: str | None = (os.getenv("MIRRORBUDDY_MAESTRO_ID") or "").strip() or None
        self.DSA_PROFILE: str = (os.getenv("MIRRORBUDDY_DSA_PROFILE") or "cerebral").strip()
        self.STUDENT_NAME: str | None = (os.getenv("MIRRORBUDDY_STUDENT_NAME") or "").strip() or None
        # Device pairing: a token bound to the logged-in child's account. When present, the
        # robot fetches that child's profile (name, accessibility, locale) from the web app.
        self.DEVICE_TOKEN: str | None = (os.getenv("MIRRORBUDDY_DEVICE_TOKEN") or "").strip() or None
        api_base = (os.getenv("MIRRORBUDDY_API_BASE") or "").strip().rstrip("/")
        self.API_BASE: str = api_base or self.MIRRORBUDDY_URL
        # Families do not read release notes. The robot takes published updates by
        # itself, off the start-up path; set this to 0 to pin the current version.
        self.AUTO_UPDATE: bool = _flag("MIRRORBUDDY_AUTO_UPDATE", True)
        # Start neutrally as "Buddy" (organise the study session) instead of impersonating a
        # historical Maestro. A pinned MIRRORBUDDY_MAESTRO_ID always takes precedence.
        self.START_NEUTRAL: bool = _flag("MIRRORBUDDY_START_NEUTRAL", True)
        self.BUDDY_VOICE: str = (os.getenv("MIRRORBUDDY_BUDDY_VOICE") or "coral").strip().lower()

        # --- feature toggles ---
        self.ENABLE_CAMERA: bool = _flag("MIRRORBUDDY_ENABLE_CAMERA", True)
        self.ENABLE_MOVEMENTS: bool = _flag("MIRRORBUDDY_ENABLE_MOVEMENTS", True)
        self.FOLLOW_FACE: bool = _flag("MIRRORBUDDY_FOLLOW_FACE", True)
        # Ambient vision: hand the model a frame from the video stream at the start of a
        # turn, so Buddy sees what the student is doing without being asked to look.
        # Off by default and deliberately so: the documented camera contract is "a photo
        # on explicit request only", and continuous framing of a child is a decision a
        # parent takes, not an upgrade that arrives silently.
        self.AMBIENT_VISION: bool = _flag("MIRRORBUDDY_AMBIENT_VISION", False)
        self.AMBIENT_VISION_INTERVAL_S: float = _float(
            "MIRRORBUDDY_AMBIENT_VISION_INTERVAL_S", 20.0
        )
        # Calm motion (default): no audio head wobbler + gentler amplitudes, so the robot
        # does not distract the student while speaking. Set to false for livelier motion.
        self.CALM_MOVEMENT: bool = _flag("MIRRORBUDDY_CALM_MOVEMENT", True)

        # --- local barge-in (instant "basta") ---
        # When the echo-cancelled mic hears a sustained voice over Buddy's own speech,
        # playback is cut on-device instantly (no server round-trip). Field-tunable so
        # sensitivity can be dialled in per environment without a redeploy.
        self.BARGE_RMS_THRESHOLD: float = _float("MIRRORBUDDY_BARGE_RMS", 0.045)
        self.BARGE_SUSTAIN_FRAMES: int = _int("MIRRORBUDDY_BARGE_FRAMES", 3, minimum=1)

        # --- loudness ---
        # System mixer level pushed to the daemon at startup, and a software make-up
        # gain applied to Buddy's voice on top of it. The robot speaker is small, and
        # a tutor that can't be heard clearly is a tutor that doesn't work.
        self.VOLUME: int = _int("MIRRORBUDDY_VOLUME", 92, minimum=0)
        self.OUTPUT_GAIN: float = _float("MIRRORBUDDY_OUTPUT_GAIN", 3.2)
        self.DAEMON_URL: str = os.getenv("MIRRORBUDDY_DAEMON_URL", "http://localhost:8000").rstrip("/")

    def missing(self) -> list[str]:
        """Return the list of required config values that are absent."""
        errors: list[str] = []
        if not self.AZURE_ENDPOINT:
            errors.append("AZURE_OPENAI_REALTIME_ENDPOINT")
        if not self.AZURE_API_KEY:
            errors.append("AZURE_OPENAI_REALTIME_API_KEY")
        if not self.AZURE_DEPLOYMENT:
            errors.append("AZURE_OPENAI_REALTIME_DEPLOYMENT")
        return errors

    @property
    def use_ga_protocol(self) -> bool:
        """GA when no api-version is configured."""
        return self.AZURE_API_VERSION is None

    def realtime_ws_url(self, deployment: str | None = None) -> str:
        """Build the Azure OpenAI Realtime WebSocket URL (GA or Preview)."""
        host = self.AZURE_ENDPOINT.replace("https://", "").replace("http://", "").rstrip("/")
        model = deployment or self.AZURE_DEPLOYMENT
        if self.use_ga_protocol:
            # GA: resource endpoint directly, model = deployment name.
            return f"wss://{host}/openai/v1/realtime?{urlencode({'model': model})}"
        # Preview (deprecated): api-version + deployment.
        query = urlencode({"api-version": self.AZURE_API_VERSION, "deployment": model})
        return f"wss://{host}/openai/realtime?{query}"

    def realtime_fallback_urls(self) -> list[str]:
        """Only explicitly configured GA deployments on an unpaired resource."""
        if not self.use_ga_protocol or self.DEVICE_TOKEN:
            return []
        return [
            self.realtime_ws_url(name) for name in self._ga_fallbacks
            if name != self.AZURE_DEPLOYMENT
        ]


def _deployment(suffix: str) -> str | None:
    value = (os.getenv(f"AZURE_OPENAI_REALTIME_DEPLOYMENT{suffix}") or "").strip()
    return value if value and value != "undefined" else None


def _flag(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


def _float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    try:
        return float(raw)
    except ValueError:
        logger.warning("Invalid %s=%r, using default %s", name, raw, default)
        return default


def _int(name: str, default: int, minimum: int | None = None) -> int:
    raw = os.getenv(name)
    if raw is None or not raw.strip():
        return default
    try:
        value = int(raw)
    except ValueError:
        logger.warning("Invalid %s=%r, using default %s", name, raw, default)
        return default
    if minimum is not None and value < minimum:
        return minimum
    return value


# Global singleton, mirrors the pattern used by the other Reachy Mini apps.
config = Config()
