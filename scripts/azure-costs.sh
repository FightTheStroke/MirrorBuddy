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

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check az login
check_auth() {
	if ! az account show &>/dev/null; then
		echo -e "${RED}Error: Not logged in to Azure. Run 'az login' first.${NC}"
		exit 1
	fi
}

# Get current month costs
get_mtd_costs() {
	echo -e "${BLUE}=== Month-to-Date Costs ===${NC}"

	local result=$(az rest --method post \
		--url "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.CostManagement/query?api-version=2023-11-01" \
		--body '{"type":"ActualCost","timeframe":"MonthToDate","dataset":{"granularity":"None","aggregation":{"totalCost":{"name":"Cost","function":"Sum"}}}}' \
		-o json 2>/dev/null)

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

	local result=$(az rest --method post \
		--url "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.CostManagement/query?api-version=2023-11-01" \
		--body "$body" \
		-o json 2>/dev/null)

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

	local result=$(az rest --method post \
		--url "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.CostManagement/query?api-version=2023-11-01" \
		--body "$body" \
		-o json 2>/dev/null)

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

	local result=$(az rest --method post \
		--url "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.CostManagement/query?api-version=2023-11-01" \
		--body '{"type":"ActualCost","timeframe":"MonthToDate","dataset":{"granularity":"None","aggregation":{"totalCost":{"name":"Cost","function":"Sum"}}}}' \
		-o json 2>/dev/null)

	local current_cost=$(echo "$result" | jq -r '.properties.rows[0][0] // 0')
	local day_of_month=$(date +%-d)
	local days_in_month=$(date -v1d -v+1m -v-1d +%-d 2>/dev/null || date -d "$(date +%Y-%m-01) +1 month -1 day" +%-d)

	local forecast=$(awk "BEGIN {printf \"%.2f\", ($current_cost / $day_of_month) * $days_in_month}")

	printf "${YELLOW}Estimated end of month: \$%s${NC}\n" "$forecast"
}

# JSON output mode
output_json() {
	local start_date=$(date -v-${DAYS}d +%Y-%m-%d 2>/dev/null || date -d "-${DAYS} days" +%Y-%m-%d)
	local end_date=$(date +%Y-%m-%d)

	# Get MTD
	local mtd=$(az rest --method post \
		--url "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.CostManagement/query?api-version=2023-11-01" \
		--body '{"type":"ActualCost","timeframe":"MonthToDate","dataset":{"granularity":"None","aggregation":{"totalCost":{"name":"Cost","function":"Sum"}}}}' \
		-o json 2>/dev/null | jq '.properties.rows[0][0] // 0')

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

	local services=$(az rest --method post \
		--url "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/providers/Microsoft.CostManagement/query?api-version=2023-11-01" \
		--body "$body_service" \
		-o json 2>/dev/null | jq '[.properties.rows[] | {service: .[1], cost: .[0], currency: .[2]}] | sort_by(-.cost)')

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

# Help
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
	echo "Usage: $0 [days] [format]"
	echo ""
	echo "Arguments:"
	echo "  days    Number of days to look back (default: 30)"
	echo "  format  Output format: table (default) or json"
	echo ""
	echo "Environment:"
	echo "  AZURE_SUBSCRIPTION_ID  Override default subscription"
	echo ""
	echo "Examples:"
	echo "  $0              # Last 30 days, table format"
	echo "  $0 7            # Last 7 days"
	echo "  $0 30 json      # JSON output"
	exit 0
fi

main
