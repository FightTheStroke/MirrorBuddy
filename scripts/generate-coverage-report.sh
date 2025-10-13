#!/bin/bash

# Generate code coverage report from xcodebuild test results
# This script extracts coverage data and generates human-readable reports

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="MirrorBuddy"
DERIVED_DATA_PATH="./DerivedData"
COVERAGE_REPORT_DIR="./coverage-reports"
COVERAGE_TARGET=80.0

# Create coverage reports directory
mkdir -p "${COVERAGE_REPORT_DIR}"

# Find the latest test result bundle
echo -e "${YELLOW}Searching for test results...${NC}"

TEST_RESULT=$(find "${DERIVED_DATA_PATH}" -name "*.xcresult" | head -n 1)

if [ -z "$TEST_RESULT" ]; then
    echo -e "${RED}❌ No test results found. Run tests first with: ./scripts/run-tests-with-coverage.sh${NC}"
    exit 1
fi

echo -e "${GREEN}Found test results: ${TEST_RESULT}${NC}"
echo ""

# Export coverage data to JSON
COVERAGE_JSON="${COVERAGE_REPORT_DIR}/coverage.json"
echo -e "${YELLOW}Exporting coverage data to JSON...${NC}"

xcrun xccov view --report --json "${TEST_RESULT}" > "${COVERAGE_JSON}"

echo -e "${GREEN}✅ Coverage data exported to ${COVERAGE_JSON}${NC}"

# Generate human-readable text report
COVERAGE_TXT="${COVERAGE_REPORT_DIR}/coverage.txt"
echo -e "${YELLOW}Generating text report...${NC}"

xcrun xccov view --report "${TEST_RESULT}" > "${COVERAGE_TXT}"

echo -e "${GREEN}✅ Text report generated: ${COVERAGE_TXT}${NC}"

# Parse coverage percentage from JSON
if command -v python3 &> /dev/null; then
    OVERALL_COVERAGE=$(python3 -c "
import json
import sys

try:
    with open('${COVERAGE_JSON}', 'r') as f:
        data = json.load(f)

    # Extract overall line coverage
    coverage = data.get('lineCoverage', 0) * 100
    print(f'{coverage:.2f}')
except Exception as e:
    print('0.00', file=sys.stderr)
    sys.exit(1)
")

    echo ""
    echo -e "${BLUE}======================================${NC}"
    echo -e "${BLUE}Coverage Summary${NC}"
    echo -e "${BLUE}======================================${NC}"
    echo -e "${YELLOW}Overall Line Coverage: ${OVERALL_COVERAGE}%${NC}"
    echo -e "${YELLOW}Target Coverage: ${COVERAGE_TARGET}%${NC}"

    # Compare with target
    COMPARISON=$(python3 -c "
coverage = float('${OVERALL_COVERAGE}')
target = float('${COVERAGE_TARGET}')

if coverage >= target:
    print('✅ PASSING')
    exit(0)
else:
    diff = target - coverage
    print(f'⚠️  BELOW TARGET (need {diff:.2f}% more)')
    exit(1)
")

    EXIT_CODE=$?

    if [ $EXIT_CODE -eq 0 ]; then
        echo -e "${GREEN}${COMPARISON}${NC}"
    else
        echo -e "${YELLOW}${COMPARISON}${NC}"
    fi

    echo -e "${BLUE}======================================${NC}"
else
    echo -e "${YELLOW}Python3 not found. Skipping detailed analysis.${NC}"
fi

echo ""
echo -e "${GREEN}Coverage reports generated in: ${COVERAGE_REPORT_DIR}/${NC}"
echo -e "  - ${COVERAGE_JSON} (JSON format)"
echo -e "  - ${COVERAGE_TXT} (Text format)"
echo ""

# Generate coverage badge (optional)
if command -v python3 &> /dev/null && [ -n "$OVERALL_COVERAGE" ]; then
    BADGE_FILE="${COVERAGE_REPORT_DIR}/badge.svg"

    # Determine badge color based on coverage
    if (( $(echo "$OVERALL_COVERAGE >= 80" | bc -l) )); then
        COLOR="brightgreen"
    elif (( $(echo "$OVERALL_COVERAGE >= 60" | bc -l) )); then
        COLOR="yellow"
    else
        COLOR="red"
    fi

    # Generate simple SVG badge
    cat > "${BADGE_FILE}" << EOF
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="20">
    <linearGradient id="b" x2="0" y2="100%">
        <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
        <stop offset="1" stop-opacity=".1"/>
    </linearGradient>
    <mask id="a">
        <rect width="120" height="20" rx="3" fill="#fff"/>
    </mask>
    <g mask="url(#a)">
        <path fill="#555" d="M0 0h63v20H0z"/>
        <path fill="#${COLOR}" d="M63 0h57v20H63z"/>
        <path fill="url(#b)" d="M0 0h120v20H0z"/>
    </g>
    <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
        <text x="31.5" y="15" fill="#010101" fill-opacity=".3">coverage</text>
        <text x="31.5" y="14">coverage</text>
        <text x="90.5" y="15" fill="#010101" fill-opacity=".3">${OVERALL_COVERAGE}%</text>
        <text x="90.5" y="14">${OVERALL_COVERAGE}%</text>
    </g>
</svg>
EOF

    echo -e "${GREEN}✅ Coverage badge generated: ${BADGE_FILE}${NC}"
    echo ""
fi

echo -e "${GREEN}Done!${NC}"
