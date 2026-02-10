---
name: app-release-manager-execution
description: Execution phases (3-5) for app-release-manager. Reference module.
model: opus
---

# Execution Phases - Reference

## PHASE 3: PRE-FLIGHT VERCEL CHECKS

Before running release script:

```bash
# Verify Vercel environment variables are set
./scripts/verify-vercel-env.sh
# Must pass all checks (vars, permissions, staging)

# Verify Sentry + Vercel production configuration (NO EXCEPTIONS)
npm run sentry:verify
# This MUST pass before any production release:
# - NEXT_PUBLIC_SENTRY_DSN format and project id
# - SENTRY_ORG / SENTRY_PROJECT / SENTRY_AUTH_TOKEN presence
# - sentry.*.config.ts enabled only for VERCEL_ENV=production
# - /monitoring tunnel route + CSP domain whitelist
# - @sentry/nextjs installed

# Optional: sync local .env → GitHub Actions secrets (only when intentional)
npm run secrets:sync  # uses gh secret set for each KEY=VALUE in .env
```

**Required Vercel env vars**:

- `VERCEL_TOKEN` - Deployment auth
- `VERCEL_PROJECT_ID` - Project identifier
- `VERCEL_ORG_ID` - Organization identifier
- `SUPABASE_CA_CERT` - SSL certificate (ADR 0063)

**SSL Certificate Check**:

```bash
# Verify SUPABASE_CA_CERT exists and is valid
if [ -z "$SUPABASE_CA_CERT" ]; then
  echo "ERROR: SUPABASE_CA_CERT not set"
  exit 1
fi
```

**Outcome**: If any check fails, STOP and fix before proceeding.

---

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
