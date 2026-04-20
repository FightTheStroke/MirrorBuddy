# E2E Tests — MirrorBuddy

Playwright specs. See root + `.claude/rules/e2e-testing.md` (authoritative).

## CRITICAL: Fixture import (ESLint-enforced)

```ts
// ✓ CORRECT — auto TOS mock + wall bypasses
import { test, expect } from './fixtures/base-fixtures';
import { test, expect } from './fixtures/a11y-fixtures'; // a11y
import { test, expect } from './fixtures/auth-fixtures'; // trial/admin
import { test, expect, testAllLocales } from './fixtures'; // locale

// ✗ WRONG — TOS modal blocks all interactions
import { test, expect } from '@playwright/test';
```

## Wall bypass (ADR 0059)

Base fixtures auto-apply:

1. `/api/tos` route mock → bypasses TosGateProvider
2. `mirrorbuddy-consent` localStorage → bypasses CookieConsentWall
3. `mirrorbuddy-trial-consent` cookie → bypasses TrialConsentGate

Without fixtures = tests timeout.

## Production safety (F-03)

`e2e/global-setup.ts` checks `NODE_ENV` — E2E blocked in production. NO workarounds.

## Adding a new wall

1. Update `e2e/global-setup.ts` localStorage array.
2. If component calls APIs on mount → mock those endpoints in `base-fixtures.ts`.
3. Run E2E locally before push.

## Spec structure

- Filename `feature.spec.ts`. One feature per file.
- Setup inside `test.beforeEach`; avoid global mutation.
- Selectors: `data-testid` > role > text. Never XPath.
- Assertions: `expect(locator).toBeVisible()` (auto-retry) over `page.locator().count()`.

## Running

- Headed locally: `npx playwright test --headed --ui`.
- CI: `./scripts/ci-summary.sh --e2e` (uses fail-only output).
- Single file: `npx playwright test e2e/foo.spec.ts`.

## Flake policy

Flaky specs → quarantine with `test.fixme()` + create issue. Don't disable without ticket.
