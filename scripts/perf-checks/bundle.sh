#!/usr/bin/env bash
# Bundle size and lazy loading checks

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

# Check avatar image formats (must be WebP)
check_images() {
    echo -e "${BLUE}[1/6] Checking avatar image formats...${NC}"

    local non_webp
    if ! non_webp=$(/usr/bin/find apps/web/public/maestri -type f \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" \)); then
        echo "Avatar inventory failed"
        fail
        return 0
    fi

    if [ -n "$non_webp" ]; then
        echo -e "${RED}✗ Found non-WebP avatars (should be converted):${NC}"
        echo "$non_webp"
        fail
    else
        local webp_count
        local webp_files
        if ! webp_files=$(/usr/bin/find apps/web/public/maestri -type f -iname "*.webp"); then
            fail
            return 0
        fi
        webp_count=$(printf '%s\n' "$webp_files" | awk 'NF {n++} END {print n+0}')
        if [[ "$webp_count" -eq 0 ]]; then
            echo "No WebP avatars found in required application directory"
            fail
            return 0
        fi
        echo -e "${GREEN}✓ All $webp_count avatars are WebP format${NC}"
    fi
}

# Check bundle size
check_bundle_size() {
    echo -e "${BLUE}[5/6] Checking bundle size...${NC}"

    if [ -d "apps/web/.next/static/chunks" ]; then
        local large_chunks
        if ! large_chunks=$(/usr/bin/find apps/web/.next/static/chunks -name "*.js" -size +500k ! -path "*/node_modules/*"); then
            fail
            return 0
        fi

        if [ -n "$large_chunks" ]; then
            echo -e "${YELLOW}  ⚠ Large app chunks found (>500KB):${NC}"
            for chunk in $large_chunks; do
                local size
                size=$(du -h "$chunk" | cut -f1)
                echo "    - $chunk ($size)"
            done
            warn
        else
            local app_size
            if ! app_size=$(du -sh apps/web/.next/static/chunks | cut -f1); then
                fail
                return 0
            fi
            echo -e "${GREEN}✓ No excessively large app chunks (total: $app_size)${NC}"
        fi
    else
        echo -e "${RED}  Missing apps/web/.next/static/chunks (run build first)${NC}"
        fail
    fi
}

# Check lazy loading for heavy dependencies
check_lazy_loading() {
    echo -e "${BLUE}[6/6] Checking lazy loading for heavy dependencies...${NC}"
    if ! "$SCRIPT_DIR/../../node_modules/.bin/tsx" "$SCRIPT_DIR/../check-lazy-loading.ts"; then
        fail
    fi
    return 0
}

# Run all bundle checks
run_bundle_checks() {
    check_images
    check_bundle_size
    check_lazy_loading
}
