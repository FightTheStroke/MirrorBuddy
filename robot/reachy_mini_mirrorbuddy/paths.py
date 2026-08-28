"""Where MirrorBuddy keeps things on the robot.

One rule drives this module: **nothing the family typed in may live inside the
installed package**. The app store installs the package by replacing that folder,
so a file kept there is destroyed by the next update — quietly, and only noticed
when the robot comes back mute and someone has to retype an Azure key.

So the configuration lives in the user's config directory instead, which no
update, reinstall or app-store cache reset touches. Robots configured before this
existed are migrated the first time they ask for the file.
"""

from __future__ import annotations

import logging
import os
import shutil
from pathlib import Path

logger = logging.getLogger(__name__)

_APP_DIR_NAME = "mirrorbuddy"
_ENV_NAME = ".env"


def config_dir() -> Path:
    """The stable folder for this robot's configuration.

    ``MIRRORBUDDY_CONFIG_DIR`` overrides it (used by the tests, and useful for a
    robot shared by two children). Otherwise the XDG location, which on the
    Reachy Mini is ``/home/pollen/.config/mirrorbuddy``.
    """
    override = os.environ.get("MIRRORBUDDY_CONFIG_DIR")
    if override:
        return Path(override).expanduser()
    xdg = os.environ.get("XDG_CONFIG_HOME")
    base = Path(xdg).expanduser() if xdg else Path.home() / ".config"
    return base / _APP_DIR_NAME


def env_file(instance_path: str | None = None) -> Path:
    """The configuration file, creating the folder and migrating an older robot.

    ``instance_path`` is where the app used to keep it — the installed package
    folder. It is read once, to carry an already-configured robot across, and
    never written to again.
    """
    target = config_dir() / _ENV_NAME
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists():
        _migrate_legacy(instance_path, target)
    _restrict_permissions(target)
    return target


def _migrate_legacy(instance_path: str | None, target: Path) -> None:
    if not instance_path:
        return
    legacy = Path(instance_path) / _ENV_NAME
    if not legacy.is_file():
        return
    try:
        shutil.copyfile(legacy, target)
    except OSError as e:  # pragma: no cover - unreadable legacy file
        logger.warning("Could not carry the old configuration over: %s", e)
        return
    logger.info("Configuration moved to %s, where an update cannot delete it", target)


def _restrict_permissions(target: Path) -> None:
    """The file holds an API key: keep it readable only by the robot's own user."""
    if not target.exists():
        return
    try:
        target.chmod(0o600)
    except OSError as e:  # pragma: no cover - exotic filesystem
        logger.debug("Could not tighten permissions on %s: %s", target, e)
