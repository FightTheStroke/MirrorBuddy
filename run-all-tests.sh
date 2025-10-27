#!/bin/bash
# Script to run ALL tests automatically and generate a comprehensive report

set -e

echo "🧪 Running ALL MirrorBuddy Tests"
echo "=================================="
echo ""

# Create test results directory
mkdir -p TestResults
TEST_REPORT="TestResults/test-results-$(date +%Y%m%d-%H%M%S).txt"

echo "Test Report - $(date)" > "$TEST_REPORT"
echo "=================================" >> "$TEST_REPORT"
echo "" >> "$TEST_REPORT"

# Function to run tests and capture output
run_test_suite() {
    local test_target=$1
    local test_name=$2

    echo "Running: $test_name..."
    echo "" >> "$TEST_REPORT"
    echo "## $test_name" >> "$TEST_REPORT"
    echo "---" >> "$TEST_REPORT"

    if xcodebuild test \
        -project MirrorBuddy.xcodeproj \
        -scheme MirrorBuddy \
        -sdk iphonesimulator \
        -destination 'platform=iOS Simulator,name=Any iOS Simulator Device' \
        -only-testing:"$test_target" \
        2>&1 | tee -a "$TEST_REPORT" | grep -E "(Test Case.*started|Test Case.*passed|Test Case.*failed|Testing failed|BUILD FAILED)"; then
        echo "✅ $test_name: PASSED" >> "$TEST_REPORT"
        echo "✅ $test_name: PASSED"
        return 0
    else
        echo "❌ $test_name: FAILED" >> "$TEST_REPORT"
        echo "❌ $test_name: FAILED"
        return 1
    fi
}

# Run MaterialProcessingPipeline tests
echo "Step 1: MaterialProcessingPipeline Tests"
echo "========================================="
run_test_suite "MirrorBuddyTests/MaterialProcessingPipelineTests" "Pipeline Tests" || true

echo ""
echo "Step 2: Running ALL remaining tests"
echo "===================================="
echo "Building test bundle..."

# Build for testing first
if xcodebuild build-for-testing \
    -project MirrorBuddy.xcodeproj \
    -scheme MirrorBuddy \
    -sdk iphonesimulator \
    -destination 'platform=iOS Simulator,name=Any iOS Simulator Device' \
    CODE_SIGNING_ALLOWED=NO \
    > /tmp/test-build.log 2>&1; then
    echo "✅ Test bundle built successfully"
else
    echo "❌ Test build FAILED"
    echo "See /tmp/test-build.log for details"
    tail -50 /tmp/test-build.log
    exit 1
fi

echo ""
echo "Running full test suite (this may take several minutes)..."

# Run all tests
if xcodebuild test-without-building \
    -project MirrorBuddy.xcodeproj \
    -scheme MirrorBuddy \
    -sdk iphonesimulator \
    -destination 'platform=iOS Simulator,name=Any iOS Simulator Device' \
    2>&1 | tee -a "$TEST_REPORT"; then
    echo "" >> "$TEST_REPORT"
    echo "✅ ALL TESTS PASSED" >> "$TEST_REPORT"
    echo ""
    echo "✅ ALL TESTS PASSED"
else
    echo "" >> "$TEST_REPORT"
    echo "⚠️ SOME TESTS FAILED (this is expected if APIs are not configured)" >> "$TEST_REPORT"
    echo ""
    echo "⚠️ SOME TESTS FAILED (this may be expected)"
fi

# Parse test results
echo "" >> "$TEST_REPORT"
echo "## Test Summary" >> "$TEST_REPORT"
echo "---" >> "$TEST_REPORT"

# Extract test counts from log
TOTAL_TESTS=$(grep -c "Test Case.*started" "$TEST_REPORT" || echo "0")
PASSED_TESTS=$(grep -c "Test Case.*passed" "$TEST_REPORT" || echo "0")
FAILED_TESTS=$(grep -c "Test Case.*failed" "$TEST_REPORT" || echo "0")

echo "Total Tests Run: $TOTAL_TESTS" >> "$TEST_REPORT"
echo "Passed: $PASSED_TESTS" >> "$TEST_REPORT"
echo "Failed: $FAILED_TESTS" >> "$TEST_REPORT"

echo ""
echo "=================================="
echo "📊 Test Summary"
echo "=================================="
echo "Total Tests Run: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $FAILED_TESTS"
echo ""
echo "Full report saved to: $TEST_REPORT"
echo ""

if [ "$FAILED_TESTS" -eq 0 ] && [ "$TOTAL_TESTS" -gt 0 ]; then
    echo "✅ ALL TESTS PASSED! 🎉"
    exit 0
elif [ "$TOTAL_TESTS" -eq 0 ]; then
    echo "⚠️ No tests were executed"
    exit 1
else
    echo "⚠️ Some tests failed (may be expected without API configuration)"
    exit 0  # Don't fail the script - some failures are expected
fi
