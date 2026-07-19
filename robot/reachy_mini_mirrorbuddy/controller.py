"""Orchestrates the live session: tool dispatch, professor switching and vision.

The controller owns the current :class:`AzureRealtimeClient` and swaps it out when the
student asks for another professor (a new voice + persona needs a fresh realtime
session). It keeps ``main.py`` thin and holds all the voice-driven behaviour:

- ``list_professors``   → speak the available Maestri.
- ``call_professor``    → switch persona + voice live.
- ``look_at_homework``  → capture one camera frame and let Buddy read it.
"""

from __future__ import annotations

import logging
import threading

from . import camera, tools
from .audio_io import AudioIO
from .azure_realtime import AzureRealtimeClient
from .config import Config
from .dsa import turn_detection_config
from .mirrorbuddy_client import Maestro, friend_buddy, neutral_buddy
from .movements import Movements, temperament_for
from .prompt_builder import build_instructions

logger = logging.getLogger(__name__)


class Controller:
    """Owns the realtime client and reacts to the model's tool calls."""

    def __init__(
        self,
        robot,
        cfg: Config,
        maestri: list[Maestro],
        maestro: Maestro,
        audio: AudioIO,
        movements: Movements,
    ) -> None:
        self.robot = robot
        self.cfg = cfg
        self.maestri = maestri
        self.maestro = maestro
        self.audio = audio
        self.movements = movements
        self._client: AzureRealtimeClient | None = None
        self._switch_lock = threading.Lock()

    # ------------------------------------------------------------------ lifecycle
    def start(self) -> bool:
        """Connect the first Maestro. Returns True once the session is ready."""
        self._client = self._build_client(self.maestro)
        self.audio.on_input_pcm16 = self._client.send_audio_pcm16
        self.audio.on_local_barge_in = self._client.local_barge_in
        self._client.start()
        ready = self._client.wait_ready(timeout=25.0)
        if not ready:
            logger.warning("Realtime session not confirmed ready; continuing anyway")
        return ready

    def is_alive(self) -> bool:
        c = self._client
        return bool(c and c._thread and c._thread.is_alive())

    def stop(self) -> None:
        c = self._client
        if c:
            c.stop()
            c.join()

    # ------------------------------------------------------------------ building
    def _build_client(self, maestro: Maestro) -> AzureRealtimeClient:
        instructions = build_instructions(
            maestro,
            locale=self.cfg.LOCALE,
            dsa_profile=self.cfg.DSA_PROFILE,
            student_name=self.cfg.STUDENT_NAME,
        )
        return AzureRealtimeClient(
            ws_url=self.cfg.realtime_ws_url(),
            api_key=self.cfg.AZURE_API_KEY or "",
            instructions=instructions,
            voice=maestro.voice,
            turn_detection=turn_detection_config(self.cfg.DSA_PROFILE),
            greeting=maestro.greeting or None,
            use_ga=self.cfg.use_ga_protocol,
            tools=tools.TOOL_SCHEMAS,
            on_output_audio=self.audio.play,
            on_speech_started=self.audio.interrupt,
            on_transcript=_log_transcript,
            on_tool_call=self._on_tool_call,
            on_sleep=self._on_sleep,
            on_wake=self._on_wake,
        )

    # ------------------------------------------------------------------ sleep / wake
    def _on_sleep(self) -> None:
        """Stop/end: settle into a calm rest posture and stay put until called back."""
        try:
            self.audio.interrupt()
            self.movements.hold_still()  # rest position: head level, antennas calm, no motion
            logger.info("Robot is resting. Say 'Buddy' to wake it up.")
        except Exception as e:  # pragma: no cover - runtime robustness
            logger.debug("sleep handling failed: %s", e)

    def _on_wake(self) -> None:
        """Called back by name: resume motion with a small wake gesture."""
        try:
            self.movements.release_hold()
            self.movements.wake()
            logger.info("Woken up; resuming the session.")
        except Exception as e:  # pragma: no cover - runtime robustness
            logger.debug("wake handling failed: %s", e)

    # ------------------------------------------------------------------ tools
    def _on_tool_call(self, name: str, args: dict, call_id: str) -> None:
        """Runs in the realtime client's thread — keep it quick; offload the switch."""
        client = self._client
        if client is None:
            return
        try:
            if name == "list_professors":
                client.send_function_result(call_id, tools.professors_summary(self.maestri))
            elif name == "call_professor":
                self._handle_call_professor(client, args, call_id)
            elif name == "look_at_homework":
                self._handle_look_at_homework(client, args, call_id)
            elif name == "talk_as_friend":
                self._switch_persona(client, call_id, friend=True)
            elif name == "back_to_study":
                self._switch_persona(client, call_id, friend=False)
            else:
                client.send_function_result(call_id, "Ok.")
        except Exception as e:  # pragma: no cover - runtime robustness
            logger.warning("tool %s failed: %s", name, e)
            client.send_function_result(call_id, "Scusa, non ci sono riuscito.")

    def _handle_call_professor(self, client: AzureRealtimeClient, args: dict, call_id: str) -> None:
        target = tools.resolve_maestro(self.maestri, str(args.get("query") or ""))
        if target is None:
            client.send_function_result(call_id, "Non ho trovato quel professore, puoi ripetere il nome o la materia?")
            return
        if target.id == self.maestro.id:
            client.send_function_result(call_id, f"Sono gia' io, {self.maestro.display_name}. Andiamo avanti.")
            return
        # Acknowledge without a spoken reply here; the new Maestro will greet.
        client.send_function_result(call_id, f"Passo la parola a {target.display_name}.", respond=False)
        threading.Thread(target=self._switch_to, args=(target,), name="MaestroSwitch", daemon=True).start()

    def _switch_persona(self, client: AzureRealtimeClient, call_id: str, friend: bool) -> None:
        """Swap between the friend companion and the study tutor (persona + voice)."""
        target = (
            friend_buddy(self.cfg.STUDENT_NAME, self.cfg.BUDDY_VOICE)
            if friend
            else neutral_buddy(self.cfg.STUDENT_NAME, self.cfg.BUDDY_VOICE)
        )
        if target.id == self.maestro.id:
            client.send_function_result(call_id, "Certo, sono qui.")
            return
        client.send_function_result(call_id, "Va bene.", respond=False)
        threading.Thread(target=self._switch_to, args=(target,), name="PersonaSwitch", daemon=True).start()

    def _handle_look_at_homework(self, client: AzureRealtimeClient, args: dict, call_id: str) -> None:
        if not self.cfg.ENABLE_CAMERA:
            client.send_function_result(call_id, "La telecamera e' spenta nelle impostazioni, non posso guardare.")
            return
        # Offload: freezing the head to get a sharp frame takes ~1s; never block the ws loop.
        threading.Thread(target=self._capture_homework, args=(client, args, call_id), daemon=True).start()

    def _capture_homework(self, client: AzureRealtimeClient, args: dict, call_id: str) -> None:
        self.movements.hold_still()
        try:
            data_url = camera.capture_data_url(self.robot)
        finally:
            self.movements.release_hold()
        if not data_url:
            client.send_function_result(call_id, "Non riesco a vedere bene, avvicina il foglio e riproviamo.")
            return
        question = str(args.get("question") or "").strip() or (
            "Guarda la foto: puo' essere un compito, la pagina di un quaderno o di un libro, "
            "o lo schermo. Leggi cosa c'e' scritto e aiuta lo studente passo passo, senza dare "
            "la risposta pronta."
        )
        # Privacy: we already announced verbally; hand the still frame to the model.
        client.send_function_result(call_id, "Ho guardato il tuo compito.", respond=False)
        client.send_image(data_url, question)

    # ------------------------------------------------------------------ switching
    def _switch_to(self, target: Maestro) -> None:
        """Reconnect the realtime session with a new persona and voice."""
        with self._switch_lock:
            old = self._client
            self.audio.interrupt()
            self.movements.set_temperament(
                temperament_for(target.subject, target.teaching_style, target.voice_instructions)
            )
            new = self._build_client(target)
            new.start()
            if not new.wait_ready(timeout=25.0):
                logger.warning("New Maestro session not ready; keeping the previous one")
                new.stop()
                new.join()
                return
            self.audio.on_input_pcm16 = new.send_audio_pcm16
            self.audio.on_local_barge_in = new.local_barge_in
            self._client = new
            self.maestro = target
            if old:
                old.stop()
                old.join()
            logger.info("Switched to Maestro %s (%s), voice=%s", target.display_name, target.id, target.voice)


def _log_transcript(text: str, final: bool) -> None:
    if final:
        logger.info("Buddy: %s", text)
