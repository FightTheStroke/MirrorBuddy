"""Azure OpenAI Realtime client over WebSocket (asyncio loop in its own thread).

Bridges robot audio I/O: mic PCM in, model speech + transcripts + tool calls out.
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import threading
from collections.abc import Callable

import websockets

from . import rt_messages
from . import session_flow
from . import tools

logger = logging.getLogger(__name__)

SAMPLE_RATE = rt_messages.SAMPLE_RATE  # Azure Realtime PCM sample rate (in and out)


def _ws_major() -> int:
    """Major version of the installed ``websockets`` package (0 if unknown)."""
    try:
        return int(str(websockets.__version__).split(".", 1)[0])
    except (ValueError, AttributeError):  # pragma: no cover - defensive
        return 0


class AzureRealtimeClient:
    def __init__(
        self,
        ws_url: str,
        api_key: str,
        instructions: str,
        voice: str,
        turn_detection: dict,
        greeting: str | None = None,
        use_ga: bool = True,
        tools: list[dict] | None = None,
        on_output_audio: Callable[[bytes], None] | None = None,
        on_speech_started: Callable[[], None] | None = None,
        on_transcript: Callable[[str, bool], None] | None = None,
        on_ready: Callable[[], None] | None = None,
        on_tool_call: Callable[[str, dict, str], None] | None = None,
        on_sleep: Callable[[], None] | None = None,
        on_wake: Callable[[], None] | None = None,
    ) -> None:
        self.ws_url = ws_url
        self.api_key = api_key
        self.instructions = instructions
        self.voice = voice
        self.turn_detection = turn_detection
        self.greeting = greeting
        self.use_ga = use_ga
        self.tools = tools or []
        self.on_output_audio = on_output_audio
        self.on_speech_started = on_speech_started
        self.on_transcript = on_transcript
        self.on_ready = on_ready
        self.on_tool_call = on_tool_call
        self.on_sleep = on_sleep
        self.on_wake = on_wake
        self._fc_names: dict[str, str] = {}
        self._loop: asyncio.AbstractEventLoop | None = None
        self._thread: threading.Thread | None = None
        self._ws: websockets.WebSocketClientProtocol | None = None
        self._stop = threading.Event()
        self._ready = threading.Event()
        self._responding = False  # a model response is currently streaming
        self._suppress = False  # drop in-flight audio after a barge-in cancel
        self._quiet = False  # student asked for silence: keep model muted
        self._asleep = False  # session ended: stay muted until the wake word
        self._sleep_after = False  # go to sleep once the farewell response finishes
        self._pending_farewell = False  # a goodbye was requested; sleep when it starts→done

    def start(self) -> None:
        self._thread = threading.Thread(target=self._run, name="AzureRealtime", daemon=True)
        self._thread.start()

    def wait_ready(self, timeout: float = 20.0) -> bool:
        return self._ready.wait(timeout)

    def stop(self) -> None:
        self._stop.set()
        loop, ws = self._loop, self._ws
        if loop and ws:
            try:
                asyncio.run_coroutine_threadsafe(ws.close(), loop)
            except Exception:
                pass

    def join(self, timeout: float = 5.0) -> None:
        if self._thread:
            self._thread.join(timeout)

    def send_audio_pcm16(self, pcm16: bytes) -> None:
        if pcm16:
            self._enqueue(json.dumps(rt_messages.audio_append(base64.b64encode(pcm16).decode("ascii"))))

    def send_function_result(self, call_id: str, output: str, respond: bool = True) -> None:
        self._enqueue(json.dumps(rt_messages.function_call_output(call_id, output)))
        if respond:
            self._enqueue(json.dumps({"type": "response.create"}))

    def send_image(self, data_url: str, prompt: str) -> None:
        self._enqueue(json.dumps(rt_messages.image_message(data_url, prompt)))
        self._enqueue(json.dumps({"type": "response.create"}))

    def _enqueue(self, msg: str) -> None:
        if self._ws is None or self._loop is None:
            return
        try:
            asyncio.run_coroutine_threadsafe(self._safe_send(msg), self._loop)
        except Exception:
            pass

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
        headers = {"api-key": self.api_key}
        logger.info("Connecting to Azure Realtime: %s", self.ws_url.split("?")[0])
        # websockets>=13 names custom handshake headers ``additional_headers``; the
        # 12.x asyncio client calls the same argument ``extra_headers``. Pick the one
        # the installed version accepts so we work across both.
        hdr_kw = "additional_headers" if _ws_major() >= 13 else "extra_headers"
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
                    continue
                await self._handle_event(event)

        self._ws = None
        logger.info("WebSocket closed")

    async def _greet(self) -> None:
        instructions = (
            f"Di' esattamente, con calore: «{self.greeting}»" if self.greeting
            else "Saluta calorosamente e presentati brevemente, poi chiedi da cosa vuole partire."
        )
        await self._safe_send(json.dumps({"type": "response.create", "response": {"instructions": instructions}}))

    async def _request_response(self, instructions: str | None = None) -> None:
        """Ask the model to speak now, optionally steering what it should say."""
        await self._safe_send(json.dumps(rt_messages.response_create(instructions)))

    async def _handle_event(self, event: dict) -> None:
        etype = event.get("type", "")

        if etype in ("session.created", "session.updated"):
            if not self._ready.is_set():
                self._ready.set()
                if self.on_ready:
                    _safe_cb(self.on_ready)
                await self._greet()
            return

        if etype in ("response.output_audio.delta", "response.audio.delta"):
            if self._suppress:
                return  # dropped: user barged in, this response is being cancelled
            b64 = event.get("delta") or event.get("audio")
            if b64 and self.on_output_audio:
                _safe_cb(self.on_output_audio, base64.b64decode(b64))
            return

        if etype == "response.created":
            if self._quiet or self._asleep:
                await self._safe_send(rt_messages.CANCEL)
                self._suppress = True
                return
            if self._pending_farewell:  # the goodbye is now starting → sleep once it's done
                self._pending_farewell = False
                self._sleep_after = True
            self._responding = True
            self._suppress = False
            return
        if etype == "response.done":
            self._responding = False
            if self._sleep_after:  # farewell just finished → go to sleep
                self._sleep_after = False
                self._asleep = True
                if self.on_sleep:
                    _safe_cb(self.on_sleep)
            return

        # Student's speech transcribed: honour stop / end / wake intents deterministically.
        if etype.endswith("input_audio_transcription.completed"):
            text = (event.get("transcript") or "").strip()
            if not text:
                return
            action = session_flow.decide(text, self._asleep)
            if action == session_flow.IGNORE:
                return
            if action == session_flow.WAKE:
                self._asleep = self._quiet = False
                if self.on_wake:
                    _safe_cb(self.on_wake)
                await self._request_response(rt_messages.WAKE_INSTR)
                return
            if action == session_flow.END:
                self._pending_farewell = True
                self._suppress = False
                if self._responding:
                    await self._safe_send(rt_messages.CANCEL)
                await self._request_response(rt_messages.FAREWELL_INSTR)
                return
            self._quiet = action == session_flow.STOP
            if self._quiet:
                self._suppress = True
                if self._responding:
                    await self._safe_send(rt_messages.CANCEL)
                if self.on_speech_started:
                    _safe_cb(self.on_speech_started)  # flush local playback now
            return

        # Barge-in: cancel the turn, drop in-flight audio; each new turn starts un-muted.
        if etype == "input_audio_buffer.speech_started":
            if self._asleep:
                return  # ignore ambient speech while asleep; wake word handles it
            self._suppress = True
            self._quiet = False
            if self._responding:
                await self._safe_send(rt_messages.CANCEL)
            if self.on_speech_started:
                _safe_cb(self.on_speech_started)
            return

        if etype in ("response.output_audio_transcript.done", "response.audio_transcript.done"):
            text = event.get("transcript") or ""
            if text and self.on_transcript:
                _safe_cb(self.on_transcript, text, True)
            return

        if etype == "response.output_item.added":
            item = event.get("item") or {}
            if item.get("type") == "function_call":
                cid = item.get("call_id") or item.get("id") or ""
                if cid:
                    self._fc_names[cid] = item.get("name") or ""
            return

        if etype == "response.function_call_arguments.done":
            call_id = event.get("call_id") or ""
            name, args = tools.parse_call_arguments(event, self._fc_names.get(call_id, ""))
            self._fc_names.pop(call_id, None)
            logger.info("Tool call: %s(%s) call_id=%s", name, args, call_id)
            if name and self.on_tool_call:
                _safe_cb(self.on_tool_call, name, args, call_id)
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
