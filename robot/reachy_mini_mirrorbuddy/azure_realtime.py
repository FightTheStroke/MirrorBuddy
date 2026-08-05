"""Azure OpenAI Realtime client over WebSocket (asyncio loop in its own thread).

Bridges robot audio I/O: mic PCM in, model speech + transcripts + tool calls out.
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import threading
import time
from collections.abc import Callable

import websockets

from . import rt_messages
from .rt_events import RealtimeEventsMixin

logger = logging.getLogger(__name__)

SAMPLE_RATE = rt_messages.SAMPLE_RATE  # Azure Realtime PCM sample rate (in and out)

_RECONNECT_MIN_S = 1.0  # a session that ran its course comes back immediately
_RECONNECT_MAX_S = 30.0  # a robot deaf for more than half a minute is a broken robot
_HEALTHY_SESSION_S = 30.0  # shorter than this counts as a failure, so we back off


def _ws_major() -> int:
    """Major version of the installed ``websockets`` package (0 if unknown)."""
    try:
        return int(str(websockets.__version__).split(".", 1)[0])
    except (ValueError, AttributeError):  # pragma: no cover - defensive
        return 0


class AzureRealtimeClient(RealtimeEventsMixin):
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
        self._speech_started_at = 0.0  # monotonic time the student began this turn
        self._fast_requested = False  # response already asked for before the transcript
        self._asleep_flag = False  # session ended: stay muted until the wake word
        self._asleep_since = 0.0  # monotonic time the rest began, for the timeout
        self._meditating = False  # a guided silence is running: nothing may speak
        self._sleep_after = False  # go to sleep once the farewell response finishes
        self._pending_farewell = False  # a goodbye was requested; sleep when it starts→done
        self._partial_user = ""  # transcript of the turn being spoken, read for stop words
        self._stopped_on_partial = False  # a stop word already fired for this turn

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

    def send_image(self, data_url: str, prompt: str, respond: bool = True) -> None:
        self._enqueue(json.dumps(rt_messages.image_message(data_url, prompt)))
        if respond:
            self._enqueue(json.dumps({"type": "response.create"}))

    def speak_now(self, instructions: str) -> None:
        """Ask the model to say something on its own initiative (thread-safe).

        Used when the world changed rather than the conversation: the student sat
        down, or came back. Refused while asleep or muted — "zitto" outranks
        anything the robot noticed by itself.
        """
        if self._asleep or self._quiet or self._responding or self._meditating:
            return
        self._enqueue(json.dumps(rt_messages.response_create(instructions)))

    @property
    def _asleep(self) -> bool:
        return self._asleep_flag

    @_asleep.setter
    def _asleep(self, value: bool) -> None:
        """Falling asleep always stamps the clock.

        The rest timeout is the safety net for a wake word that never lands, so it
        must not depend on every future caller remembering to set the timestamp:
        an unstamped rest would either never expire or expire instantly.
        """
        if value and not self._asleep_flag:
            self._asleep_since = time.monotonic()
        self._asleep_flag = bool(value)

    def resume_silently(self) -> None:
        """Lift a rest without saying anything (thread-safe).

        Used when the world says the student is back — a face at the desk again —
        which is a reason to start listening properly, not a reason to talk. The
        robot simply becomes answerable again on the next question.
        """
        if not self._asleep:
            return
        self._asleep = False
        self._quiet = False
        logger.info("Rest lifted: the student is back at the desk")

    def start_meditation(self) -> None:
        """Enter a guided silence (thread-safe).

        Unlike ``_quiet``, this is not cleared by the child breathing, coughing or
        shifting in his chair: a silence that ends at the first sound is not a
        silence. Only the end of the session, or the child asking, lifts it.
        """
        self._meditating = True

    def end_meditation(self) -> None:
        """Give the voice back. Safe to call twice; the session always calls it."""
        self._meditating = False

    def local_barge_in(self) -> None:
        """On-device barge-in (called from the mic thread when a real voice is heard
        over Buddy's speech). Drops in-flight model audio immediately and asks the
        server to cancel the active response, without waiting for the server's own
        ``speech_started``. Thread-safe: only flag writes + a queued cancel. The
        stop/sleep/wake classification still runs on the transcript that follows."""
        self._suppress = True  # drop any audio deltas already in flight
        self._quiet = False  # a normal turn stays un-muted; a stop word re-mutes below
        if self._responding:
            self._responding = False  # one CANCEL per response: avoid a pile-up of no-op cancels
            self._enqueue(rt_messages.CANCEL)

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
            self._loop.run_until_complete(self._session_loop())
        except Exception as e:  # pragma: no cover - network runtime
            logger.error("Azure Realtime loop crashed: %s", e, exc_info=True)
        finally:
            self._loop.close()

    async def _session_loop(self) -> None:
        """Keep a live session for as long as the app runs.

        Azure hard-closes every Realtime session at 60 minutes
        ("session_expired"), and Wi-Fi drops happen. Either way this thread used
        to end, which ended the app: the robot went deaf mid-homework and not even
        the wake word could reach it. So a closed socket is a reconnect, not an
        exit — only :meth:`stop` really stops.
        """
        delay = _RECONNECT_MIN_S
        while not self._stop.is_set():
            started = time.monotonic()
            self._reset_session_state()
            try:
                await self._connect_and_listen()
            except Exception as e:
                logger.error("Realtime session dropped: %s", e)
            if self._stop.is_set():
                return
            if time.monotonic() - started >= _HEALTHY_SESSION_S:
                delay = _RECONNECT_MIN_S  # a real session ran: come back at once
            logger.info("Realtime session ended; reconnecting in %.0fs", delay)
            await asyncio.sleep(delay)
            delay = min(delay * 2, _RECONNECT_MAX_S)

    def _reset_session_state(self) -> None:
        """Clear per-session flags, keep what the child asked for.

        A session that died mid-sentence leaves audio suppressed and a response
        "in flight"; carrying that into the new session would mute it entirely.
        ``_asleep`` / ``_quiet`` are deliberately preserved: if the child said
        "zitto", coming back talking is exactly the insistence to avoid.
        """
        self._ws = None
        self._suppress = False
        self._responding = False
        self._fast_requested = False
        self._stopped_on_partial = False
        self._partial_user = ""

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
        """Ask the model to speak now, optionally steering what it should say.

        The server rejects a second response while one is streaming
        (``conversation_already_has_active_response``), so a turn that is already
        being answered is left alone.
        """
        if self._responding or self._meditating:
            return
        await self._safe_send(json.dumps(rt_messages.response_create(instructions)))
