#!/usr/bin/env bash
set -euo pipefail

# Undocumented variables warn; infrastructure failures must not look like a clean audit.
REQUIRED_ROOTS=(apps/web/src apps/web/e2e apps/web/prisma scripts)
REQUIRED_FILES=(.env.example scripts/lib/production-env-policy.ts scripts/validate-pre-deploy.ts)
DECLARATION_READER="scripts/lib/collect-declared-env.mjs"
REFERENCE='process\.env\.[A-Z_][A-Z0-9_]*'
EXCLUDES=(--exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build
	--exclude-dir=.next --exclude-dir=coverage --exclude-dir=.turbo --exclude-dir=test-results)

fail() {
	echo "FAIL: $1" >&2
	exit 2
}

echo "Auditing environment variables..."

for ROOT in "${REQUIRED_ROOTS[@]}" packages; do
	if [ ! -d "$ROOT" ]; then
		fail "required source root is missing: $ROOT"
	fi
done
ROOTS=("${REQUIRED_ROOTS[@]}")
PACKAGE_COUNT=0
for ROOT in packages/*/src; do
	if [ -d "$ROOT" ]; then
		ROOTS+=("$ROOT")
		PACKAGE_COUNT=$((PACKAGE_COUNT + 1))
	fi
done
if [ "$PACKAGE_COUNT" -eq 0 ]; then
	fail "no package source roots found under packages"
fi

for FILE in "${REQUIRED_FILES[@]}" "$DECLARATION_READER"; do
	if [ ! -f "$FILE" ] || [ ! -r "$FILE" ]; then
		fail "required audit file is missing or unreadable: $FILE"
	fi
done
for TOOL in grep sed sort node; do
	if ! command -v "$TOOL" >/dev/null 2>&1; then
		fail "required audit utility is missing: $TOOL"
	fi
done

if REFERENCES="$(grep -rIhoE "${EXCLUDES[@]}" -e "$REFERENCE" "${ROOTS[@]}" 2>&1)"; then
	SEARCH_STATUS=0
else
	SEARCH_STATUS=$?
fi
if [ "$SEARCH_STATUS" -gt 1 ]; then
	echo "$REFERENCES" >&2
	fail "the search utility could not scan the source tree"
fi
ENV_VARS=""
if [ "$SEARCH_STATUS" -eq 0 ]; then
	if ! ENV_VARS="$(printf '%s\n' "$REFERENCES" | sed 's/^process\.env\.//' | sort -u)"; then
		fail "could not extract environment variable names"
	fi
fi

if DECLARED="$(node "$DECLARATION_READER" "${REQUIRED_FILES[1]}" "${REQUIRED_FILES[2]}" 2>&1)"; then
	:
else
	echo "$DECLARED" >&2
	fail "could not read the declared environment variables"
fi

if [ -z "$ENV_VARS" ]; then
	echo "No environment variable references found in the scanned sources"
	exit 0
fi

declared() {
	case "
$DECLARED
" in
	*"
$1
"*) return 0 ;;
	esac
	return 1
}

MISSING_VARS=()
COUNT=0

for VAR in $ENV_VARS; do
	COUNT=$((COUNT + 1))
	if grep -q "^${VAR}=" .env.example; then
		DOCUMENTED_STATUS=0
	else
		DOCUMENTED_STATUS=$?
	fi
	if [ "$DOCUMENTED_STATUS" -gt 1 ]; then
		fail "the search utility could not read .env.example"
	fi
	if [ "$DOCUMENTED_STATUS" -ne 0 ]; then
		MISSING_VARS+=("${VAR} (missing from .env.example)")
	elif ! declared "$VAR"; then
		MISSING_VARS+=("${VAR} (missing from validate-pre-deploy.ts)")
	fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
	echo ""
	echo "WARN: Environment variables not fully documented:"
	echo ""
	for MISS in "${MISSING_VARS[@]}"; do
		echo "  - $MISS"
	done
	echo ""
	echo "Required: Each env var must exist in:"
	echo "  1. .env.example"
	echo "  2. scripts/validate-pre-deploy.ts or scripts/lib/production-env-policy.ts"
	echo ""
	# Warn only, don't block (some vars are framework-provided)
	exit 0
fi

echo "All ${COUNT} environment variables properly documented"
exit 0
