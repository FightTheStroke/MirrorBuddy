"""Minimal in-app settings UI (FastAPI routes).

Mounted on the Reachy Mini app's built-in settings web server. It lets you:
- see whether the required configuration is present,
- pick which Maestro to embody, the DSA profile and the student name,
- enter the Azure Realtime credentials (written to the instance ``.env``).

The page is deliberately tiny and dependency-free (inline HTML + fetch).
"""

from __future__ import annotations

import logging
from pathlib import Path

from .config import config
from .settings_page import PAGE

logger = logging.getLogger(__name__)

# Keys we allow the UI to persist into the instance .env file.
_EDITABLE_KEYS = (
    "AZURE_OPENAI_REALTIME_ENDPOINT",
    "AZURE_OPENAI_REALTIME_API_KEY",
    "AZURE_OPENAI_REALTIME_DEPLOYMENT",
    "AZURE_OPENAI_REALTIME_API_VERSION",
    "MIRRORBUDDY_URL",
    "MIRRORBUDDY_LOCALE",
    "MIRRORBUDDY_MAESTRO_ID",
    "MIRRORBUDDY_DSA_PROFILE",
    "MIRRORBUDDY_STUDENT_NAME",
    "MIRRORBUDDY_DEVICE_TOKEN",
    "MIRRORBUDDY_API_BASE",
    "MIRRORBUDDY_BARGE_RMS",
    "MIRRORBUDDY_BARGE_FRAMES",
)


def mount_settings_routes(app, instance_path: str | None) -> None:
    """Attach the settings routes to the app's FastAPI ``settings_app``."""
    from fastapi import Request
    from fastapi.responses import HTMLResponse, JSONResponse

    env_path = Path(instance_path) / ".env" if instance_path else Path(".env")

    @app.get("/", response_class=HTMLResponse)
    async def index() -> str:  # noqa: D401 - route
        return PAGE

    @app.get("/api/status")
    async def status() -> JSONResponse:
        config.reload()
        return JSONResponse(
            {
                "ready": not config.missing(),
                "missing": config.missing(),
                "maestroId": config.MAESTRO_ID,
                "dsaProfile": config.DSA_PROFILE,
                "studentName": config.STUDENT_NAME,
                "mirrorbuddyUrl": config.MIRRORBUDDY_URL,
                "locale": config.LOCALE,
                "paired": bool(config.DEVICE_TOKEN),
                "bargeRms": config.BARGE_RMS_THRESHOLD,
                "bargeFrames": config.BARGE_SUSTAIN_FRAMES,
            }
        )

    @app.get("/api/maestri")
    async def maestri() -> JSONResponse:
        from .mirrorbuddy_client import MirrorBuddyClient

        try:
            client = MirrorBuddyClient(config.MIRRORBUDDY_URL, locale=config.LOCALE)
            items = [
                {"id": m.id, "name": m.display_name, "subject": m.subject, "voice": m.voice}
                for m in client.fetch_maestri()
            ]
            return JSONResponse({"maestri": items})
        except Exception as e:
            logger.warning("maestri fetch failed: %s", e)
            return JSONResponse({"maestri": [], "error": "upstream unavailable"}, status_code=502)

    @app.post("/api/config")
    async def save_config(request: Request) -> JSONResponse:
        try:
            body = await request.json()
        except Exception:
            return JSONResponse({"ok": False, "error": "invalid JSON"}, status_code=400)
        if not isinstance(body, dict):
            return JSONResponse({"ok": False, "error": "expected object"}, status_code=400)

        updates = {k: str(v) for k, v in body.items() if k in _EDITABLE_KEYS and v is not None}
        try:
            _write_env(env_path, updates)
        except Exception as e:
            logger.error("failed to write .env: %s", e)
            return JSONResponse({"ok": False, "error": "could not save configuration"}, status_code=500)

        # Reload from the instance .env we just wrote (not the process cwd), so the
        # first-run wait loop in main.py sees the new Azure keys without a restart.
        config.env_path = str(env_path)
        config.reload()
        return JSONResponse({"ok": True, "ready": not config.missing(), "missing": config.missing()})

    @app.post("/api/pair")
    async def pair(request: Request) -> JSONResponse:
        """Redeem a pairing code from the parent's MirrorBuddy settings for a device token."""
        import httpx

        try:
            body = await request.json()
            code = str((body or {}).get("code") or "").strip()
        except Exception:
            return JSONResponse({"ok": False, "error": "invalid JSON"}, status_code=400)
        if not code:
            return JSONResponse({"ok": False, "error": "codice mancante"}, status_code=400)

        api_base = config.API_BASE.rstrip("/")
        try:
            resp = httpx.post(
                f"{api_base}/api/devices/pair",
                json={"code": code},
                timeout=15.0,
                headers={"accept": "application/json"},
            )
        except Exception as e:
            logger.error("pair request failed: %s", e)
            return JSONResponse({"ok": False, "error": "robot non connesso a internet"}, status_code=502)

        if resp.status_code != 200:
            return JSONResponse({"ok": False, "error": "codice non valido o scaduto"}, status_code=400)

        token = str((resp.json() or {}).get("token") or "").strip()
        if not token:
            return JSONResponse({"ok": False, "error": "risposta non valida"}, status_code=502)

        try:
            _write_env(env_path, {"MIRRORBUDDY_DEVICE_TOKEN": token})
        except Exception as e:
            logger.error("failed to store device token: %s", e)
            return JSONResponse({"ok": False, "error": "impossibile salvare il token"}, status_code=500)

        config.reload()
        return JSONResponse({"ok": True, "paired": True})


def _write_env(env_path: Path, updates: dict[str, str]) -> None:
    """Merge ``updates`` into the .env file, preserving existing keys."""
    if not updates:
        return
    env_path.parent.mkdir(parents=True, exist_ok=True)
    existing: dict[str, str] = {}
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            existing[k.strip()] = v
    existing.update(updates)
    body = "\n".join(f"{k}={v}" for k, v in existing.items()) + "\n"
    env_path.write_text(body, encoding="utf-8")
