#!/usr/bin/env bash
# Common utilities for performance checks

# Colors
export RED='\033[0;31m'
export GREEN='\033[0;32m'
export YELLOW='\033[1;33m'
export BLUE='\033[0;34m'
export NC='\033[0m'

# Counters (must be exported for subshells)
export FAILED=0
export WARNINGS=0

# Increment failure count
fail() {
    FAILED=$((FAILED + 1))
}

# Increment warning count
warn() {
    WARNINGS=$((WARNINGS + 1))
}

# Check if ripgrep is available
has_rg() {
    command -v rg &> /dev/null
}

# Search files with pattern (uses rg if available, else grep)
search_files() {
    local pattern="$1"
    local path="${2:-src/}"

    if has_rg; then
        rg -l "$pattern" "$path" --glob "*.ts" --glob "*.tsx" 2>/dev/null || true
    else
        grep -rl "$pattern" "$path" --include="*.ts" --include="*.tsx" 2>/dev/null || true
    fi
}

# Check if pattern exists in file
file_contains() {
    local file="$1"
    local pattern="$2"

    if has_rg; then
        rg -q "$pattern" "$file" 2>/dev/null
    else
        grep -q "$pattern" "$file" 2>/dev/null
    fi
}
