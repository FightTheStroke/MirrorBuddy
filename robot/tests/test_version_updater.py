from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT = REPO_ROOT / "scripts" / "update-robot-version.py"


def load_updater():
    spec = importlib.util.spec_from_file_location("update_robot_version", SCRIPT)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def create_robot_files(root: Path) -> tuple[Path, Path]:
    pyproject = root / "robot" / "pyproject.toml"
    runtime = root / "robot" / "reachy_mini_mirrorbuddy" / "__init__.py"
    pyproject.parent.mkdir(parents=True)
    runtime.parent.mkdir(parents=True)
    pyproject.write_text('[project]\nversion = "0.2.0"\n', encoding="utf-8")
    runtime.write_text('__version__ = "0.2.0"\n', encoding="utf-8")
    return pyproject, runtime


def test_updates_package_and_runtime_versions(tmp_path: Path):
    updater = load_updater()
    pyproject, runtime = create_robot_files(tmp_path)

    updater.update_robot_version(tmp_path, "0.24.9")

    assert 'version = "0.24.9"' in pyproject.read_text(encoding="utf-8")
    assert '__version__ = "0.24.9"' in runtime.read_text(encoding="utf-8")


def test_rejects_non_release_versions_before_writing(tmp_path: Path):
    updater = load_updater()
    pyproject, runtime = create_robot_files(tmp_path)

    with pytest.raises(ValueError, match="three-part numeric version"):
        updater.update_robot_version(tmp_path, "next")

    assert 'version = "0.2.0"' in pyproject.read_text(encoding="utf-8")
    assert '__version__ = "0.2.0"' in runtime.read_text(encoding="utf-8")
