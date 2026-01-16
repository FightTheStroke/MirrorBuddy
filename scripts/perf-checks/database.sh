#!/usr/bin/env bash
# Database performance checks: N+1 patterns

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

# Check for N+1 query patterns
check_n1_patterns() {
    echo -e "${BLUE}[4/6] Checking for N+1 query patterns...${NC}"

    local n1_patterns=0

    if has_rg; then
        # Find files with potential N+1: for/forEach with await prisma
        local n1_files
        n1_files=$(rg -l "for.*\{" src/ -t ts 2>/dev/null | xargs -I{} sh -c 'rg -l "await.*prisma\." "{}" 2>/dev/null' || true)

        for file in $n1_files; do
            # Check if it uses $transaction
            if ! rg -q '\$transaction' "$file" 2>/dev/null; then
                # Check if it's actually a loop with await prisma inside
                if rg -q 'for\s*\(' "$file" 2>/dev/null && rg -q 'await.*prisma\.' "$file" 2>/dev/null; then
                    echo -e "${YELLOW}  ⚠ $file may have N+1 pattern (consider \$transaction)${NC}"
                    n1_patterns=$((n1_patterns + 1))
                fi
            fi
        done
    fi

    if [ $n1_patterns -eq 0 ]; then
        echo -e "${GREEN}✓ No obvious N+1 patterns detected${NC}"
    else
        WARNINGS=$((WARNINGS + n1_patterns))
    fi
}

# Run all database checks
run_database_checks() {
    check_n1_patterns
}
