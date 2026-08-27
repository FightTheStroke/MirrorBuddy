#!/bin/bash
# ============================================================================
# Monthly cost breakdown for azure-costs.sh. Sourced, never executed directly.
# Reads the SERVICE_FILTER and BY_DIM globals set by the caller.
# ============================================================================
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
            | ((.[$di] | tostring) | if test("^[0-9]{8}$") then .[0:4] + "-" + .[4:6] else .[0:7] end) as $m
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
