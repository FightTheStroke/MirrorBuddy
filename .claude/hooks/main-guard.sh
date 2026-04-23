#!/usr/bin/env bash
# PreToolUse Edit|Write guard.
# Blocks writes when current branch is `main` — forces worktree/branch discipline.
# Honors escape hatch env MB_ALLOW_MAIN_WRITES=1 (for emergency hotfixes only).

set -euo pipefail

# Escape hatch
if [ "${MB_ALLOW_MAIN_WRITES:-0}" = "1" ]; then
  exit 0
fi

# Extract file path from stdin
input="$(cat)"
fp="$(printf '%s' "$input" | jq -r '.tool_input.file_path // ""')"

# Resolve the repo of the FILE (not CWD) — git worktrees live outside the main
# project dir and have their own HEAD. Without this, edits on a feature branch
# worktree were incorrectly blocked when Claude Code's CWD was on `main`.
lookup_dir=""
if [ -n "$fp" ]; then
  if [ -d "$fp" ]; then
    lookup_dir="$fp"
  else
    lookup_dir="$(dirname "$fp")"
  fi
fi
repo_root="$(git -C "${lookup_dir:-.}" rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$repo_root" ]; then
  exit 0
fi

branch="$(git -C "$repo_root" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")"

# Carve-outs: meta/docs can be edited on main (config, ADRs, CLAUDE.md, .claude/**)
case "$fp" in
  */CLAUDE.md|*/.claude/*|*/docs/*|*.md|*/SETUP.md|*/CHANGELOG.md|*/.env.example|*/.gitignore)
    exit 0
    ;;
esac

if [ "$branch" = "main" ] || [ "$branch" = "master" ]; then
  jq -cn --arg reason "MainGuard: writes on main branch blocked. Create a worktree first (/worktree-start) or a feature branch. Override: MB_ALLOW_MAIN_WRITES=1 (emergency only)." '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $reason
    }
  }'
  exit 0
fi

exit 0
