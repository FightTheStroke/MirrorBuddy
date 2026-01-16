#!/usr/bin/env bash
# =============================================================================
# PERFORMANCE CHECK SCRIPT
# Validates performance patterns before release.
# Part of the pre-release pipeline (Phase 4).
#
# Usage: ./scripts/perf-check.sh
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CHECKS_DIR="$SCRIPT_DIR/perf-checks"

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
check_images           # [1/6] Avatar WebP
check_eventsource      # [2/6] EventSource cleanup
check_listeners        # [3/6] Event listener cleanup
check_n1_patterns      # [4/6] N+1 database patterns
check_bundle_size      # [5/6] Bundle size
check_lazy_loading     # [6/6] Lazy loading

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
