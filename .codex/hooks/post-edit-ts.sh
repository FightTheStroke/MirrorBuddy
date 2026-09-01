#!/usr/bin/env bash
# PostToolUse Edit|Write notifier.
# When a .ts/.tsx/.prisma/messages/*.json file is edited, remind Claude
# to run `npm run ci:summary` before claiming done.

set -euo pipefail

input="$(cat)"
fp="$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_response.filePath // ""')"

if [ -z "$fp" ]; then
  exit 0
fi

case "$fp" in
  *.ts|*.tsx|*.prisma|*/messages/*/*.json)
    jq -cn --arg note "Reminder: TypeScript/Prisma/i18n file edited ($fp). Before claiming done, run: npm run ci:summary. If i18n changed, also: npm run i18n:check." '{
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: $note
      }
    }'
    ;;
esac

exit 0
