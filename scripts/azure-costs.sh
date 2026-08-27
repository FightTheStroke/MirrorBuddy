#!/bin/bash
# ============================================================================
# Azure Cost Monitoring Script
# Uses az CLI credentials (az login) - no secrets required
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/azure-costs-common.sh
. "${SCRIPT_DIR}/lib/azure-costs-common.sh"
# shellcheck source=lib/azure-costs-monthly.sh
. "${SCRIPT_DIR}/lib/azure-costs-monthly.sh"

DAYS="${1:-30}"
OUTPUT_FORMAT="${2:-table}"
MONTHS=""
SERVICE_FILTER=""
BY_DIM=""

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
