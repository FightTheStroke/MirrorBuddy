"""Entry point for the MirrorBuddy Reachy Mini app.

Wires together:
    MirrorBuddy Maestro (persona)  ->  instructions
    Azure OpenAI Realtime          <->  robot microphone / speaker
    speech energy                  ->  expressive antenna movement
"""

from __future__ import annotations

import argparse
import logging
import sys
import threading
import time
from pathlib import Path

from reachy_mini import ReachyMini, ReachyMiniApp

from .azure_realtime import AzureRealtimeClient
from .audio_io import AudioIO
from .config import config
from .dsa import turn_detection_config
from .mirrorbuddy_client import MirrorBuddyClient
from .movements import Movements
from .prompt_builder import build_instructions

logger = logging.getLogger(__name__)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="MirrorBuddy on Reachy Mini")
    parser.add_argument("--debug", action="store_true", help="Verbose logging")
    parser.add_argument("--no-camera", action="store_true", help="Disable the camera")
    parser.add_argument("--robot-name", default=None, help="Robot name for the SDK")
    args, _ = parser.parse_known_args()
    return args


def _setup_logging(debug: bool) -> None:
    logging.basicConfig(
        level=logging.DEBUG if debug else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s | %(message)s",
    )


def run(
    args: argparse.Namespace,
    robot: ReachyMini | None = None,
    app_stop_event: threading.Event | None = None,
    settings_app=None,
    instance_path: str | None = None,
) -> None:
    _setup_logging(args.debug)
    logger.info("Starting MirrorBuddy Reachy Mini app")

    # Load instance .env (Azure creds + MirrorBuddy config live here on the robot).
    if instance_path:
        env_path = Path(instance_path) / ".env"
        if env_path.exists():
            from dotenv import load_dotenv

            load_dotenv(dotenv_path=str(env_path), override=True)
            config.reload()

    # Optional in-app settings UI (lets you pick the Maestro / enter creds).
    if settings_app is not None:
        try:
            from .settings_ui import mount_settings_routes

            mount_settings_routes(settings_app, instance_path)
        except Exception as e:
            logger.warning("Failed to mount settings UI: %s", e)

    # Wait for required configuration (Azure creds) if a settings UI is available.
    missing = config.missing()
    if missing:
        if settings_app is not None:
            logger.info("Waiting for configuration via settings UI: %s", ", ".join(missing))
            while config.missing():
                time.sleep(0.5)
                config.reload()
        else:
            logger.error("Missing required configuration: %s", ", ".join(missing))
            sys.exit(1)

    # Fetch the Maestro persona live from MirrorBuddy.
    mb = MirrorBuddyClient(config.MIRRORBUDDY_URL, locale=config.LOCALE)
    try:
        maestri = mb.fetch_maestri()
        maestro = mb.pick(maestri, config.MAESTRO_ID)
    except Exception as e:
        logger.error("Could not load Maestri from MirrorBuddy (%s): %s", config.MIRRORBUDDY_URL, e)
        sys.exit(1)
    logger.info("Embodying Maestro: %s (%s), voice=%s", maestro.display_name, maestro.id, maestro.voice)

    instructions = build_instructions(
        maestro,
        locale=config.LOCALE,
        dsa_profile=config.DSA_PROFILE,
        student_name=config.STUDENT_NAME,
    )

    # Initialize the robot if the host didn't hand us one. When the Reachy Mini host
    # launches the app it opens (and will close) the robot for us, so only tear it
    # down here if we created it.
    owns_robot = robot is None
    if robot is None:
        robot = ReachyMini(**({"robot_name": args.robot_name} if args.robot_name else {}))

    # --- assemble the pipeline -------------------------------------------------
    movements = Movements(robot, enabled=config.ENABLE_MOVEMENTS)

    audio = AudioIO(robot, on_input_pcm16=lambda b: None, movements=movements)

    client = AzureRealtimeClient(
        ws_url=config.realtime_ws_url(),
        api_key=config.AZURE_API_KEY or "",
        instructions=instructions,
        voice=maestro.voice,
        turn_detection=turn_detection_config(config.DSA_PROFILE),
        greeting=maestro.greeting or None,
        use_ga=config.use_ga_protocol,
        on_output_audio=audio.play,
        on_speech_started=audio.interrupt,
        on_transcript=_log_transcript,
    )
    # Now that the client exists, route microphone audio into it.
    audio.on_input_pcm16 = client.send_audio_pcm16

    # Graceful shutdown on the host stop event.
    def _watch_stop() -> None:
        if app_stop_event is not None:
            app_stop_event.wait()
            logger.info("Stop event received; shutting down")
            client.stop()

    if app_stop_event is not None:
        threading.Thread(target=_watch_stop, daemon=True).start()

    movements.start()
    client.start()
    if not client.wait_ready(timeout=25.0):
        logger.warning("Realtime session not confirmed ready; continuing anyway")
    audio.start()
    logger.info("MirrorBuddy is live 🎙️  — say something!")

    try:
        # Block until the realtime client thread ends (stop or disconnect).
        while client._thread and client._thread.is_alive():
            if app_stop_event is not None and app_stop_event.is_set():
                break
            time.sleep(0.2)
    except KeyboardInterrupt:
        logger.info("Interrupted")
    finally:
        logger.info("Cleaning up...")
        audio.stop()
        client.stop()
        client.join()
        movements.stop()
        if owns_robot:
            try:
                robot.media.close()
            except Exception:
                pass
            try:
                robot.client.disconnect()
            except Exception:
                pass
        logger.info("Shutdown complete")


def _log_transcript(text: str, final: bool) -> None:
    if final:
        logger.info("Buddy: %s", text)


def main() -> None:
    """Console-script entry point."""
    run(parse_args())


class ReachyMiniMirrorBuddy(ReachyMiniApp):  # type: ignore[misc]
    """Reachy Mini app: MirrorBuddy with a body."""

    description = "MirrorBuddy on Reachy Mini — a MirrorBuddy Maestro with eyes, ears, mouth and movements."
    custom_app_url = "http://0.0.0.0:7862/"
    dont_start_webserver = False

    def run(self, reachy_mini: ReachyMini, stop_event: threading.Event) -> None:
        instance_path = self._get_instance_path().parent
        run(
            parse_args(),
            robot=reachy_mini,
            app_stop_event=stop_event,
            settings_app=self.settings_app,
            instance_path=str(instance_path),
        )


if __name__ == "__main__":
    app = ReachyMiniMirrorBuddy()
    try:
        app.wrapped_run()
    except KeyboardInterrupt:
        app.stop()
