---
name: app-release-manager-execution
description: Execution phases (3-5) for app-release-manager. Reference module.
model: claude-opus-4.6
version: '3.4.0'
---

# Execution Phases - Reference

## PHASE 3: PRE-FLIGHT VERCEL CHECKS

```bash
# Verify Vercel environment variables
./scripts/verify-vercel-env.sh

# Verify Sentry + Vercel production configuration
npm run sentry:verify

# Optional: sync local .env → GitHub Actions secrets
npm run secrets:sync
```

**Required Vercel env vars**: `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_ORG_ID`, `SUPABASE_CA_CERT` (ADR 0063)

**Outcome**: If any check fails, STOP and fix before proceeding.

## PHASE 3.5: INFRA MONITORING CHECK

```bash
# Check for open infra alerts
gh issue list --label "infra-monitor" --state open --json number,title --jq '.[].title'

# Check Azure costs are reasonable
./scripts/azure-costs.sh
```

Open `usage-alert` or `azure-models` issues should be reviewed before release.

## PHASE 4: MANUAL VALIDATION (after script passes)

### Student Safety (P0)

```bash
npm run test:unit -- src/lib/safety/__tests__/
```

### Educational Quality

- [ ] FSRS intervals correct (flashcard review)
- [ ] XP/levels update on progress
- [ ] Mind maps render with hierarchy
- [ ] Knowledge Hub shows content (not JSON)

### Code Quality Spot Checks

```bash
# localStorage audit (ADR 0015) — NO user data in localStorage
rg -n "localStorage\." src/ -g '*.ts' -g '*.tsx' | rg -v test

# Empty catch blocks — MUST return 0
rg -c "catch.*\{\}" src/ -g '*.ts' | rg -v test | rg -v ":0$"

# Console.log in production — MUST return 0
rg -n "console\.(log|error|warn)" src/ -g '*.ts' | rg -v test | rg -v logger
```

## PHASE 5: EVIDENCE PACK + RELEASE

```bash
# Generate evidence
npm run release:evidence

# Verify evidence saved
ls docs/releases/$(cat VERSION)/
```

Save to `docs/releases/<version>/`:

- [ ] `release-brutal.sh --json` output
- [ ] Coverage report (`coverage/coverage-summary.json`)
- [ ] Playwright report (`playwright-report/`)
- [ ] Security audit (`npm audit`)

**Evidence is MANDATORY for minor/major releases.**

## FAILURE PROTOCOL

P0 fail → STOP → Fix → Re-run from start

**No proof = BLOCKED.**
