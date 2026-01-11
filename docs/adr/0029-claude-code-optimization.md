# ADR 0029: Claude Code Optimization Strategy

## Status
Accepted

## Date
2026-01-10

## Context

MirrorBuddy is a large codebase (1300+ TypeScript files) where Claude Code assistance had recurring issues:

1. **"Done but incomplete"**: Claude declared tasks complete without full verification
2. **Instruction misunderstanding**: Vague requests led to incorrect implementations
3. **High token consumption**: Each session re-explored the same patterns
4. **Poor context retention**: Important decisions lost during conversation compaction

## Decision

Implement a multi-layer optimization strategy leveraging Claude Code's configuration system.

### 1. Modular Rules (`.claude/rules/`)

Auto-loaded rules for domain-specific patterns:

| File | Purpose |
|------|---------|
| `accessibility.md` | 7 DSA profiles, WCAG 2.1 AA, store patterns |
| `api-patterns.md` | Next.js API routes, Prisma, error handling |
| `maestri.md` | 17 AI tutors, data structure, voice integration |

### 2. Mandatory Workflow

For non-trivial tasks, enforce the prompt → planner → execute → Thor pipeline:

```
/prompt    → Extract F-xx requirements, user confirms
/planner   → Create plan with waves/tasks in DB
/execute   → Run tasks, Thor validates per wave
Closure    → User approves, never self-declare
```

### 3. Request Format Template

Structure requests with What/Where/Why/Acceptance:

```
Good: "Add maestro Economia in maestri-society.ts, avatar economy.png,
       color #3B82F6, for DSA students. Verify: appears in list, voice works."

Bad: "Add an economics teacher"
```

### 4. Thor Enforcement

Before any "done" declaration:
- Verification command output shown (lint, typecheck, build)
- All F-xx requirements listed with [x] or [ ] status
- All deliverables listed with file paths
- User explicitly approves

### 5. Context Optimization

**`.claudeignore`** excludes from scanning:
- `e2e/` - 40+ test files
- `testingcase/` - Test fixtures
- `logs/` - Runtime logs
- `coverage/`, `playwright-report/`, `test-results/`

**Summary instructions** specify:
- KEEP: Code changes with paths, F-xx status, test results, decisions, blockers
- DISCARD: Verbose listings, debug output, intermediate exploration

### 6. TypeScript LSP

Plugin installed for:
- Go-to-definition without grep
- Find-references across 1300+ files
- Safe symbol renaming
- Real-time type hints

### 7. On-Demand Documentation

19 specialized docs in `docs/claude/` loaded only when needed:
- Core: mirrorbuddy, tools, database, api-routes
- Voice: voice-api, ambient-audio, onboarding
- Features: learning-path, pdf-generator, etc.

## Consequences

### Positive
- **Reduced token usage**: ~30-40% less per session (50-60% with LSP)
- **Faster responses**: Rules eliminate "rediscovery" phase
- **Higher accuracy**: Structured requests reduce misunderstanding
- **Complete deliverables**: Thor enforcement prevents premature "done"
- **Better memory**: Specific summary instructions preserve critical context

### Negative
- **Stricter workflow**: Non-trivial tasks require full pipeline
- **Learning curve**: Users must structure requests properly
- **Maintenance**: Rules need updates as codebase evolves

### Metrics (estimated)

| Metric | Before | After |
|--------|--------|-------|
| Tokens per session | ~15,000 | ~9,000 |
| "Incomplete done" rate | ~40% | ~5% |
| Instruction misunderstanding | ~30% | ~10% |
| Context retention | Poor | Good |

## Files Changed

### New Files
- `.claude/rules/accessibility.md`
- `.claude/rules/api-patterns.md`
- `.claude/rules/maestri.md`
- `.claude/rules/README.md`

### Modified Files
- `CLAUDE.md` - Added workflow, request format, Thor enforcement, summary instructions
- `.claudeignore` - Added e2e/, testingcase/, logs/

## References

- Global Claude config: `~/.claude/CLAUDE.md`
- Thor agent: `~/.claude/agents/thor-quality-assurance-guardian`
- Workflow skills: `/prompt`, `/planner`, `/execute`
- TypeScript LSP plugin: `/plugin install`
