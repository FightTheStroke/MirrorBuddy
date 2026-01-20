---
name: app-release-manager-execution
description: Execution phases (3-5) for app-release-manager. Reference module.
model: opus-4.5
---

# Execution Phases - Reference

## MANUAL VALIDATION (after script passes)

### Student Safety (P0)

```bash
npm run test:unit -- src/lib/safety/__tests__/
# ALL 150+ tests must pass
```

### Educational Quality

- [ ] FSRS intervals correct (flashcard review)
- [ ] XP/levels update on progress
- [ ] Mind maps render with hierarchy
- [ ] Knowledge Hub shows content (not JSON)

### Platform Knowledge Base

```bash
grep "lastUpdated" src/data/app-knowledge-base.ts
# Must show current month: '2026-01'
```

## CODE QUALITY SPOT CHECKS

```bash
# localStorage audit (ADR 0015) - NO user data
rg -n "localStorage\." src/ -g '*.ts' -g '*.tsx' | rg -v test

# Empty catch blocks - MUST return 0
rg -n "catch.*{}" src/ -g '*.ts' | rg -v test | wc -l

# Console.log (use logger) - MUST return 0
rg -n "console\.(log|error|warn)" src/ -g '*.ts' | rg -v test | rg -v logger | wc -l
```

## RELEASE ARTIFACTS

Save to `docs/releases/<version>/`:

- [ ] `release-brutal.sh --json` output
- [ ] Coverage report (`coverage/coverage-summary.json`)
- [ ] Playwright report (`playwright-report/`)
- [ ] Security audit (`npm audit`)

## FAILURE PROTOCOL

P0 fail → STOP → Fix → Re-run from start

**No proof = BLOCKED.**
