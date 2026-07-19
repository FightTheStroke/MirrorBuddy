"""Configuration for the MirrorBuddy Reachy Mini app.

All configuration is read from environment variables (optionally from an instance
``.env`` file loaded by the host). Nothing sensitive is hard-coded.

Required:
    AZURE_OPENAI_REALTIME_ENDPOINT   e.g. https://<resource>.openai.azure.com/
    AZURE_OPENAI_REALTIME_API_KEY    Azure OpenAI key (kept only in the robot .env)
    AZURE_OPENAI_REALTIME_DEPLOYMENT realtime deployment name, e.g. gpt-realtime

Optional:
    AZURE_OPENAI_REALTIME_API_VERSION  if set -> use the Preview WS protocol; else GA
    MIRRORBUDDY_URL                    default https://mirrorbuddy.org
    MIRRORBUDDY_LOCALE                 default "it"
    MIRRORBUDDY_MAESTRO_ID             which Maestro to embody (default: first Italian tutor)
    MIRRORBUDDY_DSA_PROFILE            one of the DSA profiles (see dsa.py); default "cerebral"
    MIRRORBUDDY_STUDENT_NAME           personalise the greeting (e.g. "Mario")
"""

from __future__ import annotations

import logging
import os

from dotenv import load_dotenv

logger = logging.getLogger(__name__)


class Config:
    """Runtime configuration loaded from environment / .env."""

    def __init__(self) -> None:
        load_dotenv()
        self.reload()

    def reload(self) -> None:
        """(Re)read all values from the environment."""
        load_dotenv(override=True)

        # --- Azure OpenAI Realtime (the brain + voice) ---
        endpoint = (os.getenv("AZURE_OPENAI_REALTIME_ENDPOINT") or "").strip()
        self.AZURE_ENDPOINT: str = endpoint.rstrip("/")
        self.AZURE_API_KEY: str | None = (os.getenv("AZURE_OPENAI_REALTIME_API_KEY") or "").strip() or None
        self.AZURE_DEPLOYMENT: str = (os.getenv("AZURE_OPENAI_REALTIME_DEPLOYMENT") or "gpt-realtime").strip()
        # When set, we speak the deprecated Preview protocol; otherwise the GA protocol.
        self.AZURE_API_VERSION: str | None = (os.getenv("AZURE_OPENAI_REALTIME_API_VERSION") or "").strip() or None

        # --- MirrorBuddy alignment ---
        self.MIRRORBUDDY_URL: str = (os.getenv("MIRRORBUDDY_URL") or "https://mirrorbuddy.org").strip().rstrip("/")
        self.LOCALE: str = (os.getenv("MIRRORBUDDY_LOCALE") or "it").strip()
        self.MAESTRO_ID: str | None = (os.getenv("MIRRORBUDDY_MAESTRO_ID") or "").strip() or None
        self.DSA_PROFILE: str = (os.getenv("MIRRORBUDDY_DSA_PROFILE") or "cerebral").strip()
        self.STUDENT_NAME: str | None = (os.getenv("MIRRORBUDDY_STUDENT_NAME") or "").strip() or None

        # --- feature toggles ---
        self.ENABLE_CAMERA: bool = _flag("MIRRORBUDDY_ENABLE_CAMERA", True)
        self.ENABLE_MOVEMENTS: bool = _flag("MIRRORBUDDY_ENABLE_MOVEMENTS", True)

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

    def realtime_ws_url(self) -> str:
        """Build the Azure OpenAI Realtime WebSocket URL (GA or Preview)."""
        host = self.AZURE_ENDPOINT.replace("https://", "").replace("http://", "").rstrip("/")
        if self.use_ga_protocol:
            # GA: resource endpoint directly, model = deployment name.
            return f"wss://{host}/openai/v1/realtime?model={self.AZURE_DEPLOYMENT}"
        # Preview (deprecated): api-version + deployment.
        return (
            f"wss://{host}/openai/realtime"
            f"?api-version={self.AZURE_API_VERSION}&deployment={self.AZURE_DEPLOYMENT}"
        )


def _flag(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


# Global singleton, mirrors the pattern used by the other Reachy Mini apps.
config = Config()
