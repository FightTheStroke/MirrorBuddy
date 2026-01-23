# ADR 0059: E2E Test Setup Requirements

**Date**: 2026-01-19
**Status**: Accepted
**Context**: CI failures in E2E tests due to incomplete test environment setup

## Problem

E2E tests were failing in CI with cryptic errors:

1. **Auth tests**: Looking for `input[type="email"]` but login uses `input#username`
2. **Accessibility tests**: "Page should have main landmark" failing despite layout having `<main>`
3. **CodeQL**: SARIF upload failures due to unsupported "actions" language

## Root Causes

### 1. Auth Selector Mismatch

The login page uses a username field (`input#username` with `type="text"`), not an email field. Tests were written assuming email input type.

**Fix**: Use `input#username` selector in auth tests.

### 2. Cookie Consent Wall Blocking Content

The app has a `CookieConsentWall` that renders a consent dialog instead of the app content when no consent exists. The `<main>` landmark is inside `{children}` which only renders after consent.

**Key insight**: The global-setup.ts saves localStorage for onboarding but NOT for cookie consent, so tests see the consent wall (a `<div>`) instead of the app (wrapped in `<main>`).

**Fix**: Add `mirrorbuddy-consent` to global-setup.ts localStorage:

```javascript
{
  name: "mirrorbuddy-consent",
  value: JSON.stringify({
    version: "1.0",
    acceptedAt: new Date().toISOString(),
    essential: true,
    analytics: true,
    marketing: false,
  }),
}
```

### 3. CodeQL Actions Language

The "actions" language analyzer for GitHub Actions YAML files was causing SARIF upload failures. This is a relatively new feature that may have compatibility issues.

**Fix**: Remove "actions" from CodeQL matrix, keeping only `javascript-typescript` and `python`.

## E2E Global Setup Checklist

When adding new "wall" components (consent, ToS, onboarding), the global-setup.ts MUST be updated:

```typescript
// e2e/global-setup.ts localStorage must include:
localStorage: [
  { name: "mirrorbuddy-onboarding", value: JSON.stringify({...}) },
  { name: "mirrorbuddy-consent", value: JSON.stringify({...}) },
  // Add any new "wall" bypass here
]
```

### Database Safety (E2E)

E2E tests must never run against production. A dedicated test database is required.

- Set `TEST_DATABASE_URL` (and optional `TEST_DIRECT_URL`) before `npm run test`.
- The app will throw if `E2E_TESTS=1` and `TEST_DATABASE_URL` is missing.
- Playwright webServer passes only the test DB URLs to the app.
- Local default: `postgresql://<user>@localhost:5432/mirrorbuddy_test` with `CREATE EXTENSION vector;`.

## Architecture Notes

1. **Onboarding store hydration**: Uses `/api/onboarding` API, NOT localStorage. The localStorage onboarding entry is for Zustand persistence compatibility.

2. **Consent storage**: Uses `mirrorbuddy-consent` in localStorage. The `CookieConsentWall` checks this before rendering children.

3. **ToS gate**: Wrapped inside consent wall. Check `TosGateProvider` if ToS-related test failures occur.

## CI Debugging Tips

1. **Always check global-setup.ts** when new "wall" components are added
2. **Check actual DOM selectors** - login uses `#username` not `[type="email"]`
3. **CodeQL failures**: Check if new languages were added; some may not be fully supported
4. **Main landmark**: If accessibility tests fail, check if a wall component is blocking children

## Decision

Document all E2E test setup requirements and update this ADR when new blocking components are added.

## Consequences

- Faster CI debugging with documented patterns
- Clear checklist for adding new "wall" components
- Reduced time spent on recurring CI issues

---

## Local Testing Strategy

### Standard Testing Phases

Before pushing to CI or creating a release, developers should run the appropriate test suite:

| Phase            | Command                   | Purpose              | Wall bypass?   |
| ---------------- | ------------------------- | -------------------- | -------------- |
| **Lint**         | `npm run lint`            | Code quality, style  | N/A            |
| **TypeCheck**    | `npm run typecheck`       | Type safety          | N/A            |
| **Unit Tests**   | `npm run test:unit`       | Logic isolation      | No (JSDOM)     |
| **Coverage**     | `npm run test:coverage`   | Coverage metrics     | No (JSDOM)     |
| **E2E Tests**    | `npm run test`            | Full integration     | **YES**        |
| **Performance**  | `./scripts/perf-check.sh` | Performance gates    | N/A            |
| **Pre-release**  | `npm run pre-release`     | Hygiene + validation | N/A            |
| **Release Gate** | `npm run release:gate`    | Full orchestration   | Runs all above |

### E2E Test Suite Details

**Location**: `e2e/` - 24+ spec files covering:

- **Smoke tests**: Full app navigation
- **Accessibility**: WCAG 2.1 AA via @axe-core/playwright
- **Security**: CSRF, auth, protected routes
- **Features**: Trial mode, invite system, voice API
- **Compliance**: GDPR, data retention
- **API**: All backend routes and integrations

**Global setup** (`e2e/global-setup.ts`) bypasses walls via localStorage. Update when adding new walls.

---

## Comprehensive Local Testing Suite

**Added**: 2026-01-19 | **Context**: Full UI/navigation/security testing before release

### Overview

A comprehensive local-only test suite that validates navigation, UI consistency, performance, and security. Runs unattended and generates actionable HTML reports.

### Quick Start

```bash
# Basic run (required tests)
./scripts/full-local-test.sh

# Full run with visual regression and bundle analysis
./scripts/full-local-test.sh --visual --bundle
```

### Test Phases

| Phase | Description                     | Duration | Blocking |
| ----- | ------------------------------- | -------- | -------- |
| 1     | Route inventory validation      | ~5s      | Yes      |
| 2     | Trial UI audit (24 routes)      | ~2min    | Yes      |
| 3     | Admin UI audit (7 routes)       | ~1min    | Yes      |
| 4     | Settings interactions           | ~30s     | Yes      |
| 5     | Visual regression               | ~2min    | Optional |
| 6     | Lighthouse (4 routes)           | ~3min    | Yes      |
| 7     | Bundle analysis                 | ~1min    | Optional |
| 8     | Security scan (npm audit + ZAP) | ~2min    | Yes      |

### Thresholds

| Metric                  | Limit   | Source               |
| ----------------------- | ------- | -------------------- |
| Lighthouse Performance  | ≥ 90%   | lighthouserc.js      |
| Lighthouse LCP          | < 2.5s  | lighthouserc.js      |
| Lighthouse CLS          | < 0.1   | lighthouserc.js      |
| Bundle main (gzip)      | < 250KB | check-bundle-size.ts |
| Bundle chunks (gzip)    | < 100KB | check-bundle-size.ts |
| npm audit high/critical | 0       | security-scan.sh     |
| Console errors          | 0       | trial-ui.spec.ts     |

### Key Files

```
scripts/
├── full-local-test.sh          # Main orchestrator
├── full-local-test-helpers.sh  # Helper functions
├── generate-route-inventory.ts # Route discovery
├── generate-test-report.ts     # HTML report generator
├── check-bundle-size.ts        # Bundle size validation
└── security-scan.sh            # npm audit + OWASP ZAP

e2e/
├── trial.spec.ts               # Trial mode + GDPR (consolidated)
├── admin.spec.ts               # Admin login + routes (consolidated)
├── admin-sidebar.spec.ts       # Admin sidebar CLICK tests (consolidated)
├── admin-helpers.ts            # Shared admin utilities
├── accessibility.spec.ts       # WCAG + instant access (consolidated)
├── tos.spec.ts                 # ToS API + UI (consolidated)
└── fixtures/
    ├── auth-fixtures.ts        # Trial/admin page fixtures
    └── auth-fixtures-helpers.ts # Cookie signing, storage

e2e/full-ui-audit/
├── trial-ui-helpers.ts         # Trial UI helpers (shared)
├── settings.spec.ts            # Settings interactions
├── style-consistency.spec.ts   # Style validation
└── visual-regression.spec.ts   # Screenshot comparison
```

### Integration with Release Process

Optional in `app-release-manager` Phase 1.5:

1. Agent asks: "Vuoi eseguire il full local test? (~15-20min) [si/no]"
2. If yes: runs `./scripts/full-local-test.sh`
3. If fails: blocks release, attempts auto-fix
4. Report saved to `reports/full-local-test-YYYYMMDD.html`

### NOT for CI

This suite is local-only by design:

- Requires app running on localhost:3000
- Visual regression needs human baseline approval
- OWASP ZAP requires Docker
- ~15-20 min runtime too long for CI feedback loop

Use `npm run release:gate` for CI-appropriate checks.

---

## Wall Component Requirements (F-16 Acceptance)

When adding new "wall" components:

1. Add localStorage bypass to `e2e/global-setup.ts`
2. Test E2E suite passes: `npm run test`
3. Verify no "white dots" (unresolved threads) in code reviews
4. Add wall type to ADR 0059 checklist (this file)

---

## Admin Sidebar Navigation Tests

**Added**: 2026-01-20 | **Context**: Catch navigation bugs like `/home` instead of `/`

### Problem Solved

Previous E2E tests verified admin pages existed but never **clicked** sidebar links. This missed bugs where:

- `href="/home"` instead of `href="/"` (real bug fixed 2026-01-19)
- Links pointing to non-existent routes (e.g., `/admin/settings`)
- Navigation redirecting unexpectedly

### Test Coverage

**File**: `e2e/admin-sidebar.spec.ts` (consolidated)

| Test ID | Description                                    | Bug Type Caught             |
| ------- | ---------------------------------------------- | --------------------------- |
| F-01    | Click each sidebar link, verify route          | Wrong href, missing routes  |
| F-02    | No 404 responses during navigation             | Broken links, missing pages |
| F-03    | "Torna all'app" navigates to `/` (not `/home`) | **THE /home BUG**           |
| F-04    | Sidebar collapse/expand toggle                 | UI state bugs               |
| F-05    | Admin logo links to dashboard                  | Navigation regression       |

### Key Implementation Details

1. **Click-based testing**: Uses actual `click()` instead of `goto()` to test real user navigation
2. **Modal bypass**: Mocks `/api/tos` and sets localStorage to prevent consent walls blocking clicks
3. **Force clicks**: Uses `{ force: true }` to bypass HMR overlay in dev mode
4. **Navigation wait**: Uses `waitForURL()` with `Promise.all` for reliable navigation detection

### Known Issues

_None currently._

### Running the Tests

```bash
# Run only admin sidebar tests
npx playwright test admin-sidebar.spec.ts --project=chromium

# Run with UI for debugging
npx playwright test admin-sidebar.spec.ts --ui
```

---

## Test Suite Consolidation

**Added**: 2026-01-20 | **Context**: Reduce file count, improve maintainability

### Consolidation Summary

Reduced test files from ~30 to ~28 while maintaining full coverage:

| Consolidated File       | Source Files                                           | Lines | Benefit                     |
| ----------------------- | ------------------------------------------------------ | ----- | --------------------------- |
| `tos.spec.ts`           | tos-acceptance.spec.ts + tos-modal-interaction.spec.ts | ~250  | Unified ToS testing         |
| `trial.spec.ts`         | trial.spec.ts + trial-ui.spec.ts                       | ~360  | GDPR + route audit together |
| `accessibility.spec.ts` | accessibility.spec.ts + a11y-instant-access.spec.ts    | ~640  | Single a11y file            |
| `admin.spec.ts`         | admin-ui.spec.ts (partial)                             | ~230  | Login + route audit         |
| `admin-sidebar.spec.ts` | admin-sidebar-navigation.spec.ts                       | ~240  | Click-based navigation      |

### New Helper Files

| File                                | Purpose                                                    |
| ----------------------------------- | ---------------------------------------------------------- |
| `admin-helpers.ts`                  | Shared constants, types, utility functions for admin tests |
| `full-ui-audit/trial-ui-helpers.ts` | Shared helpers for trial UI audit                          |

### Consolidation Guidelines

1. **Max 250 lines/file**: Split if exceeding
2. **Extract helpers**: Shared constants and functions go to `*-helpers.ts`
3. **Preserve F-xx references**: All requirement IDs kept in consolidated files
4. **Document sources**: Header comments list original files

### Architecture Pattern

```typescript
// Consolidated file header
/**
 * E2E Tests: {Feature} - Consolidated
 *
 * {Description}
 * F-xx: {Requirement references}
 *
 * Run: npx playwright test e2e/{feature}.spec.ts
 *
 * Consolidated from:
 * - {original-file-1.spec.ts}
 * - {original-file-2.spec.ts}
 */

// Imports
import { test, expect } from "./fixtures/auth-fixtures";
import { IGNORE_ERRORS, helpers } from "./{feature}-helpers";

// Sections organized by F-xx groups
test.describe("{Feature} - {Category}", () => {
  test("F-xx: {test name}", async ({ page }) => { ... });
});
```

### Deleted Files

After consolidation, these files were removed:

- `e2e/tos-acceptance.spec.ts`
- `e2e/tos-modal-interaction.spec.ts`
- `e2e/a11y-instant-access.spec.ts`
- `e2e/full-ui-audit/trial-ui.spec.ts`
- `e2e/full-ui-audit/admin-ui.spec.ts`
- `e2e/full-ui-audit/admin-sidebar-navigation.spec.ts`

---

## CI vs Local Test Classification

**Added**: 2026-01-20 | **Context**: Clear distinction between CI-compatible and local-only tests

### Overview

Of 30 E2E test files, **26 run in CI** and **4 are local-only**. Local-only tests use `test.skip()` patterns to auto-skip in CI environments.

### Local-Only Tests (4 files)

| File                                      | Reason                            | Skip Pattern                                                         |
| ----------------------------------------- | --------------------------------- | -------------------------------------------------------------------- |
| `voice-api.spec.ts`                       | WebSocket proxy on localhost:3001 | `test.skip(!!process.env.CI, 'WebSocket proxy not available in CI')` |
| `chat-tools-integration.spec.ts`          | Requires Azure OpenAI or Ollama   | `test.skip(!!process.env.CI, 'AI provider not available in CI')`     |
| `maestro-conversation.spec.ts`            | Requires Azure OpenAI             | `test.skip(!!process.env.CI, 'Azure OpenAI not available in CI')`    |
| `full-ui-audit/visual-regression.spec.ts` | Human baseline approval           | `test.skip(!process.env.VISUAL_REGRESSION, ...)`                     |

### CI-Compatible Tests (26 files)

All other tests are CI-compatible because they:

1. **Mock external APIs** using `page.route()` for API responses
2. **Use fallback env vars** (e.g., `process.env.ADMIN_EMAIL || "admin@example.com"`)
3. **Filter non-critical errors** via `IGNORE_ERRORS` patterns
4. **No external dependencies** beyond the running Next.js app

| Category       | Files                                                                                   | CI Status |
| -------------- | --------------------------------------------------------------------------------------- | --------- |
| **Core**       | accessibility, auth, auth-system, navigation-and-buttons                                | ✅        |
| **Admin**      | admin, admin-sidebar, admin-dashboard                                                   | ✅        |
| **Security**   | cookie-signing, csrf-protection, debug-endpoints-security                               | ✅        |
| **Compliance** | gdpr-compliance, compliance, legal-ai-act, legal-data-privacy, tos, cron-data-retention | ✅        |
| **Features**   | trial, invite, google-drive, tools-api                                                  | ✅        |
| **API**        | api-backend, critical-api-routes, maestri-data                                          | ✅        |
| **Smoke**      | full-app-smoke                                                                          | ✅        |
| **UI Audit**   | settings, style-consistency                                                             | ✅        |

### CI Skip Pattern

For tests requiring external services, use this pattern:

```typescript
// At the top of test.describe() or test file
test.skip(!!process.env.CI, "Reason why this cannot run in CI");

// For feature-flagged tests
test.skip(!process.env.FEATURE_FLAG, "Set FEATURE_FLAG=1 to enable");
```

### GitHub Actions CI Environment

GitHub Actions automatically sets `process.env.CI=true`. Tests with `test.skip(!!process.env.CI, ...)` will be skipped automatically.

### Running Local-Only Tests

```bash
# Voice API tests (requires WebSocket proxy running)
npm run dev  # Terminal 1: Start app
npm run ws-proxy  # Terminal 2: Start WebSocket proxy
npx playwright test voice-api.spec.ts  # Terminal 3: Run tests

# AI integration tests (requires Azure OpenAI or Ollama)
# Ensure AZURE_OPENAI_* env vars are set
npx playwright test chat-tools-integration.spec.ts
npx playwright test maestro-conversation.spec.ts

# Visual regression (requires human baseline approval)
VISUAL_REGRESSION=1 npx playwright test visual-regression.spec.ts --update-snapshots
```

### Adding New Tests

When creating tests that require external services:

1. Add `test.skip(!!process.env.CI, 'Description')` at the start
2. Document the dependency in the file header
3. Add to the "Local-Only Tests" table in this ADR
4. Provide local run instructions in file comments
