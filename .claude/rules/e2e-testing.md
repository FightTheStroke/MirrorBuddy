# E2E Testing Rules - MirrorBuddy

## Production Safety Guard (F-03) - CRITICAL

E2E tests blocked in production (`e2e/global-setup.ts` NODE_ENV check). No workarounds.

## Wall Bypass (ADR 0059)

| Wall Component    | localStorage Key         | API Mock Required    |
| ----------------- | ------------------------ | -------------------- |
| CookieConsentWall | `mirrorbuddy-consent`    | No                   |
| OnboardingStore   | `mirrorbuddy-onboarding` | No                   |
| TosGateProvider   | `mirrorbuddy-consent`    | **Yes - `/api/tos`** |

**MANDATORY**: Mock `/api/tos` in ALL E2E tests (returns `{accepted: true, version: "1.0"}`).
Without it: ToS modal blocks pointer events, tests timeout.

### Mandatory Fixture Import (CRITICAL)

**NEVER** import `test` or `expect` from `@playwright/test` in E2E spec files.
**ALWAYS** import from fixtures:

```typescript
// CORRECT - base fixtures (auto TOS mock + wall bypasses)
import { test, expect } from "./fixtures/base-fixtures";

// CORRECT - locale fixtures (adds locale support on top of base)
import { test, expect, testAllLocales } from "./fixtures";

// CORRECT - auth fixtures (adds trial/admin on top of base)
import { test, expect } from "./fixtures/auth-fixtures";

// WRONG - missing wall bypasses, TOS modal blocks ALL interactions
import { test, expect } from "@playwright/test";
```

**Enforced by**: ESLint rule `local-rules/require-e2e-fixtures` (warns on `e2e/**/*.spec.ts`).

### Fixture Chain Architecture

```
base-fixtures.ts          -- /api/tos mock + consent cookie + localStorage
  |-- locale-fixtures.ts  -- + Accept-Language, NEXT_LOCALE cookie, LocalePage
  |-- auth-fixtures.ts    -- + trialPage (onboarding bypass), adminPage (auth cookies)
```

All fixtures chain from `base-fixtures.ts`, which automatically applies:

1. `/api/tos` route mock (bypasses TosGateProvider)
2. `mirrorbuddy-consent` localStorage (bypasses CookieConsentWall)
3. `mirrorbuddy-trial-consent` cookie (bypasses TrialConsentGate)

### Why This Matters (ADR 0059)

TosGateProvider checks **both** localStorage AND calls `GET /api/tos` on mount.
Without the mock, it receives `{accepted: false}`, shows a modal overlay, and
**blocks ALL pointer events** on the page.

**Symptom**: Test timeout with error "element intercepts pointer events" showing ToS modal heading.

## Adding New Walls

1. Update `e2e/global-setup.ts` localStorage array
2. If component calls APIs on mount: mock those endpoints
3. Run E2E locally before pushing

## Full reference: ADR 0059 | `docs/adr/0059-e2e-test-setup-requirements.md`
