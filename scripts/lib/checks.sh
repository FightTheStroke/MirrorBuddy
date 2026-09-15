#!/usr/bin/env bash
# =============================================================================
# scripts/lib/checks.sh - Shared check functions for CI/release scripts
# Sourceable library. Each exec_* function sets:
#   _EXIT    - exit code (0=pass)
#   _OUTPUT  - path to temp file with full output (caller must rm -f)
# All functions are safe with set -euo pipefail.
# =============================================================================

[[ -n "${_CHECKS_LOADED:-}" ]] && return 0
_CHECKS_LOADED=1

strip_ansi() { perl -pe 's/\e\[[0-9;]*m//g' "$1"; }

# --- Core tool checks ---

exec_lint() {
	_OUTPUT=$(mktemp)
	npm run lint >"$_OUTPUT" 2>&1 && _EXIT=0 || _EXIT=$?
}

exec_typecheck() {
	_OUTPUT=$(mktemp)
	npm run typecheck >"$_OUTPUT" 2>&1 && _EXIT=0 || _EXIT=$?
}

exec_build() {
	_OUTPUT=$(mktemp)
	npm run build >"$_OUTPUT" 2>&1 && _EXIT=0 || _EXIT=$?
}

exec_unit() {
	_OUTPUT=$(mktemp)
	npm run test:unit >"$_OUTPUT" 2>&1 && _EXIT=0 || _EXIT=$?
}

exec_i18n() {
	_OUTPUT=$(mktemp)
	npm run i18n:check >"$_OUTPUT" 2>&1 && _EXIT=0 || _EXIT=$?
}

exec_audit() {
	_OUTPUT=$(mktemp)
	pnpm audit --audit-level=high >"$_OUTPUT" 2>&1 && _EXIT=0 || _EXIT=$?
}

exec_perf() {
	_OUTPUT=$(mktemp)
	if [ -f "./scripts/perf-check.sh" ]; then
		./scripts/perf-check.sh >"$_OUTPUT" 2>&1 && _EXIT=0 || _EXIT=$?
	else
		echo "Required perf-check.sh not found" >"$_OUTPUT"
		_EXIT=1
	fi
}

exec_filesize() {
	_OUTPUT=$(mktemp)
	if [ -f "./scripts/check-file-size.sh" ]; then
		./scripts/check-file-size.sh >"$_OUTPUT" 2>&1 && _EXIT=0 || _EXIT=$?
	else
		echo "Required check-file-size.sh not found" >"$_OUTPUT"
		_EXIT=1
	fi
}

# --- Code quality checks ---

exec_hygiene() {
	_OUTPUT=$(mktemp)
	pnpm exec tsx scripts/check-source-quality.ts hygiene >"$_OUTPUT" 2>&1 && _EXIT=0 || _EXIT=$?
	return 0
}

exec_docs_exist() {
	_OUTPUT=$(mktemp)
	_EXIT=0
	local missing=""
	for doc in README.md CHANGELOG.md CONTRIBUTING.md CLAUDE.md LICENSE .env.example; do
		[[ ! -f "$doc" ]] && missing="$missing $doc"
	done
	if [[ -n "$missing" ]]; then
		echo "Missing:$missing" >"$_OUTPUT"
		_EXIT=1
	else
		echo "All docs present" >"$_OUTPUT"
	fi
	return 0
}

check_ts_rigor() {
	_OUTPUT=$(mktemp)
	pnpm exec tsx scripts/check-source-quality.ts rigor >"$_OUTPUT" 2>&1 && _EXIT=0 || _EXIT=$?
	_TS_IGNORE=$(grep '^TS_IGNORE:' "$_OUTPUT" || true)
	_PROD_ANY=$(grep '^ANY_TYPE:' "$_OUTPUT" || true)
	return 0
}
