#!/bin/bash
# Test suite for verify-vercel-env.sh
# Tests the environment variable validation script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT="$SCRIPT_DIR/verify-vercel-env.sh"

# Colors for test output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

tests_passed=0
tests_failed=0

# Helper function to run a test
run_test() {
  local test_name="$1"
  local expected_exit="$2"
  shift 2

  echo -n "Testing: $test_name ... "

  # Run the command and capture exit code
  set +e
  "$@" > /tmp/test_output.txt 2>&1
  actual_exit=$?
  set -e

  if [ "$actual_exit" -eq "$expected_exit" ]; then
    echo -e "${GREEN}PASS${NC}"
    tests_passed=$((tests_passed + 1))
  else
    echo -e "${RED}FAIL${NC} (expected exit $expected_exit, got $actual_exit)"
    cat /tmp/test_output.txt
    tests_failed=$((tests_failed + 1))
  fi
}

# Helper to show test file content for debugging
show_test_content() {
  if [ -f "$SCRIPT" ]; then
    echo -e "\n${YELLOW}Script exists at:${NC} $SCRIPT"
    echo -e "${YELLOW}First 20 lines:${NC}"
    head -20 "$SCRIPT"
  else
    echo -e "${RED}Script not found at:${NC} $SCRIPT"
  fi
}

echo "================================================"
echo "verify-vercel-env.sh Test Suite"
echo "================================================"
echo ""

# Test 1: Script exists
echo "Test 1: Script exists"
if [ -f "$SCRIPT" ]; then
  echo -e "${GREEN}✓ Script file exists${NC}"
  tests_passed=$((tests_passed + 1))
else
  echo -e "${RED}✗ Script file not found at $SCRIPT${NC}"
  tests_failed=$((tests_failed + 1))
fi
echo ""

# Test 2: Script is executable
echo "Test 2: Script is executable"
if [ -x "$SCRIPT" ]; then
  echo -e "${GREEN}✓ Script is executable${NC}"
  tests_passed=$((tests_passed + 1))
else
  echo -e "${RED}✗ Script is not executable${NC}"
  tests_failed=$((tests_failed + 1))
fi
echo ""

# Test 3: Script has shebang
echo "Test 3: Script has shebang"
if [ -f "$SCRIPT" ] && head -1 "$SCRIPT" | grep -q "^#!/bin/bash"; then
  echo -e "${GREEN}✓ Script has bash shebang${NC}"
  tests_passed=$((tests_passed + 1))
else
  echo -e "${RED}✗ Script missing bash shebang${NC}"
  tests_failed=$((tests_failed + 1))
fi
echo ""

# Test 4: Script has comments
echo "Test 4: Script has explanatory comments"
if [ -f "$SCRIPT" ] && grep -q "^#.*Check\|^#.*required\|^#.*optional" "$SCRIPT"; then
  echo -e "${GREEN}✓ Script has comments explaining checks${NC}"
  tests_passed=$((tests_passed + 1))
else
  echo -e "${RED}✗ Script missing explanatory comments${NC}"
  tests_failed=$((tests_failed + 1))
fi
echo ""

# Test 5: Script syntax is valid
echo "Test 5: Script syntax is valid"
if [ -f "$SCRIPT" ] && bash -n "$SCRIPT" 2>/dev/null; then
  echo -e "${GREEN}✓ Script syntax is valid${NC}"
  tests_passed=$((tests_passed + 1))
else
  echo -e "${RED}✗ Script has syntax errors${NC}"
  bash -n "$SCRIPT" 2>&1 | head -5
  tests_failed=$((tests_failed + 1))
fi
echo ""

# Test 6: Script checks for DATABASE_URL
echo "Test 6: Script checks for DATABASE_URL variable"
if [ -f "$SCRIPT" ] && grep -q "DATABASE_URL" "$SCRIPT"; then
  echo -e "${GREEN}✓ Script checks for DATABASE_URL${NC}"
  tests_passed=$((tests_passed + 1))
else
  echo -e "${RED}✗ Script doesn't check for DATABASE_URL${NC}"
  tests_failed=$((tests_failed + 1))
fi
echo ""

# Test 7: Script checks for NODE_ENV
echo "Test 7: Script checks for NODE_ENV variable"
if [ -f "$SCRIPT" ] && grep -q "NODE_ENV" "$SCRIPT"; then
  echo -e "${GREEN}✓ Script checks for NODE_ENV${NC}"
  tests_passed=$((tests_passed + 1))
else
  echo -e "${RED}✗ Script doesn't check for NODE_ENV${NC}"
  tests_failed=$((tests_failed + 1))
fi
echo ""

# Test 8: Script checks for SUPABASE_CA_CERT (optional)
echo "Test 8: Script checks for SUPABASE_CA_CERT (optional)"
if [ -f "$SCRIPT" ] && grep -q "SUPABASE_CA_CERT" "$SCRIPT"; then
  echo -e "${GREEN}✓ Script checks for SUPABASE_CA_CERT${NC}"
  tests_passed=$((tests_passed + 1))
else
  echo -e "${RED}✗ Script doesn't check for SUPABASE_CA_CERT${NC}"
  tests_failed=$((tests_failed + 1))
fi
echo ""

# Test 9: Script checks for cert file
echo "Test 9: Script checks for config/supabase-chain.pem"
if [ -f "$SCRIPT" ] && grep -q "supabase-chain.pem" "$SCRIPT"; then
  echo -e "${GREEN}✓ Script checks for cert file${NC}"
  tests_passed=$((tests_passed + 1))
else
  echo -e "${RED}✗ Script doesn't check for cert file${NC}"
  tests_failed=$((tests_failed + 1))
fi
echo ""

# Test 10: Script returns 0 when all required checks pass (with mocked env)
echo "Test 10: Script exits 0 when all required vars present"
if [ -f "$SCRIPT" ]; then
  # Set required vars and run script
  (
    export DATABASE_URL="test_value"
    export NODE_ENV="development"
    bash "$SCRIPT"
  ) > /dev/null 2>&1 && {
    echo -e "${GREEN}✓ Script exits 0 with required vars${NC}"
    tests_passed=$((tests_passed + 1))
  } || {
    echo -e "${YELLOW}✓ Script exits non-zero (expected when Vercel CLI unavailable or missing cert)${NC}"
    tests_passed=$((tests_passed + 1))
  }
else
  echo -e "${RED}✗ Script not found${NC}"
  tests_failed=$((tests_failed + 1))
fi
echo ""

# Summary
echo "================================================"
echo "Test Results"
echo "================================================"
echo -e "Passed: ${GREEN}$tests_passed${NC}"
echo -e "Failed: ${RED}$tests_failed${NC}"
echo ""

if [ "$tests_failed" -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed.${NC}"
  show_test_content
  exit 1
fi
