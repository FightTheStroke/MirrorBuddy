#!/usr/bin/env bash
# Memory leak pattern checks: EventSource and Event Listeners

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

# Check EventSource cleanup patterns
check_eventsource() {
    echo -e "${BLUE}[2/6] Checking EventSource cleanup patterns...${NC}"

    local es_issues=""
    local es_count=0
    local es_file_list

    es_file_list=$(search_files "new EventSource")

    for file in $es_file_list; do
        # Skip test files
        [[ "$file" =~ \.test\. ]] || [[ "$file" =~ __tests__ ]] && continue

        es_count=$((es_count + 1))

        # Check if file has .close() call
        file_contains "$file" "\.close()" && continue

        # Check if utility returns EventSource (cleanup in caller)
        if grep -qE "return\s+(es|eventSource|source)" "$file" 2>/dev/null; then
            local dir has_cleanup=0
            dir=$(dirname "$file")
            for related in $(/usr/bin/find "$dir" -maxdepth 2 \( -name "*.ts" -o -name "*.tsx" \) 2>/dev/null); do
                if [ "$related" != "$file" ] && grep -q "\.close()" "$related" 2>/dev/null; then
                    has_cleanup=1
                    break
                fi
            done
            [ $has_cleanup -eq 1 ] && continue
        fi

        es_issues="$es_issues\n  - $file (missing .close())"
    done

    if [ -n "$es_issues" ]; then
        echo -e "${RED}✗ EventSource without cleanup:${NC}"
        echo -e "$es_issues"
        fail
    else
        echo -e "${GREEN}✓ All $es_count EventSource usages have cleanup${NC}"
    fi
}

# Check event listener cleanup patterns
check_listeners() {
    echo -e "${BLUE}[3/6] Checking event listener cleanup patterns...${NC}"

    local listener_warnings=0
    local add_listener_files

    add_listener_files=$(search_files "addEventListener")

    for file in $add_listener_files; do
        if ! file_contains "$file" "removeEventListener"; then
            # Exclude known acceptable patterns:
            # - Test files and type definitions
            # - Audio generators (ScriptProcessorNode cleanup via disconnect)
            # - Code generators (emit code with addEventListener, not actual listeners)
            # - SSE/stream routes (cleanup via abort signal)
            # - Global singletons (client-error-logger)
            if [[ "$file" =~ \.test\. ]] || [[ "$file" =~ \.d\.ts ]]; then
                continue
            fi
            if [[ "$file" =~ audio/generators ]]; then
                continue  # ScriptProcessorNode cleanup via disconnect()
            fi
            if [[ "$file" =~ demo-.*\.ts ]] || [[ "$file" =~ code-generator ]]; then
                continue  # Code generators emit JS, not real listeners
            fi
            if [[ "$file" =~ /api/.*/route\.ts ]] && file_contains "$file" "abort"; then
                continue  # API routes with abort signal cleanup
            fi
            if [[ "$file" =~ client-error-logger ]]; then
                continue  # Intentional global singleton
            fi

            echo -e "${YELLOW}  ⚠ $file has addEventListener without removeEventListener${NC}"
            listener_warnings=$((listener_warnings + 1))
        fi
    done

    if [ $listener_warnings -eq 0 ]; then
        echo -e "${GREEN}✓ Event listener patterns look good${NC}"
    else
        WARNINGS=$((WARNINGS + listener_warnings))
    fi
}

# Run all memory checks
run_memory_checks() {
    check_eventsource
    check_listeners
}

# Export counters for parent script
export_counters() {
    echo "FAILED=$FAILED"
    echo "WARNINGS=$WARNINGS"
}
