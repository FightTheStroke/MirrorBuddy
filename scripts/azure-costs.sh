#!/bin/bash
# ============================================================================
# Azure Cost Monitoring Script
# Uses az CLI credentials (az login) - no secrets required
# ============================================================================

set -e

# Default subscription (can be overridden with --subscription)
SUBSCRIPTION_ID="${AZURE_SUBSCRIPTION_ID:-8015083b-adad-42ff-922d-feaed61c5d62}"
DAYS="${1:-30}"
OUTPUT_FORMAT="${2:-table}"
MONTHS=""
SERVICE_FILTER=""
BY_DIM=""

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

# Get current month costs
get_mtd_costs() {
	echo -e "${BLUE}=== Month-to-Date Costs ===${NC}"

	local result
	result=$(cm_query '{"type":"ActualCost","timeframe":"MonthToDate","dataset":{"granularity":"None","aggregation":{"totalCost":{"name":"Cost","function":"Sum"}}}}') || return 1

	local cost=$(echo "$result" | jq -r '.properties.rows[0][0] // 0')
	local currency=$(echo "$result" | jq -r '.properties.rows[0][1] // "USD"')

	printf "${GREEN}Current Month: \$%.2f %s${NC}\n" "$cost" "$currency"
}

# Get costs by service
get_costs_by_service() {
	local start_date=$(date -v-${DAYS}d +%Y-%m-%d 2>/dev/null || date -d "-${DAYS} days" +%Y-%m-%d)
	local end_date=$(date +%Y-%m-%d)

	echo -e "\n${BLUE}=== Costs by Service (Last ${DAYS} days) ===${NC}"

	local body=$(
		cat <<EOF
{
    "type": "ActualCost",
    "timeframe": "Custom",
    "timePeriod": {"from": "${start_date}", "to": "${end_date}"},
    "dataset": {
        "granularity": "None",
        "aggregation": {"totalCost": {"name": "Cost", "function": "Sum"}},
        "grouping": [{"type": "Dimension", "name": "ServiceName"}]
    }
}
EOF
	)

	local result
	result=$(cm_query "$body") || return 1

	echo "$result" | jq -r '
        .properties.rows
        | sort_by(-.[0])
        | .[]
        | "\(.[1]): $\(.[0] | . * 100 | floor / 100)"
    ' | while read line; do
		echo -e "  ${line}"
	done

	local total=$(echo "$result" | jq '[.properties.rows[][0]] | add // 0')
	printf "\n${GREEN}Total: \$%.2f${NC}\n" "$total"
}

# Get daily costs trend
get_daily_costs() {
	local start_date=$(date -v-${DAYS}d +%Y-%m-%d 2>/dev/null || date -d "-${DAYS} days" +%Y-%m-%d)
	local end_date=$(date +%Y-%m-%d)

	echo -e "\n${BLUE}=== Daily Cost Trend (Last ${DAYS} days) ===${NC}"

	local body=$(
		cat <<EOF
{
    "type": "ActualCost",
    "timeframe": "Custom",
    "timePeriod": {"from": "${start_date}", "to": "${end_date}"},
    "dataset": {
        "granularity": "Daily",
        "aggregation": {"totalCost": {"name": "Cost", "function": "Sum"}}
    }
}
EOF
	)

	local result
	result=$(cm_query "$body") || return 1

	# Show last 7 days
	echo "$result" | jq -r '
        .properties.rows
        | sort_by(.[1])
        | .[-7:]
        | .[]
        | (.[1] | tostring) as $d
        | "\($d[0:4])-\($d[4:6])-\($d[6:8]): $\(.[0] | . * 100 | floor / 100)"
    ' | while read line; do
		echo -e "  ${line}"
	done
}

# Get forecast
get_forecast() {
	echo -e "\n${BLUE}=== Monthly Forecast ===${NC}"

	local result
	result=$(cm_query '{"type":"ActualCost","timeframe":"MonthToDate","dataset":{"granularity":"None","aggregation":{"totalCost":{"name":"Cost","function":"Sum"}}}}') || return 1

	local current_cost=$(echo "$result" | jq -r '.properties.rows[0][0] // 0')
	local day_of_month=$(date +%-d)
	local days_in_month=$(date -v1d -v+1m -v-1d +%-d 2>/dev/null || date -d "$(date +%Y-%m-01) +1 month -1 day" +%-d)

	if [ -z "$current_cost" ] || [ "$current_cost" = "null" ]; then
		echo -e "${RED}No cost data returned, cannot forecast.${NC}"
		return 1
	fi

	local forecast=$(awk -v c="$current_cost" -v d="$day_of_month" -v n="$days_in_month" \
		'BEGIN {printf "%.2f", (c / d) * n}')

	printf "${YELLOW}Estimated end of month: \$%s${NC}\n" "$forecast"
}

# Monthly cost breakdown over the last N months (single API call, then one
# service-level call). Kept to 2 requests because the Cost Management query
# API throttles aggressively on this subscription.
# Emit the dataset filter fragment for SERVICE_FILTER, or nothing when unset.
service_filter_fragment() {
	[ -z "$SERVICE_FILTER" ] && return 0
	printf ',"filter":{"dimensions":{"name":"ServiceName","operator":"In","values":["%s"]}}' "$SERVICE_FILTER"
}

get_monthly_costs() {
	local months="$1"
	local filter=$(service_filter_fragment)
	local grouping=""
	[ -n "$BY_DIM" ] && grouping=$(printf ',"grouping":[{"type":"Dimension","name":"%s"}]' "$BY_DIM")
	local start_date=$(date -v-$((months - 1))m -v1d +%Y-%m-01 2>/dev/null ||
		date -d "$(date +%Y-%m-01) -$((months - 1)) months" +%Y-%m-01)
	local end_date=$(date +%Y-%m-%d)

	echo -e "${BLUE}=== Monthly Costs (${start_date} → ${end_date})${SERVICE_FILTER:+ | service: $SERVICE_FILTER} ===${NC}"

	local body=$(
		cat <<EOF
{
    "type": "ActualCost",
    "timeframe": "Custom",
    "timePeriod": {"from": "${start_date}", "to": "${end_date}"},
    "dataset": {
        "granularity": "Monthly",
        "aggregation": {"totalCost": {"name": "Cost", "function": "Sum"}}${grouping}${filter}
    }
}
EOF
	)

	local result
	result=$(cm_query "$body") || return 1

	# Grouped mode: emit "month<TAB>group<TAB>cost" rows for downstream pivoting.
	if [ -n "$BY_DIM" ]; then
		echo "$result" | jq -r --arg dim "$BY_DIM" '
            (.properties.columns | map(.name)) as $cols
            | ($cols | index("Cost")) as $ci
            | ((($cols | index("BillingMonth")) // ($cols | index("UsageDate")))) as $di
            | ($cols | index($dim)) as $gi
            | .properties.rows
            | map(select(.[$ci] > 0))
            | sort_by(-.[$ci])
            | .[]
            | (((.[$di] | tostring) | if test("^[0-9]{8}$") then .[0:7] else .[0:7] end)) as $m
            | "\($m)\t\(.[$gi] // "-")\t\(.[$ci] | . * 100 | round / 100)"
        '
		return 0
	fi

	echo "$result" | jq -r '
        (.properties.columns | map(.name)) as $cols
        | ($cols | index("Cost")) as $ci
        | (($cols | index("BillingMonth")) // ($cols | index("UsageDate"))) as $di
        | .properties.rows
        | sort_by(.[$di] | tostring)
        | .[]
        | ((.[$di] | tostring) | if test("^[0-9]{8}$") then .[0:4] + "-" + .[4:6] else .[0:7] end) as $m
        | "  \($m): $\(.[$ci] | . * 100 | round / 100)"
    '

	local total=$(echo "$result" | jq '
        (.properties.columns | map(.name) | index("Cost")) as $ci
        | [.properties.rows[][$ci]] | add // 0')
	printf "\n${GREEN}Total ${months} months: \$%.2f${NC}\n" "$total"

	# Redundant when already scoped to a single service.
	[ -n "$SERVICE_FILTER" ] && return 0

	echo -e "\n${BLUE}=== By Service (same period) ===${NC}"
	local body_service=$(
		cat <<EOF
{
    "type": "ActualCost",
    "timeframe": "Custom",
    "timePeriod": {"from": "${start_date}", "to": "${end_date}"},
    "dataset": {
        "granularity": "None",
        "aggregation": {"totalCost": {"name": "Cost", "function": "Sum"}},
        "grouping": [{"type": "Dimension", "name": "ServiceName"}]
    }
}
EOF
	)

	local svc
	svc=$(cm_query "$body_service") || return 1
	echo "$svc" | jq -r '
        .properties.rows
        | sort_by(-.[0])
        | .[]
        | "  \(.[1]): $\(.[0] | . * 100 | round / 100)"
    '
}

# JSON output mode
output_json() {
	local start_date=$(date -v-${DAYS}d +%Y-%m-%d 2>/dev/null || date -d "-${DAYS} days" +%Y-%m-%d)
	local end_date=$(date +%Y-%m-%d)

	# Get MTD
	local mtd
	mtd=$(cm_query '{"type":"ActualCost","timeframe":"MonthToDate","dataset":{"granularity":"None","aggregation":{"totalCost":{"name":"Cost","function":"Sum"}}}}' | jq '.properties.rows[0][0] // 0') || return 1

	# Get by service
	local body_service=$(
		cat <<EOF
{
    "type": "ActualCost",
    "timeframe": "Custom",
    "timePeriod": {"from": "${start_date}", "to": "${end_date}"},
    "dataset": {
        "granularity": "None",
        "aggregation": {"totalCost": {"name": "Cost", "function": "Sum"}},
        "grouping": [{"type": "Dimension", "name": "ServiceName"}]
    }
}
EOF
	)

	local services
	services=$(cm_query "$body_service" | jq '[.properties.rows[] | {service: .[1], cost: .[0], currency: .[2]}] | sort_by(-.cost)') || return 1

	# Build JSON output
	jq -n \
		--arg sub "$SUBSCRIPTION_ID" \
		--arg start "$start_date" \
		--arg end "$end_date" \
		--argjson mtd "$mtd" \
		--argjson services "$services" \
		'{
            subscriptionId: $sub,
            periodStart: $start,
            periodEnd: $end,
            monthToDate: $mtd,
            costsByService: $services,
            currency: "USD"
        }'
}

# Main
main() {
	check_auth

	if [ -n "$MONTHS" ]; then
		echo -e "${GREEN}Azure Cost Report - Subscription: ${SUBSCRIPTION_ID}${NC}"
		echo "=============================================="
		get_monthly_costs "$MONTHS"
		return
	fi

	if [ "$OUTPUT_FORMAT" = "json" ]; then
		output_json
	else
		echo -e "${GREEN}Azure Cost Report - Subscription: ${SUBSCRIPTION_ID}${NC}"
		echo "=============================================="
		get_mtd_costs
		get_costs_by_service
		get_daily_costs
		get_forecast
	fi
}

usage() {
	echo "Usage: $0 [days] [format]"
	echo "       $0 --months N"
	echo ""
	echo "Arguments:"
	echo "  days        Number of days to look back (default: 30)"
	echo "  format      Output format: table (default) or json"
	echo "  --months N  Monthly breakdown over the last N months"
	echo ""
	echo "Environment:"
	echo "  AZURE_SUBSCRIPTION_ID  Override default subscription"
	echo ""
	echo "Examples:"
	echo "  $0              # Last 30 days, table format"
	echo "  $0 7            # Last 7 days"
	echo "  $0 30 json      # JSON output"
	echo "  $0 --months 6   # Last 6 months, month by month"
	echo "  $0 --months 6 --service \"Foundry Models\"   # AI spend only"
	echo "  $0 --months 6 --by ResourceGroupName        # month/group/cost rows"
}

case "$1" in
-h | --help)
	usage
	exit 0
	;;
--months)
	MONTHS="${2:-6}"
	SERVICE_FILTER=""
	BY_DIM=""
	case "${3:-}" in
	--service) SERVICE_FILTER="${4:-}" ;;
	--by) BY_DIM="${4:-ResourceGroupName}" ;;
	esac
	if ! [[ "$MONTHS" =~ ^[0-9]+$ ]] || [ "$MONTHS" -lt 1 ] || [ "$MONTHS" -gt 12 ]; then
		echo "Error: --months requires an integer between 1 and 12" >&2
		exit 1
	fi
	;;
esac

main
