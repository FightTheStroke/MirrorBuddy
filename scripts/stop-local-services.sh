#!/bin/bash
# Stop local PostgreSQL after dev/test sessions to save resources
# Usage: ./scripts/stop-local-services.sh

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

BREW_SERVICE="postgresql@17"
PG_ISREADY="/opt/homebrew/opt/postgresql@17/bin/pg_isready"
[[ ! -x "$PG_ISREADY" ]] && PG_ISREADY="pg_isready"

if "$PG_ISREADY" -h localhost -p 5432 -q 2>/dev/null; then
	echo -e "${YELLOW}Stopping PostgreSQL...${NC}"
	brew services stop "$BREW_SERVICE" 2>/dev/null
	echo -e "${GREEN}✓ PostgreSQL stopped${NC}"
else
	echo -e "${GREEN}✓ PostgreSQL already stopped${NC}"
fi
