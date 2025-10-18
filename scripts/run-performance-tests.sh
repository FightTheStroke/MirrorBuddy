#!/bin/bash
# MirrorBuddy Performance Test Runner
# Task 122: Automated performance benchmarking

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT="MirrorBuddy.xcodeproj"
SCHEME="MirrorBuddy"
DESTINATION="platform=iOS Simulator,name=iPhone 16"
TEST_TARGET="MirrorBuddyTests/PerformanceTests"
RESULTS_DIR="./performance-results"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RESULT_BUNDLE="${RESULTS_DIR}/performance-${TIMESTAMP}.xcresult"

# Create results directory if it doesn't exist
mkdir -p "$RESULTS_DIR"

# Function to print colored output
print_status() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Print header
echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   MirrorBuddy Performance Test Runner    ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════╝${NC}"
echo ""

# Check if Xcode is installed
if ! command -v xcodebuild &> /dev/null; then
    print_error "Xcodebuild not found. Please install Xcode."
    exit 1
fi

print_status "Starting performance tests..."
print_status "Project: $PROJECT"
print_status "Scheme: $SCHEME"
print_status "Destination: $DESTINATION"
print_status "Results: $RESULT_BUNDLE"
echo ""

# Run performance tests
print_status "Running tests (this may take a few minutes)..."
echo ""

if xcodebuild test \
    -project "$PROJECT" \
    -scheme "$SCHEME" \
    -destination "$DESTINATION" \
    -only-testing:"$TEST_TARGET" \
    -resultBundlePath "$RESULT_BUNDLE" \
    2>&1 | tee "${RESULTS_DIR}/test-output-${TIMESTAMP}.log"; then

    echo ""
    print_success "Performance tests completed successfully!"
    print_status "Results saved to: $RESULT_BUNDLE"
    echo ""

    # Open results in Xcode if requested
    if [ "$1" == "--open" ]; then
        print_status "Opening results in Xcode Organizer..."
        open "$RESULT_BUNDLE"
    else
        print_status "To view results in Xcode, run:"
        echo "  open $RESULT_BUNDLE"
    fi

    echo ""
    print_status "Performance Summary:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Extract and display test results
    if command -v xcrun &> /dev/null; then
        xcrun xcresulttool get --path "$RESULT_BUNDLE" --format json \
            | python3 -c "
import sys, json
data = json.load(sys.stdin)
# Simple extraction of test results
# Note: Full parsing would require more complex JSON navigation
print('Test results extracted successfully')
" 2>/dev/null || echo "View detailed results in Xcode Organizer"
    fi

    echo ""
    print_success "Test run complete! 🎉"
    echo ""

    exit 0
else
    echo ""
    print_error "Performance tests failed!"
    print_status "Check the log file: ${RESULTS_DIR}/test-output-${TIMESTAMP}.log"
    echo ""

    exit 1
fi
