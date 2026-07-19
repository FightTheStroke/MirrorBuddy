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

from .audio_io import AudioIO
from .config import config
from .controller import Controller
from .mirrorbuddy_client import MirrorBuddyClient, neutral_buddy
from .movements import Movements, temperament_for

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

    # If paired to a logged-in child, fetch and apply their profile (name, accessibility,
    # locale) before choosing the persona — so Buddy starts personalised for that child.
    if config.DEVICE_TOKEN:
        from .device import apply_device_profile, fetch_device_profile

        profile = fetch_device_profile(config.API_BASE, config.DEVICE_TOKEN)
        if profile is not None:
            apply_device_profile(config, profile)
        else:
            logger.info("No paired profile applied; using local .env configuration.")

    # Fetch the Maestro persona live from MirrorBuddy.
    mb = MirrorBuddyClient(config.MIRRORBUDDY_URL, locale=config.LOCALE)
    try:
        maestri = mb.fetch_maestri()
        if config.MAESTRO_ID:
            maestro = mb.pick(maestri, config.MAESTRO_ID)  # profile pinned this Maestro
        elif config.START_NEUTRAL:
            maestro = neutral_buddy(config.STUDENT_NAME, config.BUDDY_VOICE)  # neutral organiser
        else:
            maestro = mb.pick(maestri, None)
    except Exception as e:
        logger.error("Could not load Maestri from MirrorBuddy (%s): %s", config.MIRRORBUDDY_URL, e)
        sys.exit(1)
    logger.info("Embodying Maestro: %s (%s), voice=%s", maestro.display_name, maestro.id, maestro.voice)

    # Initialize the robot if the host didn't hand us one. When the Reachy Mini host
    # launches the app it opens (and will close) the robot for us, so only tear it
    # down here if we created it.
    owns_robot = robot is None
    if robot is None:
        robot = ReachyMini(**({"robot_name": args.robot_name} if args.robot_name else {}))

    # --- assemble the pipeline -------------------------------------------------
    follow_face = config.FOLLOW_FACE and config.ENABLE_CAMERA and not args.no_camera
    temperament = temperament_for(maestro.subject, maestro.teaching_style, maestro.voice_instructions)
    movements = Movements(robot, enabled=config.ENABLE_MOVEMENTS, temperament=temperament,
                          follow_face=follow_face, calm=config.CALM_MOVEMENT)

    audio = AudioIO(
        robot,
        on_input_pcm16=lambda b: None,
        movements=movements,
        barge_rms_threshold=config.BARGE_RMS_THRESHOLD,
        barge_sustain_frames=config.BARGE_SUSTAIN_FRAMES,
    )

    controller = Controller(robot, config, maestri, maestro, audio, movements)

    # Graceful shutdown on the host stop event.
    def _watch_stop() -> None:
        if app_stop_event is not None:
            app_stop_event.wait()
            logger.info("Stop event received; shutting down")
            controller.stop()

    if app_stop_event is not None:
        threading.Thread(target=_watch_stop, daemon=True).start()

    movements.start()
    movements.wake()
    # Start the audio pipeline *before* the realtime client so the speaker sample
    # rate is probed before any greeting audio arrives. Otherwise the first chunks
    # play at the wrong rate (a "ghost" voice) until the rate is known.
    audio.start()
    controller.start()
    logger.info("MirrorBuddy is live 🎙️  — say something!")

    try:
        # Block until the realtime client thread ends (stop or disconnect).
        while controller.is_alive():
            if app_stop_event is not None and app_stop_event.is_set():
                break
            time.sleep(0.2)
    except KeyboardInterrupt:
        logger.info("Interrupted")
    finally:
        logger.info("Cleaning up...")
        audio.stop()
        controller.stop()
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
