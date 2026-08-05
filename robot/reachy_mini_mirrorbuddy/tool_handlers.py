"""What Buddy can actually *do* when the model asks for it.

Split from the session lifecycle in :mod:`controller` because these are the
child-facing capabilities — call another professor, look at the homework, switch
between tutor and friend — while the controller is plumbing. Mixed into
``Controller``, which owns the state these handlers read.

Everything slow is offloaded to a thread: these run on the realtime websocket
loop, and blocking it means Buddy stops hearing the child mid-sentence.
"""

from __future__ import annotations

import logging
import threading

from . import body_actions, camera, meditation, tools
from .azure_realtime import AzureRealtimeClient
from .mirrorbuddy_client import friend_buddy, neutral_buddy

logger = logging.getLogger(__name__)


class ToolCallMixin:
    """Tool dispatch for :class:`~reachy_mini_mirrorbuddy.controller.Controller`."""

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
            elif name == "remember_person":
                self._handle_remember_person(client, args, call_id)
            elif name == "guided_meditation":
                self._start_meditation(client, args, call_id)
            elif name == "who_is_here":
                client.send_function_result(call_id, self._room_summary())
            elif name == "move_body":
                self._handle_move_body(client, args, call_id)
            else:
                client.send_function_result(call_id, "Ok.")
        except Exception as e:  # pragma: no cover - runtime robustness
            logger.warning("tool %s failed: %s", name, e)
            client.send_function_result(call_id, "Scusa, non ci sono riuscito.")

    def _handle_move_body(self, client: AzureRealtimeClient, args: dict, call_id: str) -> None:
        """Play a gesture off the websocket loop.

        The gesture takes seconds and calls ``hold_still``, which sleeps; doing it
        inline would stop Buddy hearing the child mid-game. The result is sent
        with ``respond=True`` so the Maestro speaks while the body is still
        moving — a child who says "abbassa le antenne" and gets silence assumes
        nothing happened, and would be left waiting for a turn that never comes.
        """
        action = body_actions.normalise(args.get("action"))
        if action not in body_actions.ACTIONS:
            client.send_function_result(
                call_id, f"Non conosco quel movimento. So fare: {body_actions.describe()}."
            )
            return
        client.send_function_result(call_id, f"Fatto: {action}.")
        threading.Thread(
            target=self._run_body_action, args=(action,), daemon=True
        ).start()

    def _run_body_action(self, action: str) -> None:
        try:
            self.movements.play_body_action(action)
        except Exception as e:  # pragma: no cover - hardware robustness
            logger.warning("body action %s failed: %s", action, e)

    def _start_meditation(self, client: AzureRealtimeClient, args: dict, call_id: str) -> None:
        """Run a real guided session: bell, imposed silence, bell.

        Answering the tool call before the session starts matters: the model needs
        its turn closed, or it will still be holding the floor when the silence
        begins.
        """
        running = getattr(self, "_meditation", None)
        if running is not None and running.is_alive():
            client.send_function_result(call_id, "Una sessione e' gia' in corso.", respond=False)
            return
        plan = meditation.build_plan(str(args.get("practice") or ""), args.get("minutes") or 2)
        client.send_function_result(call_id, plan.opening)
        self._meditation = meditation.Session(client, self.audio.play, plan)
        self._meditation.start()

    def _handle_call_professor(self, client: AzureRealtimeClient, args: dict, call_id: str) -> None:
        target = tools.resolve_maestro(self.maestri, str(args.get("query") or ""))
        if target is None:
            # Give the model the real roster: without it, it retried the same failing
            # request over and over while the child listened to apologies.
            client.send_function_result(
                call_id,
                "Non ho un professore per quella materia. Ecco chi c'e': "
                f"{tools.professors_summary(self.maestri)}. "
                "Proponi tu l'alternativa piu' vicina, senza richiamare questo strumento con la stessa richiesta.",
            )
            return
        if target.id == self.maestro.id:
            client.send_function_result(call_id, f"Sono gia' io, {self.maestro.display_name}. Andiamo avanti.")
            return
        # Acknowledge without a spoken reply here; the new Maestro will greet.
        client.send_function_result(call_id, f"Passo la parola a {target.display_name}.", respond=False)
        threading.Thread(target=self._switch_to, args=(target,), name="MaestroSwitch", daemon=True).start()

    def _handle_remember_person(self, client: AzureRealtimeClient, args: dict, call_id: str) -> None:
        """Record a name someone just said out loud — nothing else ever gets in.

        A rejected name is reported as a rejection, on purpose: the failure mode we
        are designing against is Buddy smoothing over a misheard name and then
        addressing a child by something nobody in the room is called.
        """
        raw = str(args.get("name") or "")
        # The paired child is not a guest: when the robot boots without a usable
        # STUDENT_NAME, the child answering "mi chiamo Mario" has to land as the
        # student, or every prompt rebuilt afterwards keeps calling them unknown.
        if args.get("is_student"):
            stored = self.people.set_primary(raw)
        else:
            stored = self.people.add_guest(raw)
        if stored is None:
            client.send_function_result(
                call_id,
                "Non ho capito bene il nome. Chiedi di ripeterlo con gentilezza, "
                "e non usare un nome di cui non sei sicuro.",
            )
            return
        client.send_function_result(
            call_id,
            f"Ok, {stored} adesso lo conosco. {self._room_summary()} "
            "Salutalo brevemente e vai avanti: usa i nomi solo quando servono.",
        )

    def _room_summary(self) -> str:
        """Who Buddy can name right now, phrased for the model to read aloud."""
        summary = self.people.summary()
        if not summary:
            return "Non so ancora come si chiama chi e' con te: se serve, chiedilo."
        return f"In questo momento davanti a te ci sono: {summary}."

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
        self.movements.set_emotion("focused")
        self.movements.hold_still()
        try:
            data_url = camera.capture_data_url(self.robot)
        finally:
            self.movements.release_hold()
            self.movements.set_emotion("thinking")
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
