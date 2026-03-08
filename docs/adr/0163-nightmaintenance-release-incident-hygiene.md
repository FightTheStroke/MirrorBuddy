# ADR 0163: NightMaintenance Release & Incident Hygiene

Status: Accepted | Date: 08 Mar 2026 | Plan: none

## Context

Night maintenance repeatedly hits the same risks: long CI chains, auth-account drift, stale Sentry noise, and issue/changelog misalignment.

## Decision

Adopt one NightMaintenance workflow: PR checks -> merge -> main CI -> staging-to-production promotion -> prod health/version check -> Sentry unresolved review -> issue/changelog/version sync.

## Consequences

- Positive: Predictable closure with traceable CI/Sentry/issue evidence.
- Negative: Longer single run because all gates are mandatory.

## Enforcement

- Rule: `NightMaintenance requires PR+main CI green before production promotion and issue closure.`
- Check: `gh pr view <n> --json statusCheckRollup && gh run view <run> --json status,conclusion && sentry-cli issues list --query "is:unresolved" && npm audit --audit-level=high`
- Ref: ADR 0070, ADR 0073, ADR 0150
