# ADR 0158: Community Contribution Engine

**Status**: Accepted
**Date**: 2026-02-26
**Plan**: 224
**References**: F-13, F-14, F-18

## Context

MirrorBuddy needs a structured community contribution system that allows students to submit content proposals while preserving platform safety, moderation quality, and transparent rewards. The flow must support end-to-end lifecycle tracking, re-use existing safety modules, and connect approved outcomes to gamification economics through MirrorBucks.

## Decision

### 1. Contribution Lifecycle

Use a four-stage contribution lifecycle with explicit status transitions:

1. **Submit**: user creates a contribution draft (content + type metadata).
2. **Moderate**: automated moderation runs first to detect unsafe or policy-violating content.
3. **Review**: admin reviewers evaluate pending safe contributions and choose approve/reject/flag.
4. **Reward**: approved contributions trigger MirrorBucks reward issuance and audit logging.

### 2. Safety Module Reuse

Community moderation reuses the existing safety stack in `src/lib/safety/` instead of introducing a parallel rule engine. This keeps policy behavior consistent across chat and contribution surfaces, reduces drift risk, and centralizes updates to filtering and bias controls.

### 3. MirrorBucks Integration

Approved contributions grant a configurable MirrorBucks amount based on contribution type and moderation outcome. Reward execution is handled server-side only, with idempotent protection and audit trails to prevent double-credit and support admin traceability.

### 4. Vote Model

Adopt a per-user, per-contribution vote model with a unique constraint `(contributionId, userId)` and allowed vote values `up`/`down`. Votes are advisory quality signals used in admin prioritization and future ranking logic; they do not bypass moderation/review gates.

## Consequences

### Positive

- Clear moderation lifecycle for contribution governance.
- Consistent safety behavior through shared moderation modules.
- Incentive alignment via MirrorBucks reward hooks.
- Normalized vote data for ranking and community health metrics.

### Trade-offs

- Added moderation/review steps increase time-to-publish versus direct posting.
- Reward idempotency and audit requirements add backend complexity.
- Vote signals require anti-abuse monitoring to stay reliable.
