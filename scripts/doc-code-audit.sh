#!/bin/bash

# =============================================================================
# doc-code-audit.sh - Automated Documentation/Code Mismatch Detector
#
# Purpose: Verify that documentation accurately reflects codebase values
#
# Checks:
# 1. Trial limits in README vs TierService (10 chats, 5 min voice, 10 tools, 3 maestri)
# 2. Health endpoint status values (healthy/degraded/unhealthy)
# 3. Voice model name (gpt-realtime not gpt-4o-realtime-preview)
# 4. Metrics push cadence (5 minutes)
#
# Exit codes:
#   0 - All checks passed (no mismatches)
#   1 - One or more mismatches found
#
# Usage: ./scripts/doc-code-audit.sh
# =============================================================================

set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Tracking
MISMATCHES=0
CHECKS_PASSED=0

# ============================================================================
# Helper functions
# ============================================================================

log_pass() {
  echo -e "${GREEN}✓ PASS${NC}: $1"
  ((CHECKS_PASSED++))
}

log_fail() {
  echo -e "${RED}✗ FAIL${NC}: $1"
  ((MISMATCHES++))
}

log_info() {
  echo -e "${YELLOW}ℹ INFO${NC}: $1"
}

# ============================================================================
# Check 1: Trial Limits (README vs TierService)
# ============================================================================

check_trial_limits() {
  log_info "Checking trial limits..."

  local readme_file="$PROJECT_ROOT/README.md"

  if [ ! -f "$readme_file" ]; then
    log_fail "README.md not found at $readme_file"
    return 1
  fi

  # Extract expected values from TierService (tier-fallbacks.ts)
  local tier_file="$PROJECT_ROOT/src/lib/tier/tier-fallbacks.ts"

  if [ ! -f "$tier_file" ]; then
    log_fail "tier-fallbacks.ts not found at $tier_file"
    return 1
  fi

  # Extract actual trial limits from code
  local trial_chat=$(grep -A 50 'code === TierCode.TRIAL' "$tier_file" | grep 'chatLimitDaily:' | grep -oE '[0-9]+' | head -1)
  local trial_voice=$(grep -A 50 'code === TierCode.TRIAL' "$tier_file" | grep 'voiceMinutesDaily:' | grep -oE '[0-9]+' | head -1)
  local trial_tools=$(grep -A 50 'code === TierCode.TRIAL' "$tier_file" | grep 'toolsLimitDaily:' | grep -oE '[0-9]+' | head -1)
  local trial_maestri=$(grep -A 50 'code === TierCode.TRIAL' "$tier_file" | grep 'maestriLimit:' | grep -oE '[0-9]+' | head -1)

  # Check README values in Trial Mode table
  # Extract from markdown table under Trial Mode section (before next heading)
  local trial_section=$(sed -n '/## Trial Mode/,/^---/p' "$readme_file")

  # Extract limits from table rows (more precise extraction)
  local readme_chat=$(echo "$trial_section" | grep "^| Chat messages" | awk -F'|' '{print $3}' | xargs)
  local readme_voice=$(echo "$trial_section" | grep "^| Voice time" | awk -F'|' '{print $3}' | xargs | grep -oE '^[0-9]+')
  local readme_tools=$(echo "$trial_section" | grep "^| Tool calls" | awk -F'|' '{print $3}' | xargs)
  local readme_maestri=$(echo "$trial_section" | grep "^| Maestri" | awk -F'|' '{print $3}' | xargs)

  # Validate chat limit (expected: 10)
  if [ "$trial_chat" = "10" ] && [ "$readme_chat" = "10" ]; then
    log_pass "Trial chat limit: 10 (README ✓, code ✓)"
  else
    log_fail "Trial chat limit mismatch: README=$readme_chat, code=$trial_chat (expected: 10)"
  fi

  # Validate voice limit (expected: 5)
  if [ "$trial_voice" = "5" ] && [ "$readme_voice" = "5" ]; then
    log_pass "Trial voice limit: 5 minutes (README ✓, code ✓)"
  else
    log_fail "Trial voice limit mismatch: README=$readme_voice min, code=$trial_voice min (expected: 5)"
  fi

  # Validate tools limit (expected: 10)
  if [ "$trial_tools" = "10" ] && [ "$readme_tools" = "10" ]; then
    log_pass "Trial tools limit: 10 (README ✓, code ✓)"
  else
    log_fail "Trial tools limit mismatch: README=$readme_tools, code=$trial_tools (expected: 10)"
  fi

  # Validate maestri limit (expected: 3)
  if [ "$trial_maestri" = "3" ] && [ "$readme_maestri" = "3" ]; then
    log_pass "Trial maestri limit: 3 (README ✓, code ✓)"
  else
    log_fail "Trial maestri limit mismatch: README=$readme_maestri, code=$trial_maestri (expected: 3)"
  fi
}

# ============================================================================
# Check 2: Health Endpoint Status Values
# ============================================================================

check_health_status_values() {
  log_info "Checking health endpoint status values..."

  local health_file="$PROJECT_ROOT/src/app/api/health/route.ts"

  if [ ! -f "$health_file" ]; then
    log_fail "health/route.ts not found at $health_file"
    return 1
  fi

  local readme_file="$PROJECT_ROOT/README.md"

  # Check if code contains all required status values
  local has_healthy=$(grep -c '"healthy"' "$health_file")
  local has_degraded=$(grep -c '"degraded"' "$health_file")
  local has_unhealthy=$(grep -c '"unhealthy"' "$health_file")

  # Check if README documents them correctly
  local readme_has_healthy=$(grep -c 'healthy' "$readme_file")
  local readme_has_degraded=$(grep -c 'degraded' "$readme_file")
  local readme_has_unhealthy=$(grep -c 'unhealthy' "$readme_file")

  if [ "$has_healthy" -gt 0 ] && [ "$readme_has_healthy" -gt 0 ]; then
    log_pass "Health status 'healthy' found in code and README"
  else
    log_fail "Health status 'healthy' mismatch: code=$has_healthy, README=$readme_has_healthy"
  fi

  if [ "$has_degraded" -gt 0 ] && [ "$readme_has_degraded" -gt 0 ]; then
    log_pass "Health status 'degraded' found in code and README"
  else
    log_fail "Health status 'degraded' mismatch: code=$has_degraded, README=$readme_has_degraded"
  fi

  if [ "$has_unhealthy" -gt 0 ] && [ "$readme_has_unhealthy" -gt 0 ]; then
    log_pass "Health status 'unhealthy' found in code and README"
  else
    log_fail "Health status 'unhealthy' mismatch: code=$has_unhealthy, README=$readme_has_unhealthy"
  fi
}

# ============================================================================
# Check 3: Voice Model Name
# ============================================================================

check_voice_model_name() {
  log_info "Checking voice model name..."

  local tier_file="$PROJECT_ROOT/src/lib/tier/tier-fallbacks.ts"

  if [ ! -f "$tier_file" ]; then
    log_fail "tier-fallbacks.ts not found at $tier_file"
    return 1
  fi

  # Check for incorrect model names
  local has_wrong_model=$(grep -c 'gpt-4o-realtime-preview' "$tier_file")
  local has_correct_model=$(grep -c 'gpt-realtime' "$tier_file")

  if [ "$has_wrong_model" -gt 0 ]; then
    log_fail "Found deprecated voice model 'gpt-4o-realtime-preview' (should be 'gpt-realtime')"
  else
    log_pass "No deprecated voice model names found"
  fi

  if [ "$has_correct_model" -gt 0 ]; then
    log_pass "Found correct voice model name 'gpt-realtime'"
  else
    log_fail "Did not find expected voice model 'gpt-realtime' in tier definitions"
  fi
}

# ============================================================================
# Check 4: Metrics Push Cadence
# ============================================================================

check_metrics_push_cadence() {
  log_info "Checking metrics push cadence..."

  local vercel_file="$PROJECT_ROOT/vercel.json"
  local operations_doc="$PROJECT_ROOT/docs/operations/CRON-JOBS.md"

  if [ ! -f "$vercel_file" ]; then
    log_fail "vercel.json not found at $vercel_file"
    return 1
  fi

  # Check metrics-push schedule in vercel.json (should be */5 * * * * = every 5 minutes)
  local metrics_schedule=$(grep -A 2 'metrics-push' "$vercel_file" | grep 'schedule' | grep -oE '"[^"]*"' | tail -1)
  metrics_schedule="${metrics_schedule%\"}"
  metrics_schedule="${metrics_schedule#\"}"

  if [ "$metrics_schedule" = "*/5 * * * *" ]; then
    log_pass "Metrics push cadence: every 5 minutes (vercel.json ✓)"
  else
    log_fail "Metrics push cadence mismatch: found '$metrics_schedule' (expected: '*/5 * * * *')"
  fi

  # Check if operations doc mentions 5 minutes
  if [ -f "$operations_doc" ]; then
    local doc_mentions_5min=$(grep -c '5 min' "$operations_doc")
    if [ "$doc_mentions_5min" -gt 0 ]; then
      log_pass "Operations docs mention 5 minute cadence"
    else
      log_fail "Operations docs do not mention 5 minute metrics push cadence"
    fi
  else
    log_info "Operations doc not found, skipping cross-check"
  fi
}

# ============================================================================
# Main execution
# ============================================================================

main() {
  echo "=========================================="
  echo "Documentation/Code Audit Starting"
  echo "=========================================="
  echo ""

  check_trial_limits
  echo ""

  check_health_status_values
  echo ""

  check_voice_model_name
  echo ""

  check_metrics_push_cadence
  echo ""

  echo "=========================================="
  echo "Audit Summary"
  echo "=========================================="
  echo -e "Checks passed:  ${GREEN}$CHECKS_PASSED${NC}"
  echo -e "Mismatches:     ${RED}$MISMATCHES${NC}"
  echo ""

  if [ $MISMATCHES -eq 0 ]; then
    echo -e "${GREEN}✓ All documentation matches code!${NC}"
    return 0
  else
    echo -e "${RED}✗ Found $MISMATCHES mismatch(es)${NC}"
    return 1
  fi
}

main "$@"
exit $?
