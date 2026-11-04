#!/usr/bin/env bash
# =============================================================================
# PERFORMANCE CHECK SCRIPT
# Validates performance patterns before release.
# Part of the pre-release pipeline (Phase 4).
#
# Usage: ./scripts/perf-check.sh
# =============================================================================

set -Ee

# Numeric-only diagnostics; keep checker output private in the native execution log.
PERF_CRITERION=0
trap 'printf "__PERF_FAILURE__ criterion=%s exit=%s\n" "$PERF_CRITERION" "$?" >&2' ERR
run_perf_check() {
    PERF_CRITERION="$1"
    local before="$FAILED"
    "$2"
    if [[ "$FAILED" -gt "$before" ]]; then
        printf "__PERF_FAILURE__ criterion=%s exit=1\n" "$PERF_CRITERION" >&2
    fi
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHECKS_DIR="$SCRIPT_DIR/perf-checks"
cd "$SCRIPT_DIR/.."

# Source modules
source "$CHECKS_DIR/common.sh"
source "$CHECKS_DIR/bundle.sh"
source "$CHECKS_DIR/memory.sh"
source "$CHECKS_DIR/database.sh"

echo ""
echo "=========================================="
echo " PERFORMANCE VALIDATION"
echo "=========================================="
echo ""

# Run all checks in order
run_perf_check 1 check_images           # [1/6] Avatar WebP
run_perf_check 2 check_eventsource      # [2/6] EventSource cleanup
run_perf_check 3 check_listeners        # [3/6] Event listener cleanup
run_perf_check 4 check_n1_patterns      # [4/6] N+1 database patterns
run_perf_check 5 check_bundle_size      # [5/6] Bundle size
run_perf_check 6 check_lazy_loading     # [6/6] Lazy loading

# Summary
echo ""
echo "=========================================="

if [ $FAILED -ne 0 ]; then
    echo -e "${RED} ✗ PERFORMANCE CHECKS FAILED${NC}"
    echo "   Fix blocking issues before release."
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW} ⚠ PERFORMANCE CHECKS PASSED WITH WARNINGS${NC}"
    echo "   $WARNINGS warning(s) - review recommended."
    exit 0
else
    echo -e "${GREEN} ✓ ALL PERFORMANCE CHECKS PASSED${NC}"
    exit 0
fi
