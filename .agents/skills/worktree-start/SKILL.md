---
name: worktree-start
description: Bootstrap isolated git worktree under ./worktrees/<task-id>. Verifies non-empty path, branch created, deps linked. Prevents working directly on main.
allowed-tools:
  - Read
  - Glob
  - Bash
context: inline
user-invocable: true
---

# Worktree Start — MirrorBuddy

Creates isolated worktree. Enforces "never on main" rule.

## Activation

Message contains `/worktree-start` or `/worktree-start {task-id}`.

## Hard Rules

1. NEVER work directly on main branch (MainGuard blocks writes anyway).
2. Worktree path MUST be non-empty before any write/launch.
3. Branch name = `<type>/<task-id>-<slug>` (e.g., `fix/720-csp-nonce`).
4. One worktree per task. Clean up after PR merge.

## Workflow

### Phase 1 — Validate

```bash
test "$(git branch --show-current)" = "main" && echo "on main — will create worktree" || echo "already on branch"
git status --short  # must be clean before worktree from main
```

### Phase 2 — Create

```bash
TASK_ID="${1:-$(date +%s)}"
SLUG="<short-descriptor>"
BRANCH="feat/${TASK_ID}-${SLUG}"
WT_PATH="./worktrees/${TASK_ID}"

mkdir -p ./worktrees
git worktree add -b "$BRANCH" "$WT_PATH" main

# Verify non-empty
test -d "$WT_PATH" && test -n "$(ls "$WT_PATH")" || { echo "ABORT: worktree empty"; exit 1; }
```

### Phase 3 — Bootstrap deps

```bash
cd "$WT_PATH"
npm install --prefer-offline --no-audit
npx prisma generate
```

### Phase 4 — Report

Return to user: worktree path, branch name, next command hint.

## Cleanup (after PR merge)

```bash
git worktree remove ./worktrees/<task-id>
git branch -d <branch>   # only if merged
```

## Forbidden

- working on `main` directly
- deleting active worktrees (check with `git worktree list` first)
- force-removing worktrees with uncommitted changes

## Related

- `/pr` — open PR from worktree
- `/verify-done` — pre-completion check
