#!/usr/bin/env bash
set -euo pipefail

# smart-test.sh: Run vitest only for staged .ts/.tsx files under src/
# Fast (<15s), exits 0 if no relevant files staged

# Get staged .ts/.tsx files under src/
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '^src/.*\.(ts|tsx)$' || true)

# Exit 0 if no staged source files
if [ -z "$STAGED_FILES" ]; then
	echo "No staged .ts/.tsx files in src/ - skipping tests"
	exit 0
fi

echo "Running tests related to staged files..."
echo "$STAGED_FILES" | head -3
[ "$(echo "$STAGED_FILES" | wc -l)" -gt 3 ] && echo "... and $(($(echo "$STAGED_FILES" | wc -l) - 3)) more"

# Run vitest in related mode for staged files
npx vitest related $STAGED_FILES --run --reporter=dot
