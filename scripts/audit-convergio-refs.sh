#!/bin/bash

echo "=== Audit: MirrorBuddy References ==="
echo ""

cd "$(dirname "$0")/.." || exit 1

echo "By pattern:"
echo "-----------"
printf "mirrorbuddy-edu: "
rg -c "mirrorbuddy-edu" --type-add 'code:*.{ts,tsx,json,md}' -t code 2>/dev/null | wc -l | tr -d ' '

printf "MirrorBuddy: "
rg -c "MirrorBuddy" --type-add 'code:*.{ts,tsx,json,md}' -t code 2>/dev/null | wc -l | tr -d ' '

printf "Convergio Edu: "
rg -c "Convergio Edu" --type-add 'code:*.{ts,tsx,json,md}' -t code 2>/dev/null | wc -l | tr -d ' '

printf "Convergio (standalone): "
rg -cw "Convergio" --type-add 'code:*.{ts,tsx,json,md}' -t code 2>/dev/null | rg -v "MirrorBuddy" | wc -l | tr -d ' '

printf "mirrorbuddy-user-id: "
rg -c "mirrorbuddy-user-id" --type-add 'code:*.{ts,tsx}' -t code 2>/dev/null | wc -l | tr -d ' '

echo ""
echo "By file type:"
echo "-------------"
printf ".tsx files: "
rg -l "mirrorbuddy|Convergio" -i -g "*.tsx" 2>/dev/null | wc -l | tr -d ' '

printf ".ts files: "
rg -l "mirrorbuddy|Convergio" -i -g "*.ts" -g "!*.tsx" 2>/dev/null | wc -l | tr -d ' '

printf ".md files: "
rg -l "mirrorbuddy|Convergio" -i -g "*.md" 2>/dev/null | wc -l | tr -d ' '

printf ".json files: "
rg -l "mirrorbuddy|Convergio" -i -g "*.json" 2>/dev/null | wc -l | tr -d ' '

echo ""
echo "Critical files:"
echo "---------------"
for file in package.json src/app/layout.tsx src/app/page.tsx CLAUDE.md README.md; do
    if [ -f "$file" ]; then
        count=$(rg -c -i "mirrorbuddy" "$file" 2>/dev/null || echo "0")
        if [ "$count" != "0" ]; then
            echo "  $file: $count occurrences"
        fi
    fi
done

echo ""
echo "Files with occurrences (top 30):"
echo "--------------------------------"
rg -l "mirrorbuddy|Convergio" -i -g "*.{ts,tsx,md,json,sh,prisma}" 2>/dev/null | head -30

echo ""
printf "TOTAL files affected: "
rg -l "mirrorbuddy|Convergio" -i -g "*.{ts,tsx,md,json,sh,prisma}" 2>/dev/null | wc -l | tr -d ' '
