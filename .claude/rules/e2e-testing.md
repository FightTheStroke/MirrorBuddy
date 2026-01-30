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

### TosGateProvider Special Case (CRITICAL)

TosGateProvider checks **both** localStorage AND calls `GET /api/tos` on mount.

**MANDATORY IN ALL E2E TESTS**: Mock `/api/tos` to prevent modal blocking UI:

```typescript
// Add to EVERY E2E test (not just auth tests)
await page.route("/api/tos", async (route) => {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      accepted: true,
      version: "1.0",
    }),
  });
});
```

**Why needed**: Without this mock, TosGateProvider receives `{accepted: false}` from the API, shows the ToS modal overlay, and blocks all pointer events on the page.

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
