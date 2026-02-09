---
name: release-gate
description: 'Release readiness verification for MirrorBuddy. Use when preparing releases, checking deployment readiness, or running pre-release validation.'
---

## Release Gate Skill

MirrorBuddy has tiered release gates from fast to comprehensive.

### Gate Levels

| Gate          | Command                     | Checks                          |
| ------------- | --------------------------- | ------------------------------- |
| Fast          | `./scripts/release-fast.sh` | lint+typecheck+unit+smoke+build |
| Full (10/10)  | `./scripts/release-gate.sh` | All quality gates               |
| iOS readiness | `npm run ios:check`         | iOS-specific verification       |

### Pre-Release Checklist

1. **CI passes**: `./scripts/ci-summary.sh --full`
2. **No debt**: `npx tsx scripts/debt-check.ts --summary`
3. **Compliance**: `npx tsx scripts/compliance-check.ts --fail-only`
4. **i18n synced**: `npm run i18n:check`
5. **Health check**: `./scripts/health-check.sh`

### Release Flow

1. Run fast gate first: `./scripts/release-fast.sh`
2. If passes, run full gate: `./scripts/release-gate.sh`
3. Verify CHANGELOG is updated
4. Create release branch if needed
5. Tag and deploy

### Quiet Modes

| Script              | Flag             | Output         |
| ------------------- | ---------------- | -------------- |
| compliance-check.ts | `--fail-only`    | Only FAIL/WARN |
| debt-check.ts       | `--summary`      | Counts only    |
| release-gate.sh     | `--summary-only` | Counts + top 3 |
