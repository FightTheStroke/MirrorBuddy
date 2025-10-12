#!/bin/bash
# Daily Standup Report Generator
# Usage: ./scripts/daily-standup.sh

set -e

echo "📊 MirrorBuddy - Daily Standup Report"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📅 Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Overall progress
echo "📈 Overall Progress:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Get task statistics from Task Master (if available)
if command -v tm &> /dev/null; then
    echo "Task Master statistics:"
    tm get-tasks --status all | tail -n 20 || echo "  (Task Master not responding)"
else
    echo "  (Task Master not installed)"
fi

echo ""

# Git status
echo "📝 Git Status:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
git status --short || echo "  (No git changes)"
echo ""

# Recent commits
echo "🔄 Recent Commits (last 5):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
git log --oneline -5 || echo "  (No commits yet)"
echo ""

# Build status
echo "🔨 Build Status:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ -f "MirrorBuddy.xcodeproj" ] || [ -f "MirrorBuddy.xcworkspace" ]; then
    echo "  ✅ Xcode project found"
    # Try to build (if xcodebuild available)
    if command -v xcodebuild &> /dev/null; then
        echo "  Building..."
        xcodebuild -quiet clean build -scheme MirrorBuddy -destination 'platform=iOS Simulator,name=iPhone 15' 2>&1 | tail -n 5 || echo "  ❌ Build failed"
    else
        echo "  (xcodebuild not available, skipping build check)"
    fi
else
    echo "  ⏳ Xcode project not yet created"
fi
echo ""

# Test status
echo "✅ Test Status:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v xcodebuild &> /dev/null; then
    echo "  Running tests..."
    xcodebuild test -scheme MirrorBuddy -destination 'platform=iOS Simulator,name=iPhone 15' 2>&1 | grep -E "Test Suite|passed|failed" | tail -n 10 || echo "  (Tests not yet configured)"
else
    echo "  (xcodebuild not available, skipping tests)"
fi
echo ""

# SwiftLint status
echo "🔍 SwiftLint Status:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v swiftlint &> /dev/null; then
    swiftlint || echo "  ⚠️ SwiftLint warnings/errors found"
else
    echo "  (SwiftLint not installed)"
fi
echo ""

# Blockers
echo "🚧 Blockers & Issues:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  (None reported - update manually if blocked)"
echo ""

# Next steps
echo "🎯 Next Steps:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v tm &> /dev/null; then
    echo "Next task:"
    tm next-task || echo "  (No pending tasks)"
else
    echo "  Check Task Master for next task"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "End of Daily Standup Report"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
