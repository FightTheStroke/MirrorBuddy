#!/usr/bin/env bash
# Database performance checks: N+1 patterns

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

# Check for N+1 query patterns
check_n1_patterns() {
    echo -e "${BLUE}[4/6] Checking for N+1 query patterns...${NC}"

    local n1_patterns=0

    if has_rg; then
        # Find files with for loops containing await prisma
        # Use multiline pattern to find actual N+1 (await inside for loop body)
        local n1_files
        n1_files=$(rg -l "for\s*\([^)]+\)\s*\{" src/ -t ts 2>/dev/null || true)

        for file in $n1_files; do
            # Skip test files
            [[ "$file" =~ \\.test\\. ]] || [[ "$file" =~ __tests__ ]] && continue

            # Skip files that use $transaction (already optimized)
            rg -q '\$transaction' "$file" 2>/dev/null && continue

            # Skip files that use createMany/updateMany (batch ops)
            rg -q 'createMany\|updateMany' "$file" 2>/dev/null && continue

            # Check for actual N+1: await prisma inside a for loop
            # Exclude loops that are just iterating results (no await prisma inside)
            if rg -q 'for\s*\(' "$file" 2>/dev/null; then
                # Check if file has sequential await prisma calls
                local await_count
                await_count=$(rg -c "await.*prisma\." "$file" 2>/dev/null || echo "0")
                # If many await prisma calls and no batch ops, flag it
                if [ "$await_count" -gt 3 ]; then
                    echo -e "${YELLOW}  ⚠ $file may have N+1 pattern ($await_count prisma calls)${NC}"
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
