#!/usr/bin/env bash
set -euo pipefail

# env-var-audit.sh: Ensure all process.env.X references are documented
# Checks each env var exists in .env.example and validate-pre-deploy.ts
# Workflow check removed: many runtime-only vars are not in workflows

echo "Auditing environment variables..."

# Extract all process.env.X references from src/
ENV_VARS=$(grep -rhoE 'process\.env\.[A-Z_][A-Z0-9_]*' src/ 2>/dev/null | sort -u | sed 's/process\.env\.//' || true)

if [ -z "$ENV_VARS" ]; then
	echo "No process.env references found in src/"
	exit 0
fi

MISSING_VARS=()

for VAR in $ENV_VARS; do
	IN_EXAMPLE="$(grep -c "^${VAR}=" .env.example 2>/dev/null || echo 0)"
	IN_VALIDATE="$(grep -c "process\.env\.${VAR}" scripts/validate-pre-deploy.ts 2>/dev/null || echo 0)"

	# Trim whitespace (grep -c on macOS can include trailing chars)
	IN_EXAMPLE="${IN_EXAMPLE//[[:space:]]/}"
	IN_VALIDATE="${IN_VALIDATE//[[:space:]]/}"

	if [ "$IN_EXAMPLE" = "0" ]; then
		MISSING_VARS+=("${VAR} (missing from .env.example)")
	elif [ "$IN_VALIDATE" = "0" ]; then
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
	echo "  2. scripts/validate-pre-deploy.ts"
	echo ""
	# Warn only, don't block (some vars are framework-provided)
	exit 0
fi

echo "All $(echo "$ENV_VARS" | grep -c . || echo 0) environment variables properly documented"
exit 0
