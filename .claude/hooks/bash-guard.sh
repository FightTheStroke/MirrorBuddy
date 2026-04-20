#!/usr/bin/env bash
# PreToolUse Bash guard for MirrorBuddy.
# Blocks token-wasteful standalone commands and unsafe git pushes.
# Requires `jq` (already in project toolchain).

set -euo pipefail

input="$(cat)"
cmd="$(printf '%s' "$input" | jq -r '.tool_input.command // ""')"

deny() {
  jq -cn --arg reason "$1" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $reason
    }
  }'
  exit 0
}

ask() {
  jq -cn --arg reason "$1" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "ask",
      permissionDecisionReason: $reason
    }
  }'
  exit 0
}

# Truncate heredoc body (everything after `<<` is data, not commands).
# This avoids false positives when commit messages quote forbidden phrases.
cmd_head="${cmd%%<<*}"

# Normalize whitespace
norm="$(printf '%s' "$cmd_head" | tr -s ' \t\n' ' ' | sed 's/^ //;s/ $//')"

# 1) Token-wasteful standalone CI commands (CLAUDE.md rule)
case "$norm" in
  "npm run lint"|"npm run lint --"|"npm run typecheck"|"npm run typecheck --"|"npm run build"|"npm run build --")
    deny "Use ./scripts/ci-summary.sh or npm run ci:summary instead (CLAUDE.md rule). Standalone lint/typecheck/build wastes 8k-100k tokens."
    ;;
  "npm run test:unit"|"npm run test:unit --")
    deny "Standalone test:unit wastes tokens. Use: npm run test:unit -- --reporter=dot, or filter by path (e.g. npm run test:unit -- src/lib/foo)."
    ;;
esac

# 2) gh run view --log = huge token waste
if printf '%s' "$norm" | grep -qE 'gh[[:space:]]+run[[:space:]]+view.*--log'; then
  deny "gh run view --log wastes tokens. Use ~/.claude/scripts/ci-check.sh (project rule: CLAUDE.md ci-verification.md)."
fi

# 3) Dangerous git push flags
if printf '%s' "$norm" | grep -qE 'git[[:space:]]+push.*(--no-verify|(^|[[:space:]])-f([[:space:]]|$)|--force)'; then
  deny "--no-verify / --force on git push forbidden. Fix the root cause (hook failure, merge conflict) instead of bypassing."
fi

# 4) gh pr merge requires explicit user approval
if printf '%s' "$norm" | grep -qE '^gh[[:space:]]+pr[[:space:]]+merge'; then
  ask "Before merging: run 'gh pr checks <n>', paste output, confirm all SUCCESS, and get explicit user 'yes'. Ref: /pr skill."
fi

# Allow otherwise — emit no output (default allow)
exit 0
