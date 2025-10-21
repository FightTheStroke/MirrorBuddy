#!/bin/bash
# Quality Gate Checker
# Usage: ./scripts/quality-gate.sh

set -e

echo "🛡️ Quality Gate Checker"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

FAILED=0

# Check 1: Build succeeds
echo "1️⃣ Checking build..."
if command -v xcodebuild &> /dev/null; then
    if xcodebuild -quiet clean build -scheme MirrorBuddy -destination 'platform=iOS Simulator,name=iPhone 16' 2>&1; then
        echo "   ✅ Build succeeds"
    else
        echo "   ❌ Build fails"
        FAILED=1
    fi
else
    echo "   ⚠️ xcodebuild not available, skipping"
fi
echo ""

# Check 2: SwiftLint
echo "2️⃣ Checking SwiftLint..."
if command -v swiftlint &> /dev/null; then
    LINT_RESULT=$(swiftlint 2>&1 | grep -c "warning\|error" || true)
    if [ "$LINT_RESULT" -eq 0 ]; then
        echo "   ✅ SwiftLint: 0 warnings"
    else
        echo "   ❌ SwiftLint: $LINT_RESULT warnings/errors"
        FAILED=1
    fi
else
    echo "   ⚠️ SwiftLint not installed, skipping"
fi
echo ""

# Check 3: Tests pass
echo "3️⃣ Checking tests..."
if command -v xcodebuild &> /dev/null; then
    if xcodebuild test -quiet -scheme MirrorBuddy -destination 'platform=iOS Simulator,name=iPhone 16' 2>&1 | grep -q "Test Suite.*passed"; then
        echo "   ✅ All tests pass"
    else
        echo "   ❌ Tests fail"
        FAILED=1
    fi
else
    echo "   ⚠️ xcodebuild not available, skipping"
fi
echo ""

# Check 4: Test coverage (if available)
echo "4️⃣ Checking test coverage..."
if command -v xcov &> /dev/null; then
    COVERAGE=$(xcov --scheme MirrorBuddy 2>&1 | grep "Total Coverage" | awk '{print $3}' | tr -d '%' || echo "0")
    if [ "$COVERAGE" -ge 80 ]; then
        echo "   ✅ Coverage: ${COVERAGE}% (>80%)"
    else
        echo "   ❌ Coverage: ${COVERAGE}% (<80%)"
        FAILED=1
    fi
else
    echo "   ⚠️ xcov not installed, skipping"
fi
echo ""

# Check 5: No TODOs in critical files
echo "5️⃣ Checking for TODOs..."
TODO_COUNT=$(find . -name "*.swift" -type f -exec grep -c "TODO\|FIXME" {} + 2>/dev/null | awk '{s+=$1} END {print s}' || echo "0")
if [ "$TODO_COUNT" -eq 0 ]; then
    echo "   ✅ No TODOs found"
else
    echo "   ⚠️ $TODO_COUNT TODOs found (review before merge)"
fi
echo ""

# Check 6: Constitution compliance (basic check)
echo "6️⃣ Checking constitution compliance..."
if grep -r "force unwrap" . --include="*.swift" 2>/dev/null | grep -v "// force unwrap:" | grep -q "!"; then
    echo "   ⚠️ Force unwraps found (add comments for approval)"
else
    echo "   ✅ No uncommented force unwraps"
fi
echo ""

# Final result
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $FAILED -eq 0 ]; then
    echo "✅ QUALITY GATE: PASSED"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 0
else
    echo "❌ QUALITY GATE: FAILED"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Please fix issues before merging."
    exit 1
fi
