# ADR 0136 - Compliance Absolute Charter

**Status**: Accepted
**Date**: 2026-02-07
**Plan**: 134 - Compliance-Assoluta

## Context

MirrorBuddy compliance documentation had accumulated technical debt:

- 5 ESLint security rules at `warn` instead of `error`
- 21+ placeholder values (`[To be assigned]`, `[DPO name]`, etc.) across 10 compliance docs
- COMPLIANCE-MATRIX referenced archived country doc paths incorrectly
- AI Act status marked "Complete" despite pending conformity assessment
- No automated release evidence collection for audit trail

## Decision

### W1: ESLint Hardening + Documentation Alignment

1. Promote 5 ESLint rules to `error`: `detect-possible-timing-attacks`, `no-direct-localstorage`, `require-eventsource-cleanup`, `no-prisma-race-condition`, `require-csrf-mutating-routes`
2. Update COMPLIANCE-MATRIX.md country doc paths to `docs-archive/compliance-countries/`
3. Correct AI Act status to "In Progress (Q2 2026)"
4. Replace all placeholder names/emails with Roberto D'Angelo (Interim) / FightTheStroke across all compliance docs

### W2: Release Evidence Pack

1. Create `scripts/release-evidence-pack.sh` collecting lint, typecheck, unit tests, SBOM, npm audit, CHANGELOG into a single audit trail document
2. Add CI job triggered on tag push (`v*`) with 365-day artifact retention
3. Add `npm run release:evidence` script

## Consequences

- ESLint now **blocks** on security/compliance violations (no more silent warnings)
- All compliance docs have real contact information for audit readiness
- Tagged releases automatically generate evidence packs for regulatory compliance
- Release gate reminds maintainers to generate evidence packs

## References

- F-01: ESLint hardening
- F-02: COMPLIANCE-MATRIX accuracy
- F-03: Placeholder elimination
- F-04: Release evidence pack
- EU AI Act 2024/1689
- Italian Law 132/2025
