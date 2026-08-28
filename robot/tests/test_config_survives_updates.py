"""The child's configuration must outlive every app update.

This is written from a real incident. The Azure credentials and the pairing token
were kept in a ``.env`` file *inside the installed package folder*. Updating the
app replaces that folder, so every update — and every app-store cache reset —
silently wiped the robot's configuration, and the robot came back mute until an
adult retyped an Azure key by hand.

The fix is not "remember to back it up". It is to keep the file somewhere an
update cannot reach.
"""

from __future__ import annotations

from reachy_mini_mirrorbuddy import paths


class TestTheConfigurationOutlivesAnUpdate:
    def test_it_is_not_stored_inside_the_installed_package(self, tmp_path, monkeypatch):
        monkeypatch.setenv("MIRRORBUDDY_CONFIG_DIR", str(tmp_path / "config"))
        package_dir = tmp_path / "site-packages" / "reachy_mini_mirrorbuddy"
        package_dir.mkdir(parents=True)

        env_file = paths.env_file(str(package_dir))

        assert package_dir not in env_file.parents

    def test_an_update_that_deletes_the_package_keeps_the_credentials(self, tmp_path, monkeypatch):
        import shutil

        monkeypatch.setenv("MIRRORBUDDY_CONFIG_DIR", str(tmp_path / "config"))
        package_dir = tmp_path / "site-packages" / "reachy_mini_mirrorbuddy"
        package_dir.mkdir(parents=True)

        env_file = paths.env_file(str(package_dir))
        env_file.write_text("AZURE_OPENAI_REALTIME_API_KEY=secret\n", encoding="utf-8")

        shutil.rmtree(package_dir)  # exactly what an app update does

        assert paths.env_file(str(package_dir)).read_text(encoding="utf-8") == (
            "AZURE_OPENAI_REALTIME_API_KEY=secret\n"
        )

    def test_a_robot_configured_before_the_fix_is_migrated_once(self, tmp_path, monkeypatch):
        monkeypatch.setenv("MIRRORBUDDY_CONFIG_DIR", str(tmp_path / "config"))
        package_dir = tmp_path / "site-packages" / "reachy_mini_mirrorbuddy"
        package_dir.mkdir(parents=True)
        (package_dir / ".env").write_text("MIRRORBUDDY_STUDENT_NAME=Mario\n", encoding="utf-8")

        env_file = paths.env_file(str(package_dir))

        assert env_file.read_text(encoding="utf-8") == "MIRRORBUDDY_STUDENT_NAME=Mario\n"

    def test_migration_never_overwrites_what_is_already_there(self, tmp_path, monkeypatch):
        monkeypatch.setenv("MIRRORBUDDY_CONFIG_DIR", str(tmp_path / "config"))
        package_dir = tmp_path / "site-packages" / "reachy_mini_mirrorbuddy"
        package_dir.mkdir(parents=True)
        (package_dir / ".env").write_text("MIRRORBUDDY_STUDENT_NAME=stale\n", encoding="utf-8")

        current = paths.env_file(str(package_dir))
        current.write_text("MIRRORBUDDY_STUDENT_NAME=current\n", encoding="utf-8")

        assert paths.env_file(str(package_dir)).read_text(encoding="utf-8") == (
            "MIRRORBUDDY_STUDENT_NAME=current\n"
        )

    def test_the_key_is_not_left_readable_by_everyone_on_the_robot(self, tmp_path, monkeypatch):
        monkeypatch.setenv("MIRRORBUDDY_CONFIG_DIR", str(tmp_path / "config"))
        package_dir = tmp_path / "site-packages" / "reachy_mini_mirrorbuddy"
        package_dir.mkdir(parents=True)
        (package_dir / ".env").write_text("AZURE_OPENAI_REALTIME_API_KEY=secret\n", encoding="utf-8")

        env_file = paths.env_file(str(package_dir))

        assert env_file.stat().st_mode & 0o077 == 0

    def test_it_works_on_a_robot_that_never_had_a_config(self, tmp_path, monkeypatch):
        monkeypatch.setenv("MIRRORBUDDY_CONFIG_DIR", str(tmp_path / "config"))

        env_file = paths.env_file(None)

        assert env_file.parent.is_dir()
        assert env_file.name == ".env"
