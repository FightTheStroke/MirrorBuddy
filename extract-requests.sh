#!/bin/bash
PROJ_DIR="$HOME/.claude/projects/-Users-roberdan-GitHub-ConvergioEdu"
OUTPUT="/Users/roberdan/GitHub/ConvergioEdu/roberdanAsksJan5.md"
CUTOFF=$(date -v-1d +%Y-%m-%d 2>/dev/null || date -d "1 day ago" +%Y-%m-%d)

echo "# Richieste di Roberto - 5 Gennaio 2026" > "$OUTPUT"
echo "" >> "$OUTPUT"

find "$PROJ_DIR" -name "*.jsonl" -type f -mtime -1 | while read -r file; do
  grep '"type":"user"' "$file" | python3 -c "
import sys, json
for line in sys.stdin:
    try:
        data = json.loads(line)
        ts = data.get('timestamp', '')[:10]
        msg = data.get('message', {}).get('content', '')
        if msg and len(msg) > 15:
            print('---')
            print(f'**{ts}**')
            print()
            print(msg[:500] + ('...' if len(msg) > 500 else ''))
            print()
    except: pass
" >> "$OUTPUT"
done

echo "Done: $OUTPUT"
