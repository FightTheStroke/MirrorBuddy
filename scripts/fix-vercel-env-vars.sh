#!/bin/bash
set -euo pipefail

# Sync .env variables to Vercel production environment
# Reads ALL production-relevant vars from .env, skips dev/test/iOS-only ones
# Usage: ./fix-vercel-env-vars.sh [--dry-run] [--var VARIABLE_NAME]

DRY_RUN=false
SPECIFIC_VAR=""
ENV_FILE=".env"

while [[ $# -gt 0 ]]; do
	case $1 in
	--dry-run)
		DRY_RUN=true
		shift
		;;
	--var)
		SPECIFIC_VAR="$2"
		shift 2
		;;
	--env-file)
		ENV_FILE="$2"
		shift 2
		;;
	*)
		echo "Unknown option: $1"
		echo "Usage: $0 [--dry-run] [--var VARIABLE_NAME] [--env-file FILE]"
		exit 1
		;;
	esac
done

# Variables that are dev/test/iOS only — NEVER sync to Vercel
SKIP_VARS=(
	"DEV_DATABASE_URL"
	"TEST_DATABASE_URL"
	"TEST_DIRECT_URL"
	"PROD_TEST_USER_ID"
	"PROD_TEST_USER_EMAIL"
	"PROD_TEST_USER_USERNAME"
	"PROD_TEST_USER_PASSWORD"
	"PROD_TEST_ADMIN_ID"
	"PROD_TEST_ADMIN_EMAIL"
	"PROD_TEST_ADMIN_USERNAME"
	"PROD_TEST_ADMIN_PASSWORD"
	"OLLAMA_URL"
	"OLLAMA_MODEL"
	"NODE_TLS_REJECT_UNAUTHORIZED"
	"VERCEL_TOKEN"
	"APPLE_ID"
	"TEAM_ID"
	"ITC_TEAM_ID"
	"FASTLANE_USER"
	"MATCH_GIT_URL"
	"MATCH_PASSWORD"
	"POSTGRES_DATABASE"
	"POSTGRES_HOST"
	"POSTGRES_PASSWORD"
	"POSTGRES_USER"
	"SUPABASE_JWT_SECRET"
	"SUPABASE_PUBLISHABLE_KEY"
	"SUPABASE_SECRET_KEY"
	"NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
)

# Variables that need a different value in production
# Format: "VAR_NAME=production_value"
PRODUCTION_OVERRIDES=(
	"NEXTAUTH_URL=https://mirrorbuddy.vercel.app"
	"NEXT_PUBLIC_APP_URL=https://mirrorbuddy.vercel.app"
	"NEXT_PUBLIC_SITE_URL=https://mirrorbuddy.vercel.app"
)

is_skipped() {
	local var_name="$1"
	for skip in "${SKIP_VARS[@]}"; do
		[[ "$var_name" == "$skip" ]] && return 0
	done
	return 1
}

get_override() {
	local var_name="$1"
	for override in "${PRODUCTION_OVERRIDES[@]}"; do
		local key="${override%%=*}"
		if [[ "$var_name" == "$key" ]]; then
			echo "${override#*=}"
			return 0
		fi
	done
	return 1
}

sync_variable() {
	local var_name="$1"
	local value="$2"

	if [ -z "$value" ]; then
		echo "  SKIP $var_name (empty value)"
		return
	fi

	if [ "$DRY_RUN" = true ]; then
		local display_value="$value"
		if [ ${#value} -gt 40 ]; then
			display_value="${value:0:20}...${value: -10} (${#value} chars)"
		fi
		echo "  SYNC $var_name = $display_value"
		return
	fi

	# Remove existing (ignore errors if not present)
	echo "y" | vercel env rm "$var_name" production >/dev/null 2>&1 || true

	# Add with correct value
	echo -n "$value" >/tmp/vercel_var_tmp.txt
	vercel env add "$var_name" production </tmp/vercel_var_tmp.txt >/dev/null

	echo "  OK   $var_name"
}

# --- Main ---

if [ ! -f "$ENV_FILE" ]; then
	echo "ERROR: $ENV_FILE not found"
	exit 1
fi

echo "==================================="
echo "Vercel Env Sync: $ENV_FILE -> production"
echo "==================================="
echo ""

if [ "$DRY_RUN" = true ]; then
	echo "DRY RUN MODE - no changes will be made"
	echo ""
fi

# Handle specific variable
if [ -n "$SPECIFIC_VAR" ]; then
	value=$(grep "^${SPECIFIC_VAR}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2-)
	override_value=$(get_override "$SPECIFIC_VAR") && value="$override_value"
	sync_variable "$SPECIFIC_VAR" "$value"
	exit 0
fi

# Parse .env and sync all production variables
SYNCED=0
SKIPPED=0

while IFS= read -r line; do
	# Skip empty lines, comments
	[[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue

	# Extract key=value
	var_name="${line%%=*}"
	var_value="${line#*=}"

	# Strip surrounding quotes
	var_value="${var_value#\"}"
	var_value="${var_value%\"}"

	# Skip dev-only vars
	if is_skipped "$var_name"; then
		SKIPPED=$((SKIPPED + 1))
		continue
	fi

	# Apply production override if exists
	override_value=$(get_override "$var_name") && var_value="$override_value"

	sync_variable "$var_name" "$var_value"
	SYNCED=$((SYNCED + 1))

done <"$ENV_FILE"

# Cleanup temp file
rm -f /tmp/vercel_var_tmp.txt

# Check for new vars not yet in pre-push REQUIRED_VARS
PREPUSH="scripts/pre-push-vercel.sh"
NEW_VARS=""
if [ -f "$PREPUSH" ]; then
	while IFS= read -r line; do
		[[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
		vn="${line%%=*}"
		if is_skipped "$vn"; then continue; fi
		if ! grep -q "\"$vn\"" "$PREPUSH" 2>/dev/null; then
			NEW_VARS="$NEW_VARS $vn"
		fi
	done <"$ENV_FILE"

	if [ -n "$NEW_VARS" ]; then
		echo ""
		echo "WARNING: New vars in $ENV_FILE not in pre-push REQUIRED_VARS:"
		for v in $NEW_VARS; do
			echo "  - $v"
		done
		echo "Add them to REQUIRED_VARS in $PREPUSH and run unit tests."
	fi
fi

echo ""
echo "==================================="
echo "Synced: $SYNCED | Skipped (dev-only): $SKIPPED"
echo "==================================="
if [ "$DRY_RUN" = false ]; then
	echo "Verify: vercel env pull --environment production"
fi
