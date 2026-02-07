# Release Compliance Charter

**Version**: 1.0
**Last Updated**: 2026-02-07
**Owner**: Roberto D'Angelo (Interim Compliance Officer)
**Status**: Active

---

## Purpose

This charter defines the compliance gates that MUST pass before any MirrorBuddy release reaches production. It ensures regulatory obligations (GDPR, EU AI Act, COPPA, WCAG 2.1 AA, Italian Law 132/2025) are verified at every release.

---

## Pre-Release Compliance Gates

### Gate 1: Automated Source Verification

**Tool**: `scripts/compliance-audit-source-verification.ts`
**Enforced by**: `scripts/release-gate.sh` (Phase 5)
**Criteria**: All 17 compliance checks PASS (zero FAIL allowed)

### Gate 2: CI Pipeline Checks

**Tool**: `.github/workflows/ci.yml` — deployment-gate job
**Criteria**: All blocking jobs succeed, including:

- `security` (dependency audit, secret scanning)
- `compliance-e2e` (GDPR consent, cookie, data deletion E2E tests)
- `accessibility-tests` (WCAG 2.1 AA automated checks)
- `sentry-config` (error monitoring pre-deploy validation)

### Gate 3: Documentation Completeness

**Criteria**: The following documents are current (within quarterly review cycle):

- DPIA (`docs/compliance/DPIA.md`)
- AI Policy (`docs/compliance/AI-POLICY.md`)
- Model Card (`docs/compliance/MODEL-CARD.md`)
- Risk Management (`docs/compliance/AI-RISK-MANAGEMENT.md`)
- Data Retention Policy (`docs/compliance/DATA-RETENTION-POLICY.md`)
- COMPLIANCE-MATRIX (`docs/compliance/COMPLIANCE-MATRIX.md`)

### Gate 4: Safety Guardrails

**Criteria**: All safety systems operational:

- Bias detector active (`src/lib/safety/bias-detector.ts`)
- Content filtering enabled
- No PII in vector database embeddings
- Human fallback escalation configured

---

## Release Types and Required Gates

| Release Type  | Gate 1 | Gate 2 | Gate 3 | Gate 4 |
| ------------- | ------ | ------ | ------ | ------ |
| Hotfix        | YES    | YES    | NO     | YES    |
| Patch release | YES    | YES    | YES    | YES    |
| Minor release | YES    | YES    | YES    | YES    |
| Major release | YES    | YES    | YES    | YES    |

---

## Escalation

If a gate fails and the release is urgent:

1. Document the failure and justification in the PR description
2. Obtain explicit approval from the Compliance Officer
3. Create a follow-up issue to resolve the failure within 72 hours
4. No production release without at least Gate 1 + Gate 4 passing

---

## Review Schedule

- **Quarterly**: Full charter review and gate effectiveness assessment
- **Per release**: Automated gate execution via `release-gate.sh`
- **Annual**: External compliance audit alignment check

**Next Review**: 2026-04-27

---

## References

- [COMPLIANCE-MATRIX](./COMPLIANCE-MATRIX.md)
- [DPIA](./DPIA.md)
- [AI-POLICY](./AI-POLICY.md)
- [Release Gate Script](../../scripts/release-gate.sh)
- ADR 0004 (Safety Guardrails)
