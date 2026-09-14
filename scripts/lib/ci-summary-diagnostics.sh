#!/usr/bin/env bash

strip_ansi() { perl -pe 's/\e\[[0-9;]*m//g' "$1"; }
result() { RESULTS+="$1"$'\n'; }

result_details() {
	local line
	while IFS= read -r line; do
		[[ -z "$line" ]] || result "  $line"
	done <<<"$1"
}

diagnostic_excerpt() {
	local file="$1" label="$2" pattern details
	case "$label" in
	Typecheck) pattern='error TS|Type error|\.tsx?[:(][0-9]' ;;
	Lint) pattern='^[^[:space:]].*\.(tsx?|jsx?)$|[[:space:]]error[[:space:]]|Parsing error' ;;
	Unit) pattern='Unhandled|^[[:space:]]*(FAIL|×)|AssertionError|Expected.*Received' ;;
	*) pattern='error|fail|missing|unreachable|broken|violation|timeout|\.spec\.tsx?:' ;;
	esac
	details=$(strip_ansi "$file" | grep -iE -B 2 -A 4 "$pattern" | head -30 || true)
	if [[ -z "$details" ]]; then
		details=$(strip_ansi "$file" | tail -20)
	fi
	result_details "${details:-Command exited without diagnostic output.}"
}

successful_check() {
	local label="$1" file="$2" count=0 details="" summary=""
	case "$label" in
	Lint)
		count=$(strip_ansi "$file" | grep -c ' warning ' || true)
		details=$(strip_ansi "$file" | grep ' warning ' | head -5 || true)
		;;
	Build)
		count=$(strip_ansi "$file" | grep -ciE '^warn' || true)
		details=$(strip_ansi "$file" | grep -iE '^warn' | head -5 || true)
		;;
	Unit) summary=$(strip_ansi "$file" | grep -E 'Test(s| Files).*passed' | tail -1 || true) ;;
	E2E | A11y) summary=$(strip_ansi "$file" | grep -E '[0-9]+ passed' | tail -1 || true) ;;
	Migrations) summary=$(strip_ansi "$file" | grep -oE 'all [0-9]+ models' | tail -1 || true) ;;
	Reachability) summary=$(strip_ansi "$file" | grep -oE 'unreachable \(scoped\): [0-9]+' | tail -1 || true) ;;
	esac
	if [[ "$count" -gt 0 ]]; then
		WARNINGS=$((WARNINGS + count))
		result "[WARN] $label ($count warnings)"
		result_details "$details"
	else
		result "[PASS] $label${summary:+ ($summary)}"
	fi
}

run_logged() {
	local label="$1" tmp status
	shift
	tmp=$(mktemp "${TMPDIR:-/tmp}/mirrorbuddy-ci.XXXXXX")
	if "$@" >"$tmp" 2>&1; then
		successful_check "$label" "$tmp"
		rm -f "$tmp"
	else
		status=$?
		ERRORS=$((ERRORS + 1))
		result "[FAIL] $label (exit $status)"
		result "  Log: $tmp"
		diagnostic_excerpt "$tmp" "$label"
	fi
	return 0
}

unsafe_query_allowed() {
	local file="$1" relative="${1#"$PROJECT_DIR/"}"
	local allowlist="$SCRIPT_DIR/.queryraw-allowlist" exclusion=""
	if [[ -f "$allowlist" ]]; then
		while IFS= read -r exclusion || [[ -n "$exclusion" ]]; do
			[[ -n "$exclusion" && "$exclusion" != \#* ]] || continue
			# Legacy entries use app-relative src/ paths; explicit paths are exact.
			if [[ "$exclusion" == src/* ]]; then
				exclusion="apps/web/$exclusion"
			fi
			if [[ "$relative" == "$exclusion" ]]; then
				return 0
			fi
			if [[ "$exclusion" != */* && "${file##*/}" == $exclusion ]]; then
				return 0
			fi
		done <"$allowlist"
	fi
	return 1
}

scan_unsafe_queries() {
	local source="$PROJECT_DIR/apps/web/src" matches status file found=0
	if [[ ! -d "$source" ]]; then
		printf 'Missing source directory: %s\n' "$source" >&2
		return 1
	fi
	if matches=$(grep -rl --include='*.ts' --include='*.tsx' '\$queryRawUnsafe' "$source"); then
		while IFS= read -r file; do
			if unsafe_query_allowed "$file"; then
				continue
			fi
			if ! grep -nH '\$queryRawUnsafe' "$file"; then
				printf 'Source changed or could not be read during scan: %s\n' "$file" >&2
				return 2
			fi
			found=1
		done <<<"$matches"
		return "$found"
	else
		status=$?
		if [[ "$status" -eq 1 ]]; then
			return 0
		fi
		printf 'Source scan failed with exit %s.\n' "$status" >&2
		return "$status"
	fi
}
