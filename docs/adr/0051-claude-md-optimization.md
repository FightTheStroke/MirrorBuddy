# ADR 0051: CLAUDE.md Optimization

## Status: Accepted

## Date: 2026-01-18

## Context

The project's `CLAUDE.md` file had grown to 272 lines, consuming significant context window tokens on every Claude Code session. Research into 2026 best practices revealed:

1. **Token competition**: Every line in CLAUDE.md competes with actual work context
2. **~50 instruction limit**: Claude Code's system prompt already contains ~50 instructions; additional instructions should be minimal
3. **One-time vs. session**: Setup instructions (Docker, database) don't need loading every session
4. **Nested CLAUDE.md discouraged**: Known bugs with subdirectory loading; `.claude/rules/` pattern is more reliable

Sources consulted:
- [Anthropic Memory Docs](https://code.claude.com/docs/en/memory)
- [CLAUDE.md Best Practices - Arize](https://arize.com/blog/claude-md-best-practices-learned-from-optimizing-claude-code-with-prompt-learning/)
- [Builder.io Complete Guide](https://www.builder.io/blog/claude-md-guide)

## Decision

### 1. Optimize CLAUDE.md from 272 to ~150 lines

**Removed sections:**

| Section | Lines | Reason |
|---------|-------|--------|
| Database Setup | 14 | One-time setup, moved to docs/setup/ |
| Docker Deployment | 9 | One-time setup, moved to docs/setup/ |
| Tool Plugin example code | 12 | Already documented in @docs/claude/tool-plugins.md |
| LSP BAD/GOOD example | 9 | Table instruction sufficient |
| Optimization Health Check | 19 | Moved to script |
| Summary Instructions | 17 | Internal Claude instructions, not for coding |
| Operations table | 18 | Moved to .claude/rules/operations.md |

### 2. Create .claude/rules/operations.md

New modular rule file containing:
- Health endpoints
- Grafana Cloud configuration
- Runbook references
- Observability quick reference

### 3. Do NOT create per-folder CLAUDE.md files

Reasons:
- Known bug: [GitHub #2571](https://github.com/anthropics/claude-code/issues/2571) - inconsistent loading
- `.claude/rules/` already provides modular organization
- MirrorBuddy is not a monorepo (main use case for nested CLAUDE.md)

## Consequences

### Positive
- **~45% token reduction** per session (~120 lines removed)
- Faster context loading
- Cleaner separation: session instructions vs. one-time setup
- Modular rules easier to maintain

### Negative
- Setup instructions now in separate location (minor inconvenience for new devs)
- Need to reference `docs/setup/` for initial project setup

### Neutral
- No change to existing `.claude/rules/` structure
- On-demand docs pattern unchanged

## File Changes

```
CLAUDE.md                           # 272 → ~150 lines
.claude/rules/operations.md         # NEW: observability, health, runbooks
docs/setup/database.md              # NEW: PostgreSQL + pgvector setup
docs/setup/docker.md                # NEW: Docker deployment
```

## Metrics

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| CLAUDE.md lines | 272 | 120 | **-56%** |
| .claude/rules/ lines | 308 | 369 | +20% |
| **Net auto-loaded** | 580 | 489 | **-16%** |

Note: One-time setup docs moved to `docs/setup/` (loaded on-demand only).

## Review Cadence

Per best practices, review CLAUDE.md quarterly:
```bash
# Ask Claude to review
"Review CLAUDE.md and suggest improvements for conciseness"
```
