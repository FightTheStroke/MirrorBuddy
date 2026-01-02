#!/bin/bash
set -e

echo "=== ConvergioEdu → MirrorBuddy Migration ==="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Dry run mode
DRY_RUN=${DRY_RUN:-false}

if [ "$DRY_RUN" = "true" ]; then
    echo -e "${YELLOW}DRY RUN MODE - No changes will be made${NC}"
    echo ""
fi

echo "Phase 1: Package files"
echo "----------------------"

# package.json - name field
if [ "$DRY_RUN" != "true" ]; then
    sed -i '' 's/"name": "convergio-edu"/"name": "mirrorbuddy"/g' package.json
    sed -i '' 's/ConvergioEdu/MirrorBuddy/g' package.json
    sed -i '' 's|Roberdan/ConvergioEdu|FightTheStroke/MirrorBuddy|g' package.json
    echo -e "${GREEN}Updated: package.json${NC}"
else
    echo "  Would update: package.json"
fi

# Regenerate package-lock.json (don't manually edit)
echo -e "${YELLOW}Note: Run 'npm install' after to update package-lock.json${NC}"

echo ""
echo "Phase 2: Source code (.ts, .tsx)"
echo "---------------------------------"

# Find and replace in source files
find src -type f \( -name "*.ts" -o -name "*.tsx" \) | while read file; do
    if grep -q -E "convergio|Convergio|ConvergioEdu" "$file" 2>/dev/null; then
        if [ "$DRY_RUN" != "true" ]; then
            # Order matters: most specific first
            sed -i '' 's/ConvergioEdu/MirrorBuddy/g' "$file"
            sed -i '' 's/Convergio Edu/MirrorBuddy/g' "$file"
            sed -i '' 's/Convergio-Edu/MirrorBuddy/g' "$file"
            sed -i '' 's/convergio-edu/mirrorbuddy/g' "$file"
            sed -i '' 's/convergio-user-id/mirrorbuddy-user-id/g' "$file"
            sed -i '' 's/Convergio/MirrorBuddy/g' "$file"
            sed -i '' "s/'convergio'/'mirrorbuddy'/g" "$file"
            echo -e "${GREEN}Updated: $file${NC}"
        else
            echo "  Would update: $file"
        fi
    fi
done

echo ""
echo "Phase 3: Documentation (.md)"
echo "----------------------------"

find . -name "*.md" -not -path "./node_modules/*" | while read file; do
    if grep -q -E "convergio|Convergio|ConvergioEdu" "$file" 2>/dev/null; then
        if [ "$DRY_RUN" != "true" ]; then
            sed -i '' 's/ConvergioEdu/MirrorBuddy/g' "$file"
            sed -i '' 's/Convergio Edu/MirrorBuddy/g' "$file"
            sed -i '' 's/Convergio-Edu/MirrorBuddy/g' "$file"
            sed -i '' 's/convergio-edu/mirrorbuddy/g' "$file"
            sed -i '' 's|Roberdan/ConvergioEdu|FightTheStroke/MirrorBuddy|g' "$file"
            sed -i '' 's/Convergio/MirrorBuddy/g' "$file"
            echo -e "${GREEN}Updated: $file${NC}"
        else
            echo "  Would update: $file"
        fi
    fi
done

echo ""
echo "Phase 4: Config files"
echo "---------------------"

# tsconfig.json
if grep -q "ConvergioEdu" tsconfig.json 2>/dev/null; then
    if [ "$DRY_RUN" != "true" ]; then
        sed -i '' 's/ConvergioEdu-Memory/MirrorBuddy-Memory/g' tsconfig.json
        echo -e "${GREEN}Updated: tsconfig.json${NC}"
    else
        echo "  Would update: tsconfig.json"
    fi
fi

# .env.example
if grep -q -i "convergio" .env.example 2>/dev/null; then
    if [ "$DRY_RUN" != "true" ]; then
        sed -i '' 's/convergio/mirrorbuddy/gi' .env.example
        echo -e "${GREEN}Updated: .env.example${NC}"
    else
        echo "  Would update: .env.example"
    fi
fi

# public/sw.js
if [ -f "public/sw.js" ] && grep -q -i "convergio" public/sw.js 2>/dev/null; then
    if [ "$DRY_RUN" != "true" ]; then
        sed -i '' 's/convergio/mirrorbuddy/gi' public/sw.js
        echo -e "${GREEN}Updated: public/sw.js${NC}"
    else
        echo "  Would update: public/sw.js"
    fi
fi

# playwright.config.ts
if grep -q -i "convergio" playwright.config.ts 2>/dev/null; then
    if [ "$DRY_RUN" != "true" ]; then
        sed -i '' 's/convergio/mirrorbuddy/gi' playwright.config.ts
        echo -e "${GREEN}Updated: playwright.config.ts${NC}"
    else
        echo "  Would update: playwright.config.ts"
    fi
fi

echo ""
echo "Phase 5: E2E tests"
echo "------------------"

find e2e -type f -name "*.ts" 2>/dev/null | while read file; do
    if grep -q -E "convergio|Convergio|ConvergioEdu" "$file" 2>/dev/null; then
        if [ "$DRY_RUN" != "true" ]; then
            sed -i '' 's/ConvergioEdu/MirrorBuddy/g' "$file"
            sed -i '' 's/convergio/mirrorbuddy/g' "$file"
            echo -e "${GREEN}Updated: $file${NC}"
        else
            echo "  Would update: $file"
        fi
    fi
done

echo ""
echo "Phase 6: Scripts"
echo "----------------"

find scripts -type f \( -name "*.sh" -o -name "*.ts" -o -name "*.js" \) 2>/dev/null | while read file; do
    # Skip this migration script
    if [[ "$file" == *"migrate-to-mirrorbuddy"* ]]; then
        continue
    fi
    if grep -q -E "convergio|Convergio|ConvergioEdu" "$file" 2>/dev/null; then
        if [ "$DRY_RUN" != "true" ]; then
            sed -i '' 's/ConvergioEdu/MirrorBuddy/g' "$file"
            sed -i '' 's/convergio/mirrorbuddy/g' "$file"
            echo -e "${GREEN}Updated: $file${NC}"
        else
            echo "  Would update: $file"
        fi
    fi
done

echo ""
echo "Phase 7: Prisma schema"
echo "----------------------"

if grep -q -i "convergio" prisma/schema.prisma 2>/dev/null; then
    if [ "$DRY_RUN" != "true" ]; then
        sed -i '' 's/convergio/mirrorbuddy/gi' prisma/schema.prisma
        echo -e "${GREEN}Updated: prisma/schema.prisma${NC}"
    else
        echo "  Would update: prisma/schema.prisma"
    fi
fi

echo ""
echo "Phase 8: Claude config"
echo "----------------------"

find .claude -type f -name "*.md" 2>/dev/null | while read file; do
    if grep -q -E "convergio|Convergio|ConvergioEdu" "$file" 2>/dev/null; then
        if [ "$DRY_RUN" != "true" ]; then
            sed -i '' 's/ConvergioEdu/MirrorBuddy/g' "$file"
            sed -i '' 's/convergio/mirrorbuddy/g' "$file"
            echo -e "${GREEN}Updated: $file${NC}"
        else
            echo "  Would update: $file"
        fi
    fi
done

echo ""
echo "Phase 9: Data files"
echo "-------------------"

find src/data -type f -name "*.ts" 2>/dev/null | while read file; do
    if grep -q -E "convergio|Convergio|ConvergioEdu" "$file" 2>/dev/null; then
        if [ "$DRY_RUN" != "true" ]; then
            sed -i '' 's/ConvergioEdu/MirrorBuddy/g' "$file"
            sed -i '' 's/Convergio Edu/MirrorBuddy/g' "$file"
            sed -i '' 's/Convergio/MirrorBuddy/g' "$file"
            sed -i '' 's/convergio/mirrorbuddy/g' "$file"
            echo -e "${GREEN}Updated: $file${NC}"
        else
            echo "  Would update: $file"
        fi
    fi
done

echo ""
echo "Phase 10: Lib files"
echo "-------------------"

find src/lib -type f -name "*.ts" 2>/dev/null | while read file; do
    if grep -q -E "convergio|Convergio|ConvergioEdu" "$file" 2>/dev/null; then
        if [ "$DRY_RUN" != "true" ]; then
            sed -i '' 's/ConvergioEdu/MirrorBuddy/g' "$file"
            sed -i '' 's/Convergio Edu/MirrorBuddy/g' "$file"
            sed -i '' 's/convergio-user-id/mirrorbuddy-user-id/g' "$file"
            sed -i '' 's/Convergio/MirrorBuddy/g' "$file"
            sed -i '' 's/convergio/mirrorbuddy/g' "$file"
            echo -e "${GREEN}Updated: $file${NC}"
        else
            echo "  Would update: $file"
        fi
    fi
done

echo ""
echo "=========================================="
echo -e "${GREEN}Migration script completed!${NC}"
echo ""
echo "Next steps:"
echo "1. Run: npm install"
echo "2. Run: npm run lint"
echo "3. Run: npm run typecheck"
echo "4. Run: npm run build"
echo "5. Run: npm run test"
echo "6. Review changes: git diff"
echo "7. Commit: git add -A && git commit -m 'chore: rebrand ConvergioEdu to MirrorBuddy'"
echo ""
