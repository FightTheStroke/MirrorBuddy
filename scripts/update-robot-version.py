#!/usr/bin/env python3
"""Keep Reachy Mini package metadata aligned with a MirrorBuddy release."""

from __future__ import annotations

import argparse
from pathlib import Path
import re

VERSION_PATTERN = re.compile(r"\d+\.\d+\.\d+")
TARGETS = (
    (
        Path("robot/pyproject.toml"),
        re.compile(r'(?m)^version = "[^"]+"$'),
        'version = "{version}"',
    ),
    (
        Path("robot/reachy_mini_mirrorbuddy/__init__.py"),
        re.compile(r'(?m)^__version__ = "[^"]+"$'),
        '__version__ = "{version}"',
    ),
)


def update_robot_version(root: Path, version: str) -> None:
    if VERSION_PATTERN.fullmatch(version) is None:
        raise ValueError(f"Expected a three-part numeric version, got {version!r}")

    for relative_path, pattern, replacement_template in TARGETS:
        path = root / relative_path
        content = path.read_text(encoding="utf-8")
        updated, count = pattern.subn(
            replacement_template.format(version=version),
            content,
            count=1,
        )
        if count != 1:
            raise ValueError(
                f"Expected one version declaration in {relative_path}, found {count}"
            )
        path.write_text(updated, encoding="utf-8")
        print(f"{relative_path} updated to {version}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("version")
    parser.add_argument(
        "--root",
        type=Path,
        default=Path(__file__).resolve().parents[1],
        help=argparse.SUPPRESS,
    )
    args = parser.parse_args()
    update_robot_version(args.root.resolve(), args.version)


if __name__ == "__main__":
    main()
