# E2E Testing Rules - MirrorBuddy

## Global Setup Requirements (ADR 0059)

`e2e/global-setup.ts` MUST bypass all "wall" components:

| Wall Component    | localStorage Key         | Required |
| ----------------- | ------------------------ | -------- |
| CookieConsentWall | `mirrorbuddy-consent`    | Yes      |
| OnboardingStore   | `mirrorbuddy-onboarding` | Yes      |
| TosGateProvider   | (inside consent)         | N/A      |

## When Adding New "Wall" Components

1. Update `e2e/global-setup.ts` localStorage array
2. Add the bypass key and valid JSON value
3. Run E2E tests locally before pushing

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

## Quick Verification

```bash
npm run lint && npm run typecheck && npm run build
npm run test  # Requires app running
```

## Reference

Full details: `docs/adr/0059-e2e-test-setup-requirements.md`
