#!/bin/bash
# Test suite for link checker integration
# Verifies that check-links.sh is properly integrated into CI and pre-commit hook

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CI_SUMMARY="$SCRIPT_DIR/ci-summary.sh"
PRE_COMMIT="$SCRIPT_DIR/../.husky/pre-commit"

# Colors for test output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

tests_passed=0
tests_failed=0

echo "================================================"
echo "Link Checker Integration Test Suite"
echo "================================================"
echo ""

# Test 1: ci-summary.sh has run_link_check function
echo "Test 1: ci-summary.sh has run_link_check function"
if [ -f "$CI_SUMMARY" ] && grep -q "^run_link_check()" "$CI_SUMMARY"; then
	echo -e "${GREEN}✓ ci-summary.sh has run_link_check function${NC}"
	tests_passed=$((tests_passed + 1))
else
	echo -e "${RED}✗ ci-summary.sh missing run_link_check function${NC}"
	tests_failed=$((tests_failed + 1))
fi
echo ""

# Test 2: ci-summary.sh has --links flag in case statement
echo "Test 2: ci-summary.sh has --links flag in case statement"
if [ -f "$CI_SUMMARY" ] && grep -q "^--links)" "$CI_SUMMARY"; then
	echo -e "${GREEN}✓ ci-summary.sh has --links flag${NC}"
	tests_passed=$((tests_passed + 1))
else
	echo -e "${RED}✗ ci-summary.sh missing --links flag in case statement${NC}"
	tests_failed=$((tests_failed + 1))
fi
echo ""

# Test 3: ci-summary.sh calls run_link_check in --all mode
echo "Test 3: ci-summary.sh calls run_link_check in --all mode"
if [ -f "$CI_SUMMARY" ]; then
	# Extract --all case block and check for run_link_check
	awk '/^--all\)/,/^[[:space:]]*;;/' "$CI_SUMMARY" | grep -q "run_link_check" && {
		echo -e "${GREEN}✓ ci-summary.sh calls run_link_check in --all mode${NC}"
		tests_passed=$((tests_passed + 1))
	} || {
		echo -e "${RED}✗ ci-summary.sh doesn't call run_link_check in --all mode${NC}"
		tests_failed=$((tests_failed + 1))
	}
else
	echo -e "${RED}✗ ci-summary.sh not found${NC}"
	tests_failed=$((tests_failed + 1))
fi
echo ""

# Test 4: ci-summary.sh does NOT call run_link_check in default mode
echo "Test 4: ci-summary.sh does NOT call run_link_check in --default mode"
if [ -f "$CI_SUMMARY" ]; then
	# Extract default case block and verify run_link_check is NOT there
	awk '/^\*\)/,/^[[:space:]]*;;/' "$CI_SUMMARY" | grep -q "run_link_check" && {
		echo -e "${RED}✗ ci-summary.sh incorrectly calls run_link_check in default mode${NC}"
		tests_failed=$((tests_failed + 1))
	} || {
		echo -e "${GREEN}✓ ci-summary.sh correctly excludes run_link_check from default mode${NC}"
		tests_passed=$((tests_passed + 1))
	}
else
	echo -e "${RED}✗ ci-summary.sh not found${NC}"
	tests_failed=$((tests_failed + 1))
fi
echo ""

# Test 5: pre-commit hook has link checking section
echo "Test 5: pre-commit hook has link checking section"
if [ -f "$PRE_COMMIT" ] && grep -q "check-links" "$PRE_COMMIT"; then
	echo -e "${GREEN}✓ pre-commit hook has link checking section${NC}"
	tests_passed=$((tests_passed + 1))
else
	echo -e "${RED}✗ pre-commit hook missing link checking section${NC}"
	tests_failed=$((tests_failed + 1))
fi
echo ""

# Test 6: pre-commit hook checks for staged .md files
echo "Test 6: pre-commit hook checks for staged .md files"
if [ -f "$PRE_COMMIT" ] && grep -q 'STAGED_MD.*\.md' "$PRE_COMMIT"; then
	echo -e "${GREEN}✓ pre-commit hook checks for staged .md files${NC}"
	tests_passed=$((tests_passed + 1))
else
	echo -e "${RED}✗ pre-commit hook doesn't check for staged .md files${NC}"
	tests_failed=$((tests_failed + 1))
fi
echo ""

# Test 7: run_link_check follows ci-summary.sh pattern (ERRORS counter)
echo "Test 7: run_link_check uses ERRORS counter on failure"
if [ -f "$CI_SUMMARY" ]; then
	# Check if run_link_check increments ERRORS on failure
	awk '/^run_link_check\(\)/,/^}/' "$CI_SUMMARY" | grep -q '((ERRORS++))' && {
		echo -e "${GREEN}✓ run_link_check increments ERRORS counter${NC}"
		tests_passed=$((tests_passed + 1))
	} || {
		echo -e "${RED}✗ run_link_check doesn't increment ERRORS counter${NC}"
		tests_failed=$((tests_failed + 1))
	}
else
	echo -e "${RED}✗ ci-summary.sh not found${NC}"
	tests_failed=$((tests_failed + 1))
fi
echo ""

# Test 8: run_link_check calls check-links.sh script
echo "Test 8: run_link_check calls check-links.sh"
if [ -f "$CI_SUMMARY" ]; then
	awk '/^run_link_check\(\)/,/^}/' "$CI_SUMMARY" | grep -q 'check-links.sh' && {
		echo -e "${GREEN}✓ run_link_check calls check-links.sh${NC}"
		tests_passed=$((tests_passed + 1))
	} || {
		echo -e "${RED}✗ run_link_check doesn't call check-links.sh${NC}"
		tests_failed=$((tests_failed + 1))
	}
else
	echo -e "${RED}✗ ci-summary.sh not found${NC}"
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
	exit 1
fi
