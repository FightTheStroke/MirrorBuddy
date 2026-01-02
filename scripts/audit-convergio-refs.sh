#!/bin/bash

echo "=== Audit: ConvergioEdu References ==="
echo ""

cd "$(dirname "$0")/.." || exit 1

echo "By pattern:"
echo "-----------"
printf "convergio-edu: "
rg -c "convergio-edu" --type-add 'code:*.{ts,tsx,json,md}' -t code 2>/dev/null | wc -l | tr -d ' '

printf "ConvergioEdu: "
rg -c "ConvergioEdu" --type-add 'code:*.{ts,tsx,json,md}' -t code 2>/dev/null | wc -l | tr -d ' '

printf "Convergio Edu: "
rg -c "Convergio Edu" --type-add 'code:*.{ts,tsx,json,md}' -t code 2>/dev/null | wc -l | tr -d ' '

printf "Convergio (standalone): "
rg -cw "Convergio" --type-add 'code:*.{ts,tsx,json,md}' -t code 2>/dev/null | rg -v "ConvergioEdu" | wc -l | tr -d ' '

printf "convergio-user-id: "
rg -c "convergio-user-id" --type-add 'code:*.{ts,tsx}' -t code 2>/dev/null | wc -l | tr -d ' '

echo ""
echo "By file type:"
echo "-------------"
printf ".tsx files: "
rg -l "convergio|Convergio" -i -g "*.tsx" 2>/dev/null | wc -l | tr -d ' '

printf ".ts files: "
rg -l "convergio|Convergio" -i -g "*.ts" -g "!*.tsx" 2>/dev/null | wc -l | tr -d ' '

printf ".md files: "
rg -l "convergio|Convergio" -i -g "*.md" 2>/dev/null | wc -l | tr -d ' '

printf ".json files: "
rg -l "convergio|Convergio" -i -g "*.json" 2>/dev/null | wc -l | tr -d ' '

echo ""
echo "Critical files:"
echo "---------------"
for file in package.json src/app/layout.tsx src/app/page.tsx CLAUDE.md README.md; do
    if [ -f "$file" ]; then
        count=$(rg -c -i "convergio" "$file" 2>/dev/null || echo "0")
        if [ "$count" != "0" ]; then
            echo "  $file: $count occurrences"
        fi
    fi
done

echo ""
echo "Files with occurrences (top 30):"
echo "--------------------------------"
rg -l "convergio|Convergio" -i -g "*.{ts,tsx,md,json,sh,prisma}" 2>/dev/null | head -30

echo ""
printf "TOTAL files affected: "
rg -l "convergio|Convergio" -i -g "*.{ts,tsx,md,json,sh,prisma}" 2>/dev/null | wc -l | tr -d ' '
