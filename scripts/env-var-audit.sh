#!/usr/bin/env bash
set -euo pipefail

# env-var-audit.sh: Ensure all process.env.X references are documented
# Checks each env var exists in .env.example, validate-pre-deploy.ts, and GitHub workflows

echo "Auditing environment variables..."

# Extract all process.env.X references from src/
ENV_VARS=$(grep -rhoE 'process\.env\.[A-Z_][A-Z0-9_]*' src/ 2>/dev/null | sort -u | sed 's/process\.env\.//' || true)

if [ -z "$ENV_VARS" ]; then
	echo "No process.env references found in src/"
	exit 0
fi

MISSING_VARS=()

for VAR in $ENV_VARS; do
	IN_EXAMPLE=$(grep -c "^${VAR}=" .env.example 2>/dev/null || echo 0)
	IN_VALIDATE=$(grep -c "process\.env\.${VAR}" scripts/validate-pre-deploy.ts 2>/dev/null || echo 0)
	IN_WORKFLOWS=$(grep -rh "${VAR}" .github/workflows/*.yml 2>/dev/null | grep -v '^#' || true)

	if [ "$IN_EXAMPLE" -eq 0 ]; then
		MISSING_VARS+=("${VAR} (missing from .env.example)")
	elif [ "$IN_VALIDATE" -eq 0 ]; then
		MISSING_VARS+=("${VAR} (missing from validate-pre-deploy.ts)")
	elif [ -z "$IN_WORKFLOWS" ]; then
		MISSING_VARS+=("${VAR} (missing from .github/workflows/*.yml)")
	fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
	echo ""
	echo "ERROR: Environment variables not fully documented:"
	echo ""
	for MISS in "${MISSING_VARS[@]}"; do
		echo "  - $MISS"
	done
	echo ""
	echo "Required: Each env var must exist in all 3 places:"
	echo "  1. .env.example"
	echo "  2. scripts/validate-pre-deploy.ts"
	echo "  3. .github/workflows/*.yml"
	echo ""
	exit 1
fi

echo "All $(echo "$ENV_VARS" | wc -l | xargs) environment variables properly documented"
exit 0
