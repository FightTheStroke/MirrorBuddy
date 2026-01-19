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

## Comprehensive Local Testing Suite

### Overview

Before pushing to CI or creating a release, developers should run the full local test suite to catch issues early. MirrorBuddy provides multiple testing phases:

### Testing Phases

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

### Local Testing Instructions

#### Quick Smoke Test (5 min)

```bash
npm run dev              # Terminal 1: Start server
npm run test -- --grep "smoke"  # Terminal 2: Quick smoke only
```

#### Full Local Test Suite (15 min)

```bash
npm run dev              # Terminal 1: Keep server running
npm run typecheck        # Terminal 2
npm run lint
npm run test:unit
npm run test             # E2E - uses global-setup.ts walls
./scripts/perf-check.sh
```

#### Pre-push Check (Recommended, 30 min)

```bash
npm run pre-push         # Simulates Vercel pipeline (~45s)
```

#### Full Release Gate (CI simulation, 45+ min)

```bash
npm run release:gate     # Blocks on any failure
# - Phase 0: Pre-release checks
# - Phase 1: TypeScript rigor (@ts-ignore, any)
# - Phase 2: Unit tests + coverage
# - Phase 3: E2E tests (uses walls)
# - Phase 4: Performance gates
# - Phase 5: File size limits
# - Phase 6: Plan sanity
```

### Test Coverage & Thresholds

- **Unit tests**: 80% coverage target
- **E2E tests**: 24 spec files, 100+ scenarios
- **Accessibility**: axe-core audit on selected pages
- **Performance**: Bundle size, N+1 patterns, lazy loading gates
- **File size**: Max 250 lines/file enforcement

### Wall Component Requirements (F-16 Acceptance)

When adding new "wall" components:

1. Add localStorage bypass to `e2e/global-setup.ts`
2. Test E2E suite passes: `npm run test`
3. Verify no "white dots" (unresolved threads) in code reviews
4. Add wall type to ADR 0059 checklist (this file)

### CI/CD Integration

- **PR checks**: Pre-push + lint + typecheck + build
- **Full CI**: Release gate phases 0-6
- **Manual override**: Add skip-checks comment only for emergencies
- **Performance**: Non-blocking warnings in v0.7, blocking in v1.0
