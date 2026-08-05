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

from . import ambient_vision, presence, tools
from .audio_io import AudioIO
from .azure_realtime import AzureRealtimeClient
from .config import Config
from .dsa import turn_detection_config
from .mirrorbuddy_client import Maestro
from .movements import Movements, temperament_for
from .people import Roster
from .prompt_builder import build_instructions
from .tool_handlers import ToolCallMixin

logger = logging.getLogger(__name__)


class Controller(ToolCallMixin):
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
        # Who is in the room, for this power cycle only (see people.Roster).
        self.people = Roster(cfg.STUDENT_NAME)
        self._client: AzureRealtimeClient | None = None
        self._switch_lock = threading.Lock()
        self._partial = ""  # transcript of the reply in flight, used to read the mood
        self._expressed = False
        self._presence: presence.PresenceWatcher | None = None
        self._vision: ambient_vision.AmbientVision | None = None

    # ------------------------------------------------------------------ lifecycle
    def start(self) -> bool:
        """Connect the first Maestro. Returns True once the session is ready."""
        self._client = self._build_client(self.maestro)
        self.audio.on_input_pcm16 = self._client.send_audio_pcm16
        self.audio.on_local_barge_in = self._client.local_barge_in
        self._client.start()
        if self.cfg.ENABLE_CAMERA:
            self._presence = presence.PresenceWatcher(self.robot, self._on_presence)
            self._presence.start()
            if self.cfg.AMBIENT_VISION:
                self._vision = ambient_vision.AmbientVision(
                    self.robot, interval_s=self.cfg.AMBIENT_VISION_INTERVAL_S
                )
                self._vision.start()
        ready = self._client.wait_ready(timeout=25.0)
        if not ready:
            logger.warning("Realtime session not confirmed ready; continuing anyway")
        return ready

    def is_alive(self) -> bool:
        c = self._client
        return bool(c and c._thread and c._thread.is_alive())

    def stop(self) -> None:
        if self._presence:
            self._presence.stop()
            self._presence = None
        if self._vision:
            self._vision.stop()
            self._vision = None
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
            roster=self.people,
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
            on_speech_started=self._on_speech_started,
            on_transcript=self._on_transcript,
            on_tool_call=self._on_tool_call,
            on_sleep=self._on_sleep,
            on_wake=self._on_wake,
        )

    # ------------------------------------------------------------------ seeing
    def _on_presence(self, event: str) -> None:
        """The student appeared or disappeared from view: behave accordingly.

        Deliberately quiet. A robot that comments every time a child shifts in his
        chair is a robot a child stops wanting at the desk, so leaving is silent —
        only the body settles — and only a real return is worth a word.
        """
        client = self._client
        if event == presence.LEFT:
            self.movements.set_emotion("calm")
            self.audio.interrupt()  # stop talking to an empty chair
            return
        self.movements.set_emotion("happy")
        if client is None:
            return
        if client._asleep:
            # He is back at the desk, so the robot listens again — but he asked for
            # quiet, so it does not celebrate its own return.
            client.resume_silently()
            return
        if event == presence.ARRIVED:
            client.speak_now(
                "Lo studente si e' appena seduto davanti a te: salutalo brevemente "
                f"{self._name_clause()} e chiedi da cosa vuole partire. Una frase soltanto."
            )
        elif event == presence.RETURNED:
            client.speak_now(
                "Lo studente e' tornato dopo una pausa: fai un bentornato molto breve "
                f"{self._name_clause(use_name=False)} e riprendi da dove eravate. Una frase soltanto."
            )

    def _name_clause(self, use_name: bool = True) -> str:
        """How to address the room — never an open invitation to invent a name.

        "Greet him by name" without supplying one is exactly how the robot ended up
        calling Mario "Luca". If we don't have a usable name (the server encrypts
        names, and a decryption miss puts ciphertext on the wire), we say so.

        ``use_name=False`` is the sparing half of the fix: the opening hello may use
        the name, a welcome-back two minutes later should not — repeating it every
        single time is the tic Roberto asked us to remove.
        """
        if self.people.guests:
            # More than one person at the table: a single name would address the
            # wrong one, so greet the room and let the model pick who is speaking.
            return "salutando chi c'e' senza ripetere i nomi"
        name = self.people.primary
        if use_name and name:
            return f"chiamandolo per nome ({name})"
        return "senza usare nomi propri"

    # ------------------------------------------------------------------ expression
    def _on_speech_started(self) -> None:
        """The student is talking: stop the audio and listen with an open posture."""
        self.audio.interrupt()
        self.reset_expression()
        self.movements.set_emotion("curious")
        if self._vision and self._client:
            threading.Thread(
                target=self._vision.attach, args=(self._client,), name="AmbientFrame", daemon=True
            ).start()

    def _on_transcript(self, text: str, final: bool) -> None:
        """Log the finished line; colour the body language from the first words."""
        if final:
            logger.info("Buddy: %s", text)
            return
        self._partial += text
        # One reading per response: the opening clause sets the mood, and re-reading
        # every delta would make Buddy twitch between moods mid-sentence.
        if not self._expressed and len(self._partial) >= 12:
            self._expressed = True
            self.movements.express(self._partial)

    def reset_expression(self) -> None:
        """Start a fresh response: clear the partial transcript and ease back to neutral."""
        self._partial = ""
        self._expressed = False
        self.movements.set_emotion(None)

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


