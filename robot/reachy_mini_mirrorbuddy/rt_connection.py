"""Socket lifecycle and narrowly scoped recovery from unavailable deployments."""

from __future__ import annotations

import asyncio
import json
import logging
import time

import websockets
from websockets.exceptions import InvalidHandshake

from . import rt_messages

logger = logging.getLogger(__name__)
_RECONNECT_MIN_S = 1.0
_RECONNECT_MAX_S = 30.0
_HEALTHY_SESSION_S = 30.0
_DEPLOYMENT_GONE = frozenset({
    "deploymentnotfound", "deployment_not_found", "model_not_found", "modelnotfound",
    "modeldeprecated", "model_deprecated", "modelretired", "model_retired",
})


def _deployment_gone(error: object) -> bool:
    if not isinstance(error, dict):
        return False
    code = error.get("code")
    return isinstance(code, str) and code.lower() in _DEPLOYMENT_GONE


def _unavailable_handshake(error: InvalidHandshake) -> bool:
    response = getattr(error, "response", None)
    if response is None:
        # Legacy clients discard the body. Only a missing-resource status is
        # actionable; 400 without a deployment code must not mask protocol bugs.
        return getattr(error, "status_code", None) == 404
    if response.status_code not in (400, 404):
        return False
    try:
        body = json.loads(response.body)
    except (ValueError, TypeError, UnicodeDecodeError):
        return False
    return isinstance(body, dict) and _deployment_gone(body.get("error"))


class DeploymentUnavailable(RuntimeError):
    """A structured Azure error identifies the selected deployment as unusable."""


class RealtimeConnectionMixin:
    """Connection side of AzureRealtimeClient, separate from audio/control events."""

    async def _session_loop(self) -> None:
        delay = _RECONNECT_MIN_S
        while not self._stop.is_set():
            started = time.monotonic()
            self._reset_session_state()
            try:
                await self._connect_and_listen()
            except Exception as error:
                logger.error("Realtime session dropped: %s", error)
            if self._stop.is_set():
                return
            if time.monotonic() - started >= _HEALTHY_SESSION_S:
                delay = _RECONNECT_MIN_S
            logger.info("Realtime session ended; reconnecting in %.0fs", delay)
            await asyncio.sleep(delay)
            delay = min(delay * 2, _RECONNECT_MAX_S)

    def _reset_session_state(self) -> None:
        """Reset streaming flags, preserving the student's deliberate rest."""
        self._ws = None
        self._suppress = False
        self._responding = False
        self._fast_requested = False
        self._stopped_on_partial = False
        self._partial_user = ""

    async def _connect_and_listen(self) -> None:
        while not self._stop.is_set():
            try:
                await self._listen_once()
                return
            except InvalidHandshake as error:
                if not _unavailable_handshake(error) or not self._advance_deployment():
                    raise
            except DeploymentUnavailable:
                if not self._advance_deployment():
                    raise
            finally:
                self._ws = None

    def _advance_deployment(self) -> bool:
        if not self.use_ga or not self._fallback_ws_urls:
            logger.error("Realtime deployment unavailable; no configured GA fallback remains")
            return False
        self.ws_url = self._fallback_ws_urls.pop(0)
        self._reset_session_state()
        logger.warning("Realtime deployment unavailable; trying next configured GA deployment")
        return True

    async def _listen_once(self) -> None:
        headers = {"api-key": self.api_key}
        logger.info("Connecting to Azure Realtime: %s", self.ws_url.split("?")[0])
        try:
            major = int(str(websockets.__version__).split(".", 1)[0])
        except (ValueError, AttributeError):
            major = 0
        hdr_kw = "additional_headers" if major >= 14 else "extra_headers"
        async with websockets.connect(
            self.ws_url, max_size=None, ping_interval=20, ping_timeout=20,
            **{hdr_kw: headers},
        ) as ws:
            self._ws = ws
            logger.info("WebSocket connected; configuring session")
            payload = rt_messages.session_update(
                self.instructions, self.voice, self.turn_detection, self.tools, self.use_ga
            )
            await ws.send(json.dumps(payload))
            async for raw in ws:
                if self._stop.is_set():
                    break
                try:
                    event = json.loads(raw)
                except (ValueError, TypeError):
                    logger.warning("Ignoring malformed realtime event")
                    continue
                if not isinstance(event, dict):
                    logger.warning("Ignoring non-object realtime event")
                    continue
                if event.get("type") == "error" and _deployment_gone(event.get("error")):
                    raise DeploymentUnavailable("Azure rejected the realtime deployment")
                await self._handle_event(event)
        logger.info("WebSocket closed")
