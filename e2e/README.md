# E2E Test Suite - MirrorBuddy

Comprehensive E2E testing using Playwright for accessibility, navigation, security, and user flows.

## Quick Start

```bash
npm run test         # Run all E2E tests
npm run test:ui      # Run with Playwright UI
npm run test:debug   # Run in debug mode
npx playwright test e2e/trial.spec.ts  # Run specific file
```

## Architecture

```
e2e/
├── fixtures/              # Test fixtures and helpers
│   └── auth-fixtures.ts   # adminPage, trialPage fixtures
├── full-ui-audit/         # Visual/UI audit tests
│   ├── settings.spec.ts
│   ├── style-consistency.spec.ts
│   └── visual-regression.spec.ts
├── admin-helpers.ts       # Shared admin test utilities
├── *.spec.ts              # Test files (see categories below)
├── global-setup.ts        # Bypass walls (consent, onboarding, TOS)
└── README.md              # This file
```

## Test Categories

| Category          | Files                                                                                                 | F-xx                   | Description                                       |
| ----------------- | ----------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------- |
| **Accessibility** | `accessibility.spec.ts`                                                                               | F-09,17,18,19,20       | WCAG 2.1 AA, axe-core, keyboard nav, DSA profiles |
| **Admin**         | `admin.spec.ts`, `admin-sidebar.spec.ts`                                                              | F-01-05,07,10,12,13,34 | Login, routes, sidebar navigation                 |
| **Auth**          | `auth.spec.ts`, `auth-system.spec.ts`                                                                 | F-12                   | Session management, protected routes              |
| **Compliance**    | `compliance.spec.ts`, `legal-ai-act.spec.ts`, `legal-data-privacy.spec.ts`, `gdpr-compliance.spec.ts` | F-01-06,16             | EU AI Act, GDPR Art.20, COPPA, L.132/2025         |
| **Security**      | `csrf-protection.spec.ts`, `cookie-signing.spec.ts`                                                   | F-11,14,15,16          | CSRF tokens, cookie security                      |
| **Trial**         | `trial.spec.ts`                                                                                       | F-07,09,34             | GDPR compliance, trial limits, route audit        |
| **ToS**           | `tos.spec.ts`                                                                                         | F-12                   | API, modal UI, accessibility                      |
| **Navigation**    | `navigation-and-buttons.spec.ts`                                                                      | F-01-05                | Button clicks, sidebar navigation                 |
| **API**           | `api-backend.spec.ts`, `critical-api-routes.spec.ts`                                                  | F-06,08                | Endpoint validation                               |

## Consolidated Files (ADR 0059)

| Consolidated File       | Source Files                           | Lines |
| ----------------------- | -------------------------------------- | ----- |
| `tos.spec.ts`           | tos-acceptance + tos-modal-interaction | ~250  |
| `trial.spec.ts`         | trial + trial-ui                       | ~360  |
| `accessibility.spec.ts` | accessibility + a11y-instant-access    | ~640  |
| `admin.spec.ts`         | admin-ui (partial)                     | ~230  |
| `admin-sidebar.spec.ts` | admin-sidebar-navigation               | ~240  |

## Fixtures

### Auth Fixtures (`fixtures/auth-fixtures.ts`)

```typescript
import { test, expect } from "./fixtures/auth-fixtures";

test("admin-only test", async ({ adminPage }) => {
  // Pre-authenticated admin page
  await adminPage.goto("/admin");
});

test("trial mode test", async ({ trialPage }) => {
  // Anonymous trial session
  await trialPage.goto("/");
});
```

### Available Fixtures

| Fixture     | Purpose                     |
| ----------- | --------------------------- |
| `page`      | Standard Playwright page    |
| `adminPage` | Authenticated admin context |
| `trialPage` | Anonymous trial session     |

## Global Setup

`global-setup.ts` bypasses "wall" components:

| Wall              | localStorage Key         | Value                      |
| ----------------- | ------------------------ | -------------------------- |
| CookieConsentWall | `mirrorbuddy-consent`    | `{version,acceptedAt,...}` |
| OnboardingStore   | `mirrorbuddy-onboarding` | `{completed:true,...}`     |
| TosGateProvider   | API mock                 | `{accepted:true}`          |

## Error Filtering

Common pattern across tests:

```typescript
const IGNORE_ERRORS = [
  /ResizeObserver loop/i,
  /Download the React DevTools/i,
  /favicon\.ico/i,
  /429.*Too Many Requests/i,
  /net::ERR_/i,
  /hydrat/i,
  /WebSocket/i,
  /Content Security Policy/i,
];
```

## Writing Tests

### Best Practices

1. **Use descriptive F-xx references** in test names:

   ```typescript
   test("F-12: admin login flow works", async ({ page }) => {
   ```

2. **Use fixtures** for authenticated contexts:

   ```typescript
   test("admin route", async ({ adminPage }) => {
   ```

3. **Filter expected errors** to reduce noise:

   ```typescript
   if (!IGNORE_ERRORS.some((p) => p.test(text))) {
     errors.push(text);
   }
   ```

4. **Clean up modals** before interactions:
   ```typescript
   await dismissBlockingModals(page);
   await closeOpenDialogs(page);
   ```

### File Size Limit

Max 250 lines per file. Split large test suites:

- Extract helpers to `*-helpers.ts`
- Create focused test files by feature

### Adding New Tests

1. Create `e2e/{feature}.spec.ts`
2. Add F-xx references in header
3. Use appropriate fixtures
4. Document in this README

## CI vs Local Tests

**26/30 tests run in CI**, 4 are local-only (auto-skipped via `test.skip`):

| Local-Only Test                  | Reason                   | Run Command               |
| -------------------------------- | ------------------------ | ------------------------- |
| `voice-api.spec.ts`              | WebSocket proxy required | `npm run ws-proxy` first  |
| `chat-tools-integration.spec.ts` | AI provider required     | Set `AZURE_OPENAI_*` vars |
| `maestro-conversation.spec.ts`   | Azure OpenAI required    | Set `AZURE_OPENAI_*` vars |
| `visual-regression.spec.ts`      | Human baseline approval  | `VISUAL_REGRESSION=1`     |

All other tests are CI-compatible (mock APIs, fallback env vars).

## CI Integration

Tests run on every PR via GitHub Actions:

```yaml
- name: Run E2E tests
  run: npm run test
```

Local-only tests are automatically skipped when `process.env.CI=true`.

## Debugging

```bash
# Debug specific test
npx playwright test e2e/trial.spec.ts --debug

# Generate trace
npx playwright test --trace on

# View last trace
npx playwright show-trace trace.zip
```

## Related Documentation

- ADR 0059: E2E Test Setup Requirements
- ADR 0060: Instant Access Feature
- `.claude/rules/e2e-testing.md`: Global setup rules
