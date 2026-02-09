---
description: 'E2E testing rules: fixtures, wall bypasses, production safety'
applyTo: 'e2e/**/*.ts,e2e/**/*.spec.ts'
---

# E2E Testing Rules

## Production Safety (CRITICAL)

E2E tests blocked in production (`e2e/global-setup.ts` NODE_ENV check). No workarounds.

## Fixture Imports (MANDATORY)

NEVER import from `@playwright/test`. ALWAYS use project fixtures:

```typescript
// Base (auto TOS mock + wall bypasses)
import { test, expect } from './fixtures/base-fixtures';

// Accessibility
import { test, expect, toLocalePath } from './fixtures/a11y-fixtures';

// Locale
import { test, expect, testAllLocales } from './fixtures';

// Auth (trial/admin)
import { test, expect } from './fixtures/auth-fixtures';
```

Enforced by ESLint rule `local-rules/require-e2e-fixtures`.

## Wall Bypasses

All fixtures chain from `base-fixtures.ts`, which auto-applies:

1. `/api/tos` route mock (bypasses TosGateProvider)
2. `mirrorbuddy-consent` localStorage (bypasses CookieConsentWall)
3. `mirrorbuddy-trial-consent` cookie (bypasses TrialConsentGate)

## Fixture Chain

```
base-fixtures.ts          -- /api/tos mock + consent + localStorage
  |-- a11y-fixtures.ts    -- + toLocalePath, a11y helpers
  |-- locale-fixtures.ts  -- + Accept-Language, NEXT_LOCALE cookie
  |-- auth-fixtures.ts    -- + trialPage, adminPage
```

## Adding New Walls

1. Update `e2e/global-setup.ts` localStorage array
2. Mock any API endpoints the component calls on mount
3. Run E2E locally before pushing

Reference: ADR 0059
