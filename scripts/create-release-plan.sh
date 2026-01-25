#!/bin/bash
# Create a release validation plan from template
# Usage: ./scripts/create-release-plan.sh [VERSION]
#
# If VERSION not provided, reads from package.json

set -e

VERSION=${1:-$(node -p "require('./package.json').version")}
PLAN_NAME="Release-Validation-${VERSION}"

echo "Creating release plan for v${VERSION}..."

# Create plan
PLAN_ID=$(~/.claude/scripts/plan-db.sh create mirrorbuddy "$PLAN_NAME" 2>&1 | head -1)
echo "Plan ID: $PLAN_ID"

# Add waves
W1=$(~/.claude/scripts/plan-db.sh add-wave "$PLAN_ID" "W1-TestFixes" "Fix and verify all tests pass" 2>&1 | head -1)
W2=$(~/.claude/scripts/plan-db.sh add-wave "$PLAN_ID" "W2-Documentation" "Update README badges and CHANGELOG" 2>&1 | head -1)
W3=$(~/.claude/scripts/plan-db.sh add-wave "$PLAN_ID" "W3-Validation" "Final validation and deployment" 2>&1 | head -1)

echo "Waves: W1=$W1, W2=$W2, W3=$W3"

# Add tasks to W1-TestFixes
~/.claude/scripts/plan-db.sh add-task "$W1" T1-01 "Fix any failing unit tests" P0 fix >/dev/null
~/.claude/scripts/plan-db.sh add-task "$W1" T1-02 "Verify all unit tests pass" P0 test >/dev/null
~/.claude/scripts/plan-db.sh add-task "$W1" T1-03 "Run E2E tests CI-compatible" P0 test >/dev/null

# Add tasks to W2-Documentation
~/.claude/scripts/plan-db.sh add-task "$W2" T2-01 "Update README test badge count" P1 docs >/dev/null
~/.claude/scripts/plan-db.sh add-task "$W2" T2-02 "Verify all badges accurate" P1 docs >/dev/null
~/.claude/scripts/plan-db.sh add-task "$W2" T2-03 "Update CHANGELOG.md for v${VERSION}" P1 docs >/dev/null

# Add tasks to W3-Validation
~/.claude/scripts/plan-db.sh add-task "$W3" T3-01 "Run npm run pre-push validation" P0 validation >/dev/null
~/.claude/scripts/plan-db.sh add-task "$W3" T3-02 "Run app-release-manager validation" P0 validation >/dev/null
~/.claude/scripts/plan-db.sh add-task "$W3" T3-03 "Push to GitHub and verify CI green" P0 validation >/dev/null
~/.claude/scripts/plan-db.sh add-task "$W3" T3-04 "Verify Vercel production deployment" P0 validation >/dev/null

echo ""
echo "=========================================="
echo " Release Plan Created: $PLAN_NAME"
echo "=========================================="
echo ""
echo "Plan ID: $PLAN_ID"
echo "Tasks:   10 (3 + 3 + 4)"
echo ""
echo "Next steps:"
echo "  1. Review plan: ~/.claude/scripts/plan-db.sh json $PLAN_ID"
echo "  2. Start:       ~/.claude/scripts/plan-db.sh start $PLAN_ID"
echo "  3. Or use:      /release in Claude Code"
echo ""
