"""Azure OpenAI Realtime client over WebSocket.

Runs an asyncio event loop in its own thread and bridges to the (threaded) robot
audio I/O:

- ``send_audio_pcm16(bytes)``      push microphone audio to the model (thread-safe)
- ``on_output_audio(bytes)``       callback invoked with model speech (PCM16)
- ``on_speech_started()``          callback when the user starts talking (barge-in)
- ``on_transcript(text, final)``   callback with the assistant transcript (for logs/UI)

Audio is exchanged as 16-bit PCM mono at :data:`SAMPLE_RATE` Hz.

The event schema differs slightly between the Azure Realtime GA and Preview
protocols, so both variants of the relevant event names are handled.
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import threading
from collections.abc import Callable

import websockets

logger = logging.getLogger(__name__)

SAMPLE_RATE = 24000  # Azure Realtime PCM sample rate (in and out)


class AzureRealtimeClient:
    """Minimal, resilient Azure OpenAI Realtime WebSocket client."""

    def __init__(
        self,
        ws_url: str,
        api_key: str,
        instructions: str,
        voice: str,
        turn_detection: dict,
        greeting: str | None = None,
        use_ga: bool = True,
        on_output_audio: Callable[[bytes], None] | None = None,
        on_speech_started: Callable[[], None] | None = None,
        on_transcript: Callable[[str, bool], None] | None = None,
        on_ready: Callable[[], None] | None = None,
    ) -> None:
        self.ws_url = ws_url
        self.api_key = api_key
        self.instructions = instructions
        self.voice = voice
        self.turn_detection = turn_detection
        self.greeting = greeting
        self.use_ga = use_ga

        self.on_output_audio = on_output_audio
        self.on_speech_started = on_speech_started
        self.on_transcript = on_transcript
        self.on_ready = on_ready

        self._loop: asyncio.AbstractEventLoop | None = None
        self._thread: threading.Thread | None = None
        self._ws: websockets.WebSocketClientProtocol | None = None
        self._stop = threading.Event()
        self._ready = threading.Event()

    # ------------------------------------------------------------------ lifecycle
    def start(self) -> None:
        """Start the client (connects in a background thread)."""
        self._thread = threading.Thread(target=self._run, name="AzureRealtime", daemon=True)
        self._thread.start()

    def wait_ready(self, timeout: float = 20.0) -> bool:
        """Block until the session is configured (or timeout)."""
        return self._ready.wait(timeout)

    def stop(self) -> None:
        """Signal shutdown and close the socket."""
        self._stop.set()
        loop = self._loop
        ws = self._ws
        if loop and ws:
            try:
                asyncio.run_coroutine_threadsafe(ws.close(), loop)
            except Exception:
                pass

    def join(self, timeout: float = 5.0) -> None:
        if self._thread:
            self._thread.join(timeout)

    # ------------------------------------------------------------------ send API
    def send_audio_pcm16(self, pcm16: bytes) -> None:
        """Thread-safe: append a chunk of microphone PCM16 audio."""
        if not pcm16 or self._ws is None or self._loop is None:
            return
        b64 = base64.b64encode(pcm16).decode("ascii")
        msg = json.dumps({"type": "input_audio_buffer.append", "audio": b64})
        try:
            asyncio.run_coroutine_threadsafe(self._safe_send(msg), self._loop)
        except Exception:
            pass

    # ------------------------------------------------------------------ internals
    def _run(self) -> None:
        self._loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self._loop)
        try:
            self._loop.run_until_complete(self._connect_and_listen())
        except Exception as e:  # pragma: no cover - network runtime
            logger.error("Azure Realtime loop crashed: %s", e, exc_info=True)
        finally:
            self._loop.close()

    async def _safe_send(self, msg: str) -> None:
        ws = self._ws
        if ws is not None:
            try:
                await ws.send(msg)
            except Exception as e:
                logger.debug("send failed: %s", e)

    async def _connect_and_listen(self) -> None:
        # GA uses the api-key header; keep the same header for Preview too.
        headers = {"api-key": self.api_key}
        logger.info("Connecting to Azure Realtime: %s", self.ws_url.split("?")[0])
        async with websockets.connect(
            self.ws_url,
            additional_headers=headers,
            max_size=None,
            ping_interval=20,
            ping_timeout=20,
        ) as ws:
            self._ws = ws
            logger.info("WebSocket connected; configuring session")
            await ws.send(json.dumps(self._session_update_payload()))

            async for raw in ws:
                if self._stop.is_set():
                    break
                try:
                    event = json.loads(raw)
                except (ValueError, TypeError):
                    continue
                await self._handle_event(event)

        self._ws = None
        logger.info("WebSocket closed")

    def _session_update_payload(self) -> dict:
        """Build the ``session.update`` message (GA nested-audio shape)."""
        if self.use_ga:
            session = {
                "type": "realtime",
                "instructions": self.instructions,
                "output_modalities": ["audio"],
                "audio": {
                    "input": {
                        "format": {"type": "audio/pcm", "rate": SAMPLE_RATE},
                        "turn_detection": self.turn_detection,
                        "transcription": {"model": "whisper-1"},
                        "noise_reduction": {"type": "near_field"},
                    },
                    "output": {
                        "format": {"type": "audio/pcm", "rate": SAMPLE_RATE},
                        "voice": self.voice,
                    },
                },
            }
        else:
            # Preview (deprecated) flat shape.
            session = {
                "modalities": ["audio", "text"],
                "instructions": self.instructions,
                "voice": self.voice,
                "input_audio_format": "pcm16",
                "output_audio_format": "pcm16",
                "input_audio_transcription": {"model": "whisper-1"},
                "turn_detection": self.turn_detection,
            }
        return {"type": "session.update", "session": session}

    async def _greet(self) -> None:
        """Have the Maestro speak first."""
        if not self.greeting:
            instructions = "Saluta calorosamente e presentati brevemente, poi chiedi da cosa vuole partire."
        else:
            instructions = f"Di' esattamente, con calore: «{self.greeting}»"
        await self._safe_send(json.dumps({"type": "response.create", "response": {"instructions": instructions}}))

    async def _handle_event(self, event: dict) -> None:
        etype = event.get("type", "")

        if etype in ("session.created", "session.updated"):
            if not self._ready.is_set():
                self._ready.set()
                if self.on_ready:
                    _safe_cb(self.on_ready)
                await self._greet()
            return

        # Assistant speech audio (GA + Preview event names).
        if etype in ("response.output_audio.delta", "response.audio.delta"):
            b64 = event.get("delta") or event.get("audio")
            if b64 and self.on_output_audio:
                try:
                    _safe_cb(self.on_output_audio, base64.b64decode(b64))
                except Exception:
                    pass
            return

        # User started speaking -> barge-in / interrupt current playback.
        if etype == "input_audio_buffer.speech_started":
            if self.on_speech_started:
                _safe_cb(self.on_speech_started)
            return

        # Assistant transcript (for logs / captions).
        if etype in (
            "response.output_audio_transcript.delta",
            "response.audio_transcript.delta",
        ):
            delta = event.get("delta") or ""
            if delta and self.on_transcript:
                _safe_cb(self.on_transcript, delta, False)
            return
        if etype in (
            "response.output_audio_transcript.done",
            "response.audio_transcript.done",
        ):
            text = event.get("transcript") or ""
            if text and self.on_transcript:
                _safe_cb(self.on_transcript, text, True)
            return

        if etype == "error":
            logger.error("Azure Realtime error event: %s", json.dumps(event.get("error", event)))
            return

        logger.debug("Unhandled event: %s", etype)


def _safe_cb(cb: Callable, *args) -> None:
    try:
        cb(*args)
    except Exception as e:  # pragma: no cover
        logger.debug("callback error: %s", e)
