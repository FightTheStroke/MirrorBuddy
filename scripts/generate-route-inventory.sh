#!/usr/bin/env bash
# =============================================================================
# GENERATE ROUTE INVENTORY
# Wrapper script to execute TypeScript route inventory generator
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"
npx tsx scripts/generate-route-inventory.ts
