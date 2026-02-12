#!/usr/bin/env bash
set -euo pipefail

# drift-check.sh - Detect codebase drift from coding standards
# Checks: file length, @ts-ignore, any casts, TODO/FIXME, circular imports
#
# Usage:
#   ./scripts/drift-check.sh              # Full check (JSON summary)
#   ./scripts/drift-check.sh --detail     # Full check with file lists
#   ./scripts/drift-check.sh --fix-hint   # Suggest fixes for each issue

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

MODE="${1:---summary}"
MAX_LINES=250
SRC_DIR="src"
ERRORS=0
WARNINGS=0

# --- 1. Files exceeding max line count ---
long_files=()
while IFS= read -r file; do
	lines=$(awk 'END{print NR}' "$file")
	if [[ "$lines" -gt "$MAX_LINES" ]]; then
		long_files+=("${file}:${lines}")
		ERRORS=$((ERRORS + 1))
	fi
done < <(find "$SRC_DIR" -name '*.ts' -o -name '*.tsx' | grep -v node_modules | grep -v '.test.' | grep -v '__tests__')

# --- 2. @ts-ignore / @ts-expect-error ---
ts_ignore_count=0
ts_ignore_files=()
while IFS=: read -r file line content; do
	ts_ignore_count=$((ts_ignore_count + 1))
	ts_ignore_files+=("${file}:${line}")
done < <(grep -rn '@ts-ignore\|@ts-expect-error' "$SRC_DIR" --include='*.ts' --include='*.tsx' || true)
if [[ "$ts_ignore_count" -gt 0 ]]; then
	ERRORS=$((ERRORS + ts_ignore_count))
fi

# --- 3. Unsafe `as any` casts ---
any_cast_count=0
any_cast_files=()
while IFS=: read -r file line content; do
	any_cast_count=$((any_cast_count + 1))
	any_cast_files+=("${file}:${line}")
done < <(grep -rn 'as any' "$SRC_DIR" --include='*.ts' --include='*.tsx' | grep -v '.test.' | grep -v '__tests__' | grep -v '// safe:' || true)
if [[ "$any_cast_count" -gt 0 ]]; then
	WARNINGS=$((WARNINGS + any_cast_count))
fi

# --- 4. TODO / FIXME / HACK ---
debt_count=0
debt_files=()
while IFS=: read -r file line content; do
	debt_count=$((debt_count + 1))
	debt_files+=("${file}:${line}")
done < <(grep -rn 'TODO\|FIXME\|HACK' "$SRC_DIR" --include='*.ts' --include='*.tsx' | grep -v node_modules | grep -v '.test.' || true)
if [[ "$debt_count" -gt 0 ]]; then
	WARNINGS=$((WARNINGS + debt_count))
fi

# --- 5. Circular import detection (lightweight, bash 3.2 compatible) ---
circular_count=0
circular_pairs=()
EDGES_FILE=$(mktemp)
trap 'rm -f "$EDGES_FILE"' EXIT

# Build edge list: domain->target (one per line, sorted unique)
for domain_dir in "$SRC_DIR"/lib/*/; do
	domain=$(basename "$domain_dir")
	# || true prevents pipefail exit on directories with no matches
	matches=$(grep -rh "from '@/lib/" "$domain_dir" --include='*.ts' --include='*.tsx' 2>/dev/null || true)
	if [[ -n "$matches" ]]; then
		echo "$matches" | sed "s/.*from '@\/lib\///" | sed "s/[\/'\"].*//" | sort -u |
			grep -v "^${domain}$" |
			while IFS= read -r target; do
				echo "${domain}->${target}"
			done || true
	fi
done | sort -u >"$EDGES_FILE"

# Find bidirectional edges (A->B and B->A both exist)
SEEN_FILE=$(mktemp)
trap 'rm -f "$EDGES_FILE" "$SEEN_FILE"' EXIT
while IFS= read -r edge; do
	a="${edge%%->*}"
	b="${edge##*->}"
	reverse="${b}->${a}"
	if grep -qx "$reverse" "$EDGES_FILE"; then
		# Normalize pair order to avoid duplicates
		if [[ "$a" < "$b" ]]; then
			pair="${a} <-> ${b}"
		else
			pair="${b} <-> ${a}"
		fi
		if ! grep -qx "$pair" "$SEEN_FILE" 2>/dev/null; then
			echo "$pair" >>"$SEEN_FILE"
			circular_pairs+=("$pair")
			circular_count=$((circular_count + 1))
		fi
	fi
done <"$EDGES_FILE"

if [[ "$circular_count" -gt 0 ]]; then
	WARNINGS=$((WARNINGS + circular_count))
fi

# --- Output ---
if [[ "$MODE" == "--summary" ]]; then
	echo "{"
	echo "  \"long_files\": ${#long_files[@]},"
	echo "  \"ts_ignore\": ${ts_ignore_count},"
	echo "  \"any_casts\": ${any_cast_count},"
	echo "  \"todo_fixme\": ${debt_count},"
	echo "  \"circular_deps\": ${circular_count},"
	echo "  \"errors\": ${ERRORS},"
	echo "  \"warnings\": ${WARNINGS},"
	if [[ "$ERRORS" -gt 0 ]]; then
		echo "  \"status\": \"FAIL\""
	elif [[ "$WARNINGS" -gt 0 ]]; then
		echo "  \"status\": \"WARN\""
	else
		echo "  \"status\": \"CLEAN\""
	fi
	echo "}"
elif [[ "$MODE" == "--detail" || "$MODE" == "--fix-hint" ]]; then
	echo "=== Drift Report ==="
	echo ""

	if [[ ${#long_files[@]} -gt 0 ]]; then
		echo "[ERROR] Files exceeding ${MAX_LINES} lines (${#long_files[@]}):"
		for f in "${long_files[@]}"; do echo "  - $f"; done
		if [[ "$MODE" == "--fix-hint" ]]; then
			echo "  FIX: Split into smaller modules. Extract helpers, types, or constants."
		fi
		echo ""
	fi

	if [[ "$ts_ignore_count" -gt 0 ]]; then
		echo "[ERROR] @ts-ignore / @ts-expect-error ($ts_ignore_count):"
		for f in "${ts_ignore_files[@]}"; do echo "  - $f"; done
		if [[ "$MODE" == "--fix-hint" ]]; then
			echo "  FIX: Fix the type error. Use proper typing or type guards."
		fi
		echo ""
	fi

	if [[ "$any_cast_count" -gt 0 ]]; then
		echo "[WARN] 'as any' casts ($any_cast_count):"
		for f in "${any_cast_files[@]}"; do echo "  - $f"; done
		if [[ "$MODE" == "--fix-hint" ]]; then
			echo "  FIX: Replace with proper types. Add '// safe: <reason>' if intentional."
		fi
		echo ""
	fi

	if [[ "$debt_count" -gt 0 ]]; then
		echo "[WARN] TODO/FIXME/HACK markers ($debt_count):"
		for f in "${debt_files[@]}"; do echo "  - $f"; done
		if [[ "$MODE" == "--fix-hint" ]]; then
			echo "  FIX: Resolve or create a tracked issue. Remove marker after fixing."
		fi
		echo ""
	fi

	if [[ "$circular_count" -gt 0 ]]; then
		echo "[WARN] Circular domain dependencies ($circular_count):"
		for p in "${circular_pairs[@]}"; do echo "  - $p"; done
		if [[ "$MODE" == "--fix-hint" ]]; then
			echo "  FIX: Extract shared types/interfaces to lib/types/ or a shared module."
		fi
		echo ""
	fi

	echo "---"
	echo "Errors: $ERRORS | Warnings: $WARNINGS"
	if [[ "$ERRORS" -gt 0 ]]; then
		echo "STATUS: FAIL"
		exit 1
	elif [[ "$WARNINGS" -gt 0 ]]; then
		echo "STATUS: WARN"
		exit 0
	else
		echo "STATUS: CLEAN"
		exit 0
	fi
fi
