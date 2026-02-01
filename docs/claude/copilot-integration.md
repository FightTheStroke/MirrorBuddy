# Copilot CLI Integration with MirrorBuddy

## Overview

GitHub Copilot CLI (`gh copilot`) runs locally and can leverage the same
infrastructure used by Claude Code: plan database, digest scripts, validation
gates. This document explains what works, what doesn't, and how to use it.

## What Copilot CLI CAN Do

| Capability           | How                                             |
| -------------------- | ----------------------------------------------- |
| Read project rules   | `.github/copilot-instructions.md` (auto-loaded) |
| Execute plan tasks   | `plan-db.sh` commands (same SQLite DB)          |
| Run validation       | `./scripts/ci-summary.sh --quick`               |
| Track git status     | `git-digest.sh` (compact JSON)                  |
| Run Thor validation  | `thor-validate.sh {plan_id}`                    |
| Write/edit code      | Standard Copilot capabilities                   |
| Run tests            | `npm run test:unit`, E2E suites                 |
| Conventional commits | Follows rules from copilot-instructions.md      |

## What Copilot CLI CANNOT Do

| Capability         | Why Not              | Workaround                       |
| ------------------ | -------------------- | -------------------------------- |
| Spawn subagents    | No Task tool         | Use bash scripts directly        |
| PreToolUse hooks   | Claude Code-specific | Manual discipline                |
| Skills/commands    | Claude Code-specific | Rules in copilot-instructions.md |
| Dashboard UI       | Separate service     | `plan-db.sh kanban` in terminal  |
| Parallel execution | Single-threaded      | Sequential task execution        |
| Auto-format hooks  | Claude Code-specific | Run prettier/eslint manually     |

## Setup

```bash
# 1. Verify gh + copilot extension
gh --version
gh copilot --version

# 2. Add scripts to PATH (add to ~/.zshrc for persistence)
export PATH="$HOME/.claude/scripts:$PATH"

# 3. Verify access to plan database
plan-db.sh list 1  # should show plans for project 1
```

## Workflow: Executing Plan Tasks

Claude Code creates the plan (waves, tasks, F-xx requirements).
Copilot CLI executes individual tasks.

### Step 1: Get Tasks

```bash
# List tasks for a plan
plan-db.sh list-tasks {plan_id}

# Get full task details
plan-db.sh get-task {task_id}
```

### Step 2: Execute a Task

```bash
# Mark started
plan-db.sh update-task {task_id} in_progress "Started"

# TDD: write failing test first, then implement
# Use Copilot to write code, following copilot-instructions.md rules

# Quick validation during development
./scripts/ci-summary.sh --quick

# Mark done
plan-db.sh update-task {task_id} done "Summary of what was done"
```

### Step 3: Wave Validation

After all tasks in a wave are done:

```bash
# Thor validation (lint + typecheck + build + F-xx check)
thor-validate.sh {plan_id}

# If Thor passes, validate in DB
plan-db.sh validate {plan_id}
```

### Step 4: Git

```bash
# Check status (compact JSON)
git-digest.sh

# Diff summary
diff-digest.sh main {branch}

# Commit (conventional format)
git commit -m "feat: description of change"
```

## Script Reference

### In-Repo Scripts (MirrorBuddy)

| Script                            | Purpose                            |
| --------------------------------- | ---------------------------------- |
| `./scripts/ci-summary.sh`         | Validation (lint/types/build/test) |
| `./scripts/ci-summary.sh --quick` | Fast validation (lint+types only)  |
| `./scripts/ci-summary.sh --full`  | Full validation + unit tests       |
| `./scripts/health-check.sh`       | Full triage (~6 lines)             |
| `./scripts/release-fast.sh`       | Fast release gate                  |
| `./scripts/release-gate.sh`       | Full release gate                  |

### Global Scripts (~/.claude/scripts/)

| Script              | Purpose                            |
| ------------------- | ---------------------------------- |
| `plan-db.sh`        | Plan/task/wave management          |
| `git-digest.sh`     | Compact git status JSON            |
| `diff-digest.sh`    | Compact diff summary               |
| `thor-validate.sh`  | Thor validation gate               |
| `service-digest.sh` | CI/PR/deploy status                |
| `build-digest.sh`   | Build with error capture           |
| `test-digest.sh`    | Test runner with fails-only output |

## Limitations vs Claude Code

1. **No enforcement**: Copilot won't be blocked from running `git diff`
   or `npm run lint` directly. The digest scripts are recommendations,
   not enforced via hooks.

2. **No context isolation**: Copilot doesn't start fresh per task.
   Be mindful of context accumulation on long sessions.

3. **No model routing**: Copilot uses whichever model you select.
   Claude Code routes tasks to Sonnet/Opus based on complexity.

4. **No parallel execution**: Can't spawn multiple agents.
   Execute tasks sequentially within a wave.

## What Copilot Gets Automatically

The `.github/copilot-instructions.md` file includes:

- Coding standards (TS/React style, max 250 lines, TDD, conventional commits)
- Architecture constraints (Prisma, Zustand, no localStorage, CSP, auth)
- Domain rules extracted from `.claude/rules/` (cookies, i18n, e2e, proxy,
  admin, tiers, compliance) — Copilot doesn't read `.claude/rules/` directly
- Documentation format templates (ADR compact format, CHANGELOG)
- Available scripts (ci-summary, release gates, plan-db, git-digest)
- Plan execution workflow (7-step TDD process)
- ADR references for key architectural decisions

This means Copilot has the same knowledge as Claude Code for MirrorBuddy
code and documentation, minus the enforcement layer (hooks).

## Best Practice

Use Claude Code for: planning, architecture, debugging, Thor validation,
multi-wave coordination, security-sensitive tasks.

Use Copilot CLI for: mechanical task execution, single-file changes,
test writing, documentation updates, bulk operations.
