---
description: 'E2E testing rules: fixtures, wall bypasses, production safety'
applyTo: 'apps/web/e2e/**/*.ts,apps/web/e2e/**/*.spec.ts'
---

# E2E Testing

## Production Safety

Blocked in production (`apps/web/e2e/global-setup.ts` NODE_ENV check);
setup also requires `TEST_DATABASE_URL` and rejects Supabase database hosts —
NO workarounds. Preserve the separate read-only production smoke safeguards.

## Fixture Imports

NEVER `@playwright/test` — ALWAYS project fixtures:
`./fixtures/base-fixtures` (TOS + walls) | `./fixtures/a11y-fixtures` (a11y helpers) | `./fixtures` (locale) | `./fixtures/auth-fixtures` (trial/admin)

These imports are relative to specs in `apps/web/e2e/`; adjust depth for nested specs.

Enforced: ESLint `local-rules/require-e2e-fixtures`

## Wall Bypasses

Normal page fixtures chain from `base-fixtures.ts` and `fixtures/api-mocks.ts`:
`/api/tos` mock | `mirrorbuddy-consent` / `mirrorbuddy-unified-consent` localStorage |
`mirrorbuddy-trial-consent` cookie. `signedOutPage` intentionally has no wall bypasses.

## Adding Walls

Update `apps/web/e2e/global-setup.ts` storage state and fixture helpers |
mock API endpoints | run E2E locally

Root `test:e2e:i18n` uses `apps/web/playwright.config.iteration.ts`.
`--list` collects importing specs without browser/server/DB execution; collection
does not replace executing the required E2E checks.

Reference: ADR 0059

<!-- v2.0.0 (2026-02-15): Compact format per ADR 0009 -->
