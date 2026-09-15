#!/usr/bin/env bash
# Common utilities for performance checks
[[ "${_PERF_COMMON_LOADED:-}" == 1 ]] && return 0
_PERF_COMMON_LOADED=1

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
    local status path
    local paths=(apps/web/src packages)
    [[ $# -gt 1 ]] && paths=("$2")
    for path in "${paths[@]}"; do
        if [[ ! -d "$path" ]]; then
            echo "Required source directory missing: $path" >&2
            return 2
        fi
    done
    if has_rg; then
        if rg -l "$pattern" "${paths[@]}" --glob "*.ts" --glob "*.tsx" \
            --glob '!**/node_modules/**' --glob '!**/dist/**' --glob '!**/__tests__/**' \
            --glob '!*.test.*' --glob '!*.spec.*'; then return 0; else status=$?; fi
    else
        if grep -rlE "$pattern" "${paths[@]}" --include="*.ts" --include="*.tsx" \
            --exclude='*.test.*' --exclude='*.spec.*' --exclude-dir=node_modules \
            --exclude-dir=dist --exclude-dir=__tests__; then return 0; else status=$?; fi
    fi
    [[ "$status" -eq 1 ]] && return 0
    echo "Source search failed (exit $status)" >&2
    return "$status"
}

# Check if pattern exists in file
file_contains() {
    local file="$1"
    local pattern="$2"

    local status
    if grep -qE "$pattern" "$file"; then return 0; else status=$?; fi
    [[ "$status" -gt 1 ]] && fail
    return "$status"
}
