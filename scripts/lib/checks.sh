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
	npm audit --audit-level=high >"$_OUTPUT" 2>&1 && _EXIT=0 || _EXIT=$?
}

exec_perf() {
	_OUTPUT=$(mktemp)
	if [ -f "./scripts/perf-check.sh" ]; then
		./scripts/perf-check.sh >"$_OUTPUT" 2>&1 && _EXIT=0 || _EXIT=$?
	else
		echo "perf-check.sh not found, skipping" >"$_OUTPUT"
		_EXIT=0
	fi
}

exec_filesize() {
	_OUTPUT=$(mktemp)
	if [ -f "./scripts/check-file-size.sh" ]; then
		./scripts/check-file-size.sh >"$_OUTPUT" 2>&1 && _EXIT=0 || _EXIT=$?
	else
		echo "check-file-size.sh not found, skipping" >"$_OUTPUT"
		_EXIT=0
	fi
}

# --- Code quality checks ---

exec_hygiene() {
	_OUTPUT=$(mktemp)
	_EXIT=0
	local todo_count=0 console_count=0
	if command -v rg &>/dev/null; then
		todo_count=$(rg -c "(TODO|FIXME|HACK|XXX):" src/ -g '*.ts' -g '*.tsx' 2>/dev/null |
			rg -v "__tests__|\.test\.|\.spec\." | awk -F: '{sum+=$2} END {print sum+0}')
		console_count=$(rg "console\.(log|warn|error|debug|info)\(" src/ -g '*.ts' -g '*.tsx' 2>/dev/null |
			rg -v "__tests__|\.test\.|\.spec\.|logger|: \*|demo-html-builder" |
			/usr/bin/wc -l | tr -d ' ')
	else
		todo_count=$(/usr/bin/grep -rE "(TODO|FIXME|HACK|XXX):" src/ --include="*.ts" --include="*.tsx" 2>/dev/null |
			/usr/bin/grep -v "__tests__\|\.test\." | /usr/bin/wc -l | tr -d ' ')
		console_count=$(/usr/bin/grep -rE "console\.(log|warn|error|debug|info)\(" src/ --include="*.ts" --include="*.tsx" 2>/dev/null |
			/usr/bin/grep -v "logger\|__tests__\|\.test\.\|: \*" | /usr/bin/wc -l | tr -d ' ')
	fi
	{
		echo "TODO_COUNT=$todo_count"
		echo "CONSOLE_COUNT=$console_count"
		[[ "$todo_count" -gt 0 ]] && rg "(TODO|FIXME|HACK|XXX):" src/ -g '*.ts' -g '*.tsx' 2>/dev/null | head -5
	} >"$_OUTPUT"
	[[ "$todo_count" -gt 0 || "$console_count" -gt 0 ]] && _EXIT=1
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
	_EXIT=0
	_TS_IGNORE=$(rg -n "@ts-ignore|@ts-nocheck" src -g "*.ts" -g "*.tsx" 2>/dev/null || true)
	_PROD_ANY=$(rg -g '*.ts' -g '*.tsx' ": any\b|as any\b" src \
		-g '!**/__tests__/**' -g '!*.test.*' --no-heading 2>/dev/null |
		rg -v "//.*any\b|has any\b|avoid.*any\b|eslint-disable" || true)
	{
		[[ -n "$_TS_IGNORE" ]] && echo "TS_IGNORE:" && echo "$_TS_IGNORE"
		[[ -n "$_PROD_ANY" ]] && echo "ANY_TYPE:" && echo "$_PROD_ANY"
	} >"$_OUTPUT"
	{ [[ -n "$_TS_IGNORE" ]] || [[ -n "$_PROD_ANY" ]]; } && _EXIT=1
	return 0
}
