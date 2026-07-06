# E2E Testing — MirrorBuddy

## F-03: Production safety

E2E blocked in production (`e2e/global-setup.ts` NODE_ENV check). No workarounds.

## Fixture import (ESLint-enforced: `local-rules/require-e2e-fixtures`)

```ts
// ✓ CORRECT
import { test, expect } from './fixtures/base-fixtures';
import { test, expect, toLocalePath } from './fixtures/a11y-fixtures';
import { test, expect, testAllLocales } from './fixtures'; // locale
import { test, expect } from './fixtures/auth-fixtures'; // trial/admin

// ✗ WRONG — TOS modal blocks ALL interactions
import { test, expect } from '@playwright/test';
```

## Wall bypass (ADR 0059)

All three checks below live in `UnifiedConsentWall` (`components/consent/unified-consent-wall.tsx`) — the older TosGateProvider/CookieConsentWall/TrialConsentGate components no longer exist, consolidated into it. Base fixtures auto-apply:

1. `/api/tos` route mock → bypasses the ToS check (returns `{accepted:true, version:"1.0"}`)
2. `mirrorbuddy-consent` localStorage → bypasses the cookie consent check
3. `mirrorbuddy-trial-consent` cookie → bypasses the trial consent check

Without fixtures = ToS modal blocks pointer events → tests timeout.

## Fixture chain

```
base-fixtures.ts
  ├─ a11y-fixtures.ts    (+ toLocalePath, a11y helpers)
  ├─ locale-fixtures.ts  (+ Accept-Language, NEXT_LOCALE, LocalePage)
  └─ auth-fixtures.ts    (+ trialPage, adminPage)
```

## Adding new wall

1. Update `e2e/global-setup.ts` localStorage array.
2. If component calls APIs on mount → mock in `base-fixtures.ts`.
3. Run E2E locally before push.

## Ref: ADR 0059 | `docs/adr/0059-e2e-test-setup-requirements.md`
