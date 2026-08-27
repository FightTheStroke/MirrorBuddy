#!/bin/bash
# ============================================================================
# Shared configuration and Cost Management transport for the azure-costs
# scripts. Sourced, never executed directly.
# ============================================================================
# Default subscription (can be overridden with --subscription)
SUBSCRIPTION_ID="${AZURE_SUBSCRIPTION_ID:-8015083b-adad-42ff-922d-feaed61c5d62}"
# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

CM_URL="https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.CostManagement/query?api-version=2023-11-01"

# Check az login
check_auth() {
	if ! az account show &>/dev/null; then
		echo -e "${RED}Error: Not logged in to Azure. Run 'az login' first.${NC}"
		exit 1
	fi
}

# Call the Cost Management query API.
# Retries on HTTP 429 with exponential backoff and fails loudly on any other
# error: silently swallowing errors used to render throttled queries as $0.00.
cm_query() {
	local body="$1"
	local attempt=1
	local max_attempts=6
	local delay=30
	local out

	while [ "$attempt" -le "$max_attempts" ]; do
		if out=$(az rest --method post --url "$CM_URL" --body "$body" -o json 2>&1); then
			printf '%s' "$out"
			return 0
		fi

		if printf '%s' "$out" | grep -qiE '429|too many requests'; then
			echo -e "${YELLOW}Rate limited by Cost Management API, retry ${attempt}/${max_attempts} in ${delay}s...${NC}" >&2
			sleep "$delay"
			delay=$((delay * 2))
			[ "$delay" -gt 300 ] && delay=300
			attempt=$((attempt + 1))
			continue
		fi

		echo -e "${RED}Cost Management API error:${NC} ${out}" >&2
		return 1
	done

	echo -e "${RED}Cost Management API still throttled after ${max_attempts} attempts.${NC}" >&2
	return 1
}
