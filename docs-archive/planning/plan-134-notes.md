# Plan 134 - Compliance Assoluta - Running Notes

## W1: ESLint Hardening + Documentation Alignment

### T1-01: ESLint rule promotion

- 5 rules promoted `warn` → `error` in `eslint.config.mjs`
- Rules: `detect-possible-timing-attacks`, `no-direct-localstorage`, `require-eventsource-cleanup`, `no-prisma-race-condition`, `require-csrf-mutating-routes`

### T1-02: Fix lint violations

- No violations found after promotion — codebase already compliant

### T1-03: COMPLIANCE-MATRIX.md updates

- Country doc paths: `docs/compliance/countries/` → `docs-archive/compliance-countries/`
- AI Act status: "Complete" → "In Progress (Q2 2026)"
- Documentation status: "Complete" → "Partial - AI Act assessment pending"
- Document version: 1.0 → 1.1

### T1-04: Placeholder replacement (expanded by Thor)

- Original scope: 2 files (AI-ACT-CONFORMITY-ASSESSMENT.md, INCIDENT-RESPONSE-APPENDICES.md)
- Thor identified 21 additional placeholders across 8 more files — all resolved
- Files: AI-RISK-CLASSIFICATION.md, AI-ACT-CONFORMITY-PROCEDURES.md, SCC-VERIFICATION.md, DATA-FLOW-MAPPING.md, SERVICE-COMPLIANCE-AUDIT-2026-01.md, VPAT-ACCESSIBILITY-REPORT.md, dpa/SUPABASE-DPA.md, dpa/RESEND-DPA.md
- All `[To be assigned]` → `Roberto D'Angelo (Interim)`, DPO/Company placeholders → FightTheStroke

### T1-05: Build verification

- Typecheck: PASS (0 errors, required `prisma generate` after rebase)
- Build: PASS

## W2: Release Evidence Pack Script + CI Job

### T2-01: release-evidence-pack.sh

- Created `scripts/release-evidence-pack.sh` (131 lines)
- Collects: git info, lint, typecheck, unit tests, SBOM (cyclonedx), npm audit, CHANGELOG excerpt
- Output: `reports/evidence-pack-{version}-{sha}.md`
- Syntax validated with `bash -n`

### T2-02: CI integration

- Added `tags: ['v*']` to ci.yml push trigger
- Added `release-evidence-pack` job (needs deployment-gate, runs on tag push)
- Artifact retention: 365 days
- Added `release:evidence` npm script in package.json

### T2-03: release-gate.sh integration

- Added evidence pack reminder to release-gate.sh post-success output
