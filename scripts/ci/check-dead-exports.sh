#!/usr/bin/env bash
# Detects exported symbols in src/lib/ that are never imported by non-test files.
# Exits with warning (exit 0) — informational only, does not block CI.
set -uo pipefail

SEARCH_DIR="${1:-src/lib}"
ORPHANS=0

# Extract all named exports from .ts files (not .test.ts, not __tests__)
while IFS= read -r file; do
  # Get exported function/const/class names
  exports=$(grep -oE 'export (async )?function ([a-zA-Z_]+)|export const ([a-zA-Z_]+)|export class ([a-zA-Z_]+)' "$file" 2>/dev/null | \
    sed -E 's/export (async )?function //; s/export const //; s/export class //' || true)

  for symbol in $exports; do
    # Count imports of this symbol in non-test src/ files
    import_count=$(grep -r --include='*.ts' --include='*.tsx' \
      -l "$symbol" src/ 2>/dev/null | \
      grep -v '__tests__' | grep -v '.test.' | grep -v '.spec.' | \
      grep -v "$file" | wc -l | tr -d ' ' || echo 0)

    if [[ "$import_count" -eq 0 ]]; then
      echo "⚠️  Orphan export: '$symbol' in $file — not imported by any non-test file"
      ORPHANS=$((ORPHANS + 1))
    fi
  done
done < <(find "$SEARCH_DIR" -name '*.ts' ! -name '*.test.*' ! -name '*.spec.*' ! -path '*/__tests__/*' ! -path '*/node_modules/*' 2>/dev/null)

if [[ "$ORPHANS" -gt 0 ]]; then
  echo ""
  echo "Found $ORPHANS orphan export(s). Review for potential dead code."
else
  echo "✅ No orphan exports detected in $SEARCH_DIR."
fi

# Always exit 0 — this is informational, not blocking
exit 0
