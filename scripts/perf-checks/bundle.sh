#!/usr/bin/env bash
# Bundle size and lazy loading checks

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

# Check avatar image formats (must be WebP)
check_images() {
    echo -e "${BLUE}[1/6] Checking avatar image formats...${NC}"

    local non_webp
    non_webp=$(find public/maestri -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" \) 2>/dev/null)

    if [ -n "$non_webp" ]; then
        echo -e "${RED}✗ Found non-WebP avatars (should be converted):${NC}"
        echo "$non_webp"
        fail
    else
        local webp_count
        webp_count=$(find public/maestri -name "*.webp" 2>/dev/null | grep -c . || echo 0)
        echo -e "${GREEN}✓ All $webp_count avatars are WebP format${NC}"
    fi
}

# Check bundle size
check_bundle_size() {
    echo -e "${BLUE}[5/6] Checking bundle size...${NC}"

    if [ -d ".next" ]; then
        local large_chunks
        large_chunks=$(find .next/static/chunks -name "*.js" -size +500k 2>/dev/null | grep -v "node_modules" | head -5)

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
            app_size=$(du -sh .next/static/chunks 2>/dev/null | cut -f1)
            echo -e "${GREEN}✓ No excessively large app chunks (total: $app_size)${NC}"
        fi
    else
        echo -e "${YELLOW}  ⚠ No .next directory (run build first)${NC}"
    fi
}

# Check lazy loading for heavy dependencies
check_lazy_loading() {
    echo -e "${BLUE}[6/6] Checking lazy loading for heavy dependencies...${NC}"

    local lazy_issues=0

    # Check KaTeX - should be dynamically imported
    local katex_static
    if has_rg; then
        katex_static=$(rg "from 'katex'" src/ --glob "*.ts" --glob "*.tsx" 2>/dev/null | grep -v dynamic | grep -v "// lazy" || true)
    else
        katex_static=$(grep -r "from 'katex'" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v dynamic | grep -v "// lazy" || true)
    fi

    if [ -n "$katex_static" ]; then
        echo -e "${RED}✗ KaTeX imported statically (should use dynamic import):${NC}"
        echo "$katex_static"
        lazy_issues=$((lazy_issues + 1))
    fi

    # Check Recharts lazy loading
    local recharts_files recharts_not_lazy=""
    recharts_files=$(search_files "from 'recharts'")

    for file in $recharts_files; do
        local basename is_lazy
        basename=$(basename "$file" | sed 's/\.tsx$//' | sed 's/\.ts$//')

        if has_rg; then
            is_lazy=$(rg "import\(['\"].*${basename}" src/ --glob "*.ts" --glob "*.tsx" 2>/dev/null || true)
        else
            is_lazy=$(grep -rE "import\(['\"].*${basename}" src/ --include="*.ts" --include="*.tsx" 2>/dev/null || true)
        fi

        [ -z "$is_lazy" ] && recharts_not_lazy="$recharts_not_lazy\n  - $file"
    done

    if [ -n "$recharts_not_lazy" ]; then
        echo -e "${RED}✗ Recharts components not lazy-loaded:${NC}"
        echo -e "$recharts_not_lazy"
        lazy_issues=$((lazy_issues + 1))
    else
        local recharts_count
        recharts_count=$(echo "$recharts_files" | grep -c . 2>/dev/null || echo 0)
        echo -e "${GREEN}✓ All $recharts_count Recharts components are lazy-loaded${NC}"
    fi

    if [ $lazy_issues -eq 0 ]; then
        echo -e "${GREEN}✓ Heavy dependencies are lazy-loaded${NC}"
    else
        fail
    fi
}

# Run all bundle checks
run_bundle_checks() {
    check_images
    check_bundle_size
    check_lazy_loading
}
