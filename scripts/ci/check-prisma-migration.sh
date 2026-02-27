#!/usr/bin/env bash
# Checks that Prisma schema changes have a corresponding migration.
# Exit 1 if schema modified but no migration added. Exit 0 otherwise.
set -euo pipefail

DIFF_BASE="${1:-origin/main}"

schema_changed=$(git diff "$DIFF_BASE"... --name-only -- 'prisma/schema/*.prisma' 2>/dev/null | wc -l | tr -d ' ')
migration_added=$(git diff "$DIFF_BASE"... --name-only --diff-filter=A -- 'prisma/migrations/*/migration.sql' 2>/dev/null | wc -l | tr -d ' ')

if [[ "$schema_changed" -gt 0 && "$migration_added" -eq 0 ]]; then
  echo "❌ Prisma schema files were modified but no migration was added."
  echo "   Changed schema files:"
  git diff "$DIFF_BASE"... --name-only -- 'prisma/schema/*.prisma'
  echo ""
  echo "   Run: npx prisma migrate dev --name <description>"
  exit 1
fi

if [[ "$schema_changed" -gt 0 ]]; then
  echo "✅ Prisma schema changed with migration included."
else
  echo "✅ No Prisma schema changes detected."
fi
exit 0
