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

## Adding New Walls

1. Update `e2e/global-setup.ts` localStorage array
2. If component calls APIs on mount: mock those endpoints
3. Run E2E locally before pushing

## Full reference: ADR 0059 | `docs/adr/0059-e2e-test-setup-requirements.md`
