# ADR 0076: Redirect Metadata + E2E Guardrails

## Status

Accepted

## Date

2026-01-26

## Context

The original score-10 plan highlighted several systemic gaps that caused regressions or incomplete compliance across releases:

- **Trial verification + tool gating**: Trial tools must be locked behind verified email, while chat/voice stay active.
- **Tool endpoint hardening**: Auth/ownership checks and rate limits must be consistent across tool endpoints.
- **Compliance + docs alignment**: Legal/compliance documents must match current behavior and system architecture.

CI failures also revealed recurring regressions:

- **A11y document-title**: Redirect-only pages (e.g., `/study-kit`) lacked `metadata`, causing axe `document-title` violations.
- **CSRF ownership in E2E**: `/api/tools/events` requires a valid session ownership check. E2E tests posted events without a trial visitor cookie, causing 401/403 failures.
- **Mobile E2E flakiness**: Mobile tests relied on brittle text selectors and fixed `waitForTimeout` delays, leading to timeouts under CI load.

We need guardrails that keep these issues from returning and ensure CI remains stable.

## Decision

1. **Trial verification + tool gating**
   - Enforce verified email for tool usage in trial mode.
   - Keep chat/voice available for non-verified trial users.

2. **Tool endpoint hardening**
   - Standardize auth + session ownership checks and rate limiting for tool endpoints.
   - Align SSE payloads with tool event contracts.

3. **Compliance + documentation alignment**
   - Keep compliance, privacy, and architecture docs aligned with actual behavior.
   - Update CHANGELOG with user-facing changes.

4. **Redirect metadata lint guard**
   - Add `scripts/lint-redirect-metadata.tsx` to fail when a redirect-only `page.tsx` lacks `export const metadata`.
   - Wire into `npm run lint`, `scripts/pre-release-check.sh`, and `scripts/pre-push-vercel.sh`.

5. **Trial visitor cookie in E2E storage**
   - Add `mirrorbuddy-visitor-id` to `e2e/global-setup.ts` storage state.
   - Ensures `/api/tools/events` ownership checks pass in E2E.

6. **Mobile E2E stability helpers**
   - Add `e2e/mobile/helpers/wait-for-home.ts` and replace `waitForTimeout` with element waits.
   - Prefer structural selectors (`header`, `main`, input placeholders) over text-only `h1` waits.

## Implementation

- **Trial verification**: API + UI flow, gating logic, and session reporting
- **Tool hardening**: Auth/ownership + rate limits + SSE alignment
- **Compliance/docs**: GDPR/COPPA/terms/cookies/architecture alignment and CHANGELOG updates
- **Lint guard script**: `scripts/lint-redirect-metadata.tsx`
- **Lint wiring**:
  - `package.json` → `lint`
  - `scripts/pre-release-check.sh`
  - `scripts/pre-push-vercel.sh`
- **E2E storage state**: `e2e/global-setup.ts`
- **Mobile waits**: `e2e/mobile/*` + helper in `e2e/mobile/helpers/`

## Consequences

### Positive

- Prevents regressions in document-title accessibility checks.
- Stabilizes CSRF ownership checks in E2E tests.
- Reduces flakiness in mobile tests without over-relying on arbitrary timeouts.

### Negative

- Adds a lint step to `npm run lint` and pre-release/pre-push scripts.
- Requires maintaining redirect metadata on any new redirect-only pages.

## Related

- ADR 0059: E2E test setup requirements
- ADR 0075: Cookie handling standards
- ADR 0056: Trial mode architecture
