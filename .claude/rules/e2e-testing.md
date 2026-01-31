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

### Mandatory Fixture Import

**NEVER** import `test` or `expect` from `@playwright/test` in E2E spec files.
**ALWAYS** import from fixtures:

```typescript
// CORRECT - base fixtures (auto TOS mock + wall bypasses)
import { test, expect } from "./fixtures/base-fixtures";

// CORRECT - a11y fixtures (adds a11y support on top of base)
import { test, expect, toLocalePath } from "./fixtures/a11y-fixtures";

// CORRECT - locale fixtures (adds locale support on top of base)
import { test, expect, testAllLocales } from "./fixtures";

// CORRECT - auth fixtures (adds trial/admin on top of base)
import { test, expect } from "./fixtures/auth-fixtures";

// WRONG - missing wall bypasses, TOS modal blocks ALL interactions
import { test, expect } from "@playwright/test";
```

**Enforced by**: ESLint rule `local-rules/require-e2e-fixtures`.

### Fixture Chain Architecture

```
base-fixtures.ts          -- /api/tos mock + consent cookie + localStorage
  |-- a11y-fixtures.ts    -- + toLocalePath, a11y test helpers
  |-- locale-fixtures.ts  -- + Accept-Language, NEXT_LOCALE cookie, LocalePage
  |-- auth-fixtures.ts    -- + trialPage (onboarding bypass), adminPage (auth cookies)
```

## Adding New Walls

1. Update `e2e/global-setup.ts` localStorage array
2. If component calls APIs on mount: mock those endpoints
3. Run E2E locally before pushing

## Full reference: ADR 0059 | `docs/adr/0059-e2e-test-setup-requirements.md`
