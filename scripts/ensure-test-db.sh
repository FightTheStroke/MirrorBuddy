#!/bin/bash
# Ensure local PostgreSQL is running for E2E tests
# Prevents test failures when database is not available
#
# Usage:
#   ./scripts/ensure-test-db.sh        # Check and start if needed
#   ./scripts/ensure-test-db.sh --check # Check only, exit 1 if not running

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# PostgreSQL paths (Homebrew on macOS)
PG_ISREADY="/opt/homebrew/opt/postgresql@17/bin/pg_isready"
BREW_SERVICE="postgresql@17"

# Test database config
TEST_DB_HOST="${TEST_DB_HOST:-localhost}"
TEST_DB_PORT="${TEST_DB_PORT:-5432}"
TEST_DB_NAME="${TEST_DB_NAME:-mirrorbuddy_test}"

check_only=false
if [[ "${1:-}" == "--check" ]]; then
	check_only=true
fi

# Check if pg_isready exists
if [[ ! -x "$PG_ISREADY" ]]; then
	# Try finding it in PATH
	if command -v pg_isready &>/dev/null; then
		PG_ISREADY="pg_isready"
	else
		echo -e "${RED}ERROR: pg_isready not found${NC}"
		echo "Install PostgreSQL: brew install postgresql@17"
		exit 1
	fi
fi

echo "Checking PostgreSQL status..."

# Check if PostgreSQL is running
if $PG_ISREADY -h "$TEST_DB_HOST" -p "$TEST_DB_PORT" -q 2>/dev/null; then
	echo -e "${GREEN}✓ PostgreSQL is running on $TEST_DB_HOST:$TEST_DB_PORT${NC}"
else
	echo -e "${YELLOW}PostgreSQL is not running${NC}"

	if $check_only; then
		echo -e "${RED}✗ PostgreSQL required for tests${NC}"
		exit 1
	fi

	# Try to start it
	echo "Attempting to start PostgreSQL..."

	if command -v brew &>/dev/null; then
		if brew services start "$BREW_SERVICE" 2>/dev/null; then
			echo "Waiting for PostgreSQL to start..."
			sleep 3

			if $PG_ISREADY -h "$TEST_DB_HOST" -p "$TEST_DB_PORT" -q 2>/dev/null; then
				echo -e "${GREEN}✓ PostgreSQL started successfully${NC}"
			else
				echo -e "${RED}✗ PostgreSQL failed to start${NC}"
				exit 1
			fi
		else
			echo -e "${RED}✗ Could not start PostgreSQL via Homebrew${NC}"
			echo "Try manually: brew services start $BREW_SERVICE"
			exit 1
		fi
	else
		echo -e "${RED}✗ Cannot auto-start PostgreSQL (Homebrew not found)${NC}"
		echo "Start PostgreSQL manually before running tests"
		exit 1
	fi
fi

# Check if test database exists
echo "Checking test database '$TEST_DB_NAME'..."

CREATEDB="/opt/homebrew/opt/postgresql@17/bin/createdb"
if [[ ! -x "$CREATEDB" ]]; then
	if command -v createdb &>/dev/null; then
		CREATEDB="createdb"
	else
		echo -e "${YELLOW}Warning: createdb not found, skipping database creation check${NC}"
		exit 0
	fi
fi

PSQL="/opt/homebrew/opt/postgresql@17/bin/psql"
if [[ ! -x "$PSQL" ]]; then
	if command -v psql &>/dev/null; then
		PSQL="psql"
	else
		echo -e "${YELLOW}Warning: psql not found, skipping database creation check${NC}"
		exit 0
	fi
fi

# Check if database exists
if $PSQL -h "$TEST_DB_HOST" -p "$TEST_DB_PORT" -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$TEST_DB_NAME"; then
	echo -e "${GREEN}✓ Test database '$TEST_DB_NAME' exists${NC}"
else
	echo "Creating test database '$TEST_DB_NAME'..."
	if $CREATEDB -h "$TEST_DB_HOST" -p "$TEST_DB_PORT" "$TEST_DB_NAME" 2>/dev/null; then
		echo -e "${GREEN}✓ Test database created${NC}"

		# Run migrations on new database
		echo "Applying migrations to test database..."
		cd "$PROJECT_ROOT"
		DATABASE_URL="postgresql://$USER@$TEST_DB_HOST:$TEST_DB_PORT/$TEST_DB_NAME" \
			DIRECT_URL="postgresql://$USER@$TEST_DB_HOST:$TEST_DB_PORT/$TEST_DB_NAME" \
			npx prisma migrate deploy 2>/dev/null || true
		echo -e "${GREEN}✓ Migrations applied${NC}"
	else
		echo -e "${RED}✗ Could not create test database${NC}"
		exit 1
	fi
fi

# Verify pgvector extension
echo "Checking pgvector extension..."
if $PSQL -h "$TEST_DB_HOST" -p "$TEST_DB_PORT" -d "$TEST_DB_NAME" -tAc "SELECT 1 FROM pg_extension WHERE extname='vector'" 2>/dev/null | grep -q 1; then
	echo -e "${GREEN}✓ pgvector extension installed${NC}"
else
	echo "Installing pgvector extension..."
	$PSQL -h "$TEST_DB_HOST" -p "$TEST_DB_PORT" -d "$TEST_DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS vector" 2>/dev/null || true
	echo -e "${GREEN}✓ pgvector extension installed${NC}"
fi

echo ""
echo -e "${GREEN}Test database ready!${NC}"
echo "TEST_DATABASE_URL=postgresql://$USER@$TEST_DB_HOST:$TEST_DB_PORT/$TEST_DB_NAME"
