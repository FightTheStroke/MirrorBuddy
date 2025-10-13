#!/bin/bash

# Run tests with code coverage enabled for MirrorBuddy
# This script runs the test suite and generates coverage data

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="MirrorBuddy"
SCHEME="${PROJECT_NAME}"
DERIVED_DATA_PATH="./DerivedData"
COVERAGE_TARGET=80.0

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}Running Tests with Code Coverage${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""

# Clean previous build artifacts
echo -e "${YELLOW}Cleaning previous build artifacts...${NC}"
rm -rf "${DERIVED_DATA_PATH}"
mkdir -p "${DERIVED_DATA_PATH}"

# Check if xcpretty is available for better output formatting
if command -v xcpretty &> /dev/null; then
    USE_XCPRETTY=true
    echo -e "${GREEN}Using xcpretty for formatted output${NC}"
else
    USE_XCPRETTY=false
    echo -e "${YELLOW}xcpretty not found. Install with: gem install xcpretty${NC}"
fi

echo ""
echo -e "${YELLOW}Running test suite...${NC}"
echo ""

# Run tests with coverage enabled
if [ "$USE_XCPRETTY" = true ]; then
    xcodebuild test \
        -scheme "${SCHEME}" \
        -destination 'platform=iOS Simulator,name=iPhone 16' \
        -derivedDataPath "${DERIVED_DATA_PATH}" \
        -enableCodeCoverage YES \
        -quiet \
        | xcpretty --color --report html --output "${DERIVED_DATA_PATH}/test-report.html"
else
    xcodebuild test \
        -scheme "${SCHEME}" \
        -destination 'platform=iOS Simulator,name=iPhone 16' \
        -derivedDataPath "${DERIVED_DATA_PATH}" \
        -enableCodeCoverage YES
fi

TEST_EXIT_CODE=$?

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ Tests passed successfully!${NC}"
else
    echo -e "${RED}❌ Tests failed with exit code ${TEST_EXIT_CODE}${NC}"
    exit $TEST_EXIT_CODE
fi

echo ""
echo -e "${YELLOW}Generating coverage report...${NC}"

# Generate coverage report using xcrun
./scripts/generate-coverage-report.sh

echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}Code Coverage Analysis Complete${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "${YELLOW}Coverage target: ${COVERAGE_TARGET}%${NC}"
echo ""
echo -e "View detailed coverage report:"
echo -e "  1. Open Xcode"
echo -e "  2. Go to Report Navigator (⌘9)"
echo -e "  3. Select the latest test run"
echo -e "  4. Click on Coverage tab"
echo ""
echo -e "Or view the HTML report (if xcpretty installed):"
echo -e "  open ${DERIVED_DATA_PATH}/test-report.html"
echo ""
