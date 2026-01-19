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
