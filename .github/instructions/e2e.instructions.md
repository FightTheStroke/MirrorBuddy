---
description: 'E2E testing rules: fixtures, wall bypasses, production safety'
applyTo: 'e2e/**/*.ts,e2e/**/*.spec.ts'
---

# E2E Testing

## Production Safety

Blocked in production (`e2e/global-setup.ts` NODE_ENV check) — NO workarounds

## Fixture Imports

NEVER `@playwright/test` — ALWAYS project fixtures:
`./fixtures/base-fixtures` (TOS + walls) | `./fixtures/a11y-fixtures` (a11y helpers) | `./fixtures` (locale) | `./fixtures/auth-fixtures` (trial/admin)

Enforced: ESLint `local-rules/require-e2e-fixtures`

## Wall Bypasses

All chain from `base-fixtures.ts`: `/api/tos` mock | `mirrorbuddy-consent` localStorage | `mirrorbuddy-trial-consent` cookie

## Adding Walls

Update `e2e/global-setup.ts` localStorage | mock API endpoints | run E2E locally

Reference: ADR 0059

<!-- v2.0.0 (2026-02-15): Compact format per ADR 0009 -->
