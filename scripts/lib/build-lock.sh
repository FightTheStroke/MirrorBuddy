#!/usr/bin/env bash
# =============================================================================
# BUILD LOCK UTILITY
# Portable POSIX lock using mkdir (atomic on all filesystems).
# Lock is per-project-directory so separate worktrees don't conflict.
#
# Usage (source in your script):
#   source "$(dirname "${BASH_SOURCE[0]}")/lib/build-lock.sh"
#   acquire_build_lock
#   # ... do build ...
#   release_build_lock   # or let EXIT trap handle it
# =============================================================================

_LOCK_DIR=""
_LOCK_HELD=0
_PREV_EXIT_TRAP=""

_dir_hash() {
	echo -n "$PWD" | shasum | cut -c1-12
}

acquire_build_lock() {
	local hash
	hash=$(_dir_hash)
	_LOCK_DIR="/tmp/mirrorbuddy-build-lock-${hash}"
	local pid_file="${_LOCK_DIR}/pid"
	local max_wait=${BUILD_LOCK_TIMEOUT:-120}
	local waited=0

	while ! mkdir "$_LOCK_DIR" 2>/dev/null; do
		# Stale lock detection: if PID file exists and process is dead, clean up
		if [[ -f "$pid_file" ]]; then
			local held_pid
			held_pid=$(cat "$pid_file" 2>/dev/null || echo "")
			if [[ -n "$held_pid" ]] && ! kill -0 "$held_pid" 2>/dev/null; then
				echo "[build-lock] Stale lock (PID $held_pid dead). Cleaning up."
				rm -rf "$_LOCK_DIR"
				continue
			fi
		fi

		if [[ $waited -ge $max_wait ]]; then
			echo "[build-lock] ERROR: Could not acquire lock after ${max_wait}s" >&2
			return 1
		fi

		echo "[build-lock] Build lock held (PID $(cat "$pid_file" 2>/dev/null || echo '?')). Waiting..."
		sleep 5
		waited=$((waited + 5))
	done

	echo $$ >"${_LOCK_DIR}/pid"
	_LOCK_HELD=1
	# Chain with existing EXIT trap (don't overwrite caller's cleanup)
	_PREV_EXIT_TRAP=$(trap -p EXIT | sed "s/trap -- '\\(.*\\)' EXIT/\\1/" || true)
	trap '_auto_release_build_lock' EXIT
}

release_build_lock() {
	if [[ $_LOCK_HELD -eq 1 && -n "$_LOCK_DIR" ]]; then
		rm -rf "$_LOCK_DIR"
		_LOCK_HELD=0
	fi
}

_auto_release_build_lock() {
	release_build_lock
	# Run the previous EXIT trap if one existed
	if [[ -n "$_PREV_EXIT_TRAP" ]]; then
		eval "$_PREV_EXIT_TRAP"
	fi
}
