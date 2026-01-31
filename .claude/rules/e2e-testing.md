# E2E Testing Rules - MirrorBuddy

## Production Safety Guard (F-03)

**CRITICAL SAFETY FEATURE**: E2E tests are automatically blocked in production environments.

`e2e/global-setup.ts` enforces a NODE_ENV check at function entry:

```typescript
if (process.env.NODE_ENV === "production") {
  throw new Error(
    "CRITICAL SAFETY ERROR: E2E tests are blocked in production...",
  );
}
```

**Why this matters**: E2E tests create test users, delete sessions, corrupt data, and would cause real user data loss if run in production.

**Valid environments for testing**:

- `NODE_ENV=development` (local)
- `NODE_ENV=test` (test suite)
- `NODE_ENV=staging` (staging server)

**In production**: Tests will always fail with clear error message. No workarounds. No exceptions.

## Global Setup Requirements (ADR 0059)

`e2e/global-setup.ts` MUST bypass all "wall" components:

| Wall Component    | localStorage Key         | API Mock Required    |
| ----------------- | ------------------------ | -------------------- |
| CookieConsentWall | `mirrorbuddy-consent`    | No                   |
| OnboardingStore   | `mirrorbuddy-onboarding` | No                   |
| TosGateProvider   | `mirrorbuddy-consent`    | **Yes - `/api/tos`** |

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

## When Adding New "Wall" Components

1. Update `e2e/global-setup.ts` localStorage array
2. Add the bypass key and valid JSON value
3. **If component calls APIs on mount**: Mock those endpoints in tests
4. Run E2E tests locally before pushing

## Common Failure Patterns

### "Page should have main landmark"

- **Cause**: A wall component is rendering instead of app content
- **Fix**: Add the wall's bypass key to global-setup.ts

### Auth test selector failures

- **Cause**: Login uses `input#username` not `input[type="email"]`
- **Fix**: Use `input#username` selector

### CodeQL SARIF failures

- **Cause**: Unsupported language in matrix (e.g., "actions")
- **Fix**: Remove unsupported language from `.github/workflows/codeql.yml`

### Mobile timeout failures (iPhone SE, Pixel 7)

- **Cause**: Default 30s timeout too short for slow mobile rendering
- **Fix**: Increase timeout to 60s for mobile viewports in `playwright.config.ts`
  ```typescript
  timeout: process.env.CI_MOBILE_TESTS === '1' ? 60000 : 30000,
  ```

## Test Skip Pattern (testIgnore)

For specs needing complex authentication or multi-step setup that blocks CI:

```typescript
test.describe.configure({ mode: "parallel" });

test.skip(
  someCondition,
  "Skipped: Requires manual admin setup",
  async ({ page }) => {
    // Complex multi-step test
  },
);
```

**When to use**: Admin-only flows with circular dependencies. Use `testIgnore` during wave development, mark as `@skip` once fixed.

## Quick Verification

```bash
npm run lint && npm run typecheck && npm run build
npm run test  # Requires app running
```

## Reference

Full details: `docs/adr/0059-e2e-test-setup-requirements.md`
