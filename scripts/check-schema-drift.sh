#!/usr/bin/env bash
set -euo pipefail

# check-schema-drift.sh - Database-free schema drift detection
# Verifies every model/enum in prisma/schema/*.prisma has a matching
# CREATE TABLE/TYPE in prisma/migrations/**/*.sql
#
# Usage: ./scripts/check-schema-drift.sh
# Exit 0 = no drift, Exit 1 = models missing from migrations

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

SCHEMA_DIR="$PROJECT_DIR/prisma/schema"
MIGRATIONS_DIR="$PROJECT_DIR/prisma/migrations"

MISSING=0
CHECKED=0
DETAILS=""

# Check models
while IFS= read -r line; do
	MODEL=$(echo "$line" | sed -n 's/^model \([A-Za-z_][A-Za-z0-9_]*\).*/\1/p')
	[ -z "$MODEL" ] && continue

	CHECKED=$((CHECKED + 1))

	# Check for @@map directive to get actual table name
	FILE=$(grep -rl "^model $MODEL " "$SCHEMA_DIR" 2>/dev/null | head -1)
	TABLE_NAME="$MODEL"
	if [ -n "$FILE" ]; then
		MAPPED=$(awk "/^model $MODEL /,/^}/" "$FILE" | grep '@@map' | sed 's/.*@@map("\([^"]*\)").*/\1/' || true)
		[ -n "$MAPPED" ] && TABLE_NAME="$MAPPED"
	fi

	# Search migration files directly for CREATE TABLE (with or without IF NOT EXISTS)
	if ! grep -rqE "CREATE TABLE (IF NOT EXISTS )?\"$TABLE_NAME\"" "$MIGRATIONS_DIR"/*/migration.sql 2>/dev/null; then
		MISSING=$((MISSING + 1))
		DETAILS="${DETAILS}  MISSING: model $MODEL (table: $TABLE_NAME)\n"
	fi
done < <(grep -rh '^model ' "$SCHEMA_DIR"/*.prisma 2>/dev/null | sort -u)

# Check enums
while IFS= read -r line; do
	ENUM=$(echo "$line" | sed -n 's/^enum \([A-Za-z_][A-Za-z0-9_]*\).*/\1/p')
	[ -z "$ENUM" ] && continue

	CHECKED=$((CHECKED + 1))

	# Search for CREATE TYPE (may be inside DO $$ blocks or standalone)
	if ! grep -rqE "(CREATE TYPE|AS ENUM).*\"$ENUM\"" "$MIGRATIONS_DIR"/*/migration.sql 2>/dev/null; then
		MISSING=$((MISSING + 1))
		DETAILS="${DETAILS}  MISSING: enum $ENUM\n"
	fi
done < <(grep -rh '^enum ' "$SCHEMA_DIR"/*.prisma 2>/dev/null | sort -u)

# Output
if [ "$MISSING" -gt 0 ]; then
	echo "DRIFT DETECTED: $MISSING model(s)/enum(s) missing from migrations (checked $CHECKED)"
	printf "%b" "$DETAILS"
	exit 1
else
	echo "NO DRIFT: all $CHECKED models/enums have matching migrations"
	exit 0
fi
