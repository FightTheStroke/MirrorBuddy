# 0103 - E2E Test Stability Requirements and CI Enforcement

## Status

Accepted

## Context

During Plan 97 (FixE2E-Vercel-Admin-Sentry), we discovered critical E2E test stability issues that caused CI failures and deployment blockers:

1. **TosGateProvider blocking tests**: Tests timeout with "element intercepts pointer events" when the ToS modal renders over content
2. **Mobile viewport timeouts**: iPhone SE/Pixel 7 tests failed with 30s default timeout during slow rendering
3. **Complex auth flows**: Admin tests requiring multi-step authentication setup created circular dependencies
4. **CI environment gaps**: Tests passing locally but failing in CI due to missing mocks, wall components, or timing issues
5. **Inconsistent test patterns**: No enforced standard for wall bypasses, API mocks, or timeout configuration

These issues resulted in:

- 8+ hours debugging CI failures across multiple waves
- Repeated "white dots" (unresolved PR threads) from failed checks
- Deployment gate failures requiring manual intervention
- Developer frustration with flaky E2E tests

We need a comprehensive ADR documenting stability requirements, enforcement mechanisms, and prevention strategies to prevent regression.

## Decision

We establish mandatory E2E test stability requirements and CI enforcement mechanisms:

### 1. TosGateProvider API Mock (MANDATORY)

**Requirement**: ALL E2E tests MUST mock `/api/tos` to prevent ToS modal from blocking interactions.

**Pattern**:

```typescript
// Add to EVERY E2E test file (including non-auth tests)
test.beforeEach(async ({ page }) => {
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
});
```

**Why mandatory**: TosGateProvider checks BOTH localStorage (set in global-setup.ts) AND the API on mount. Without the API mock, tests receive `{accepted: false}`, the ToS modal renders, and all pointer events are blocked.

**Symptom**: Test timeout with error "element intercepts pointer events" showing ToS modal heading.

**Enforcement**: Pre-commit hook (`scripts/check-e2e-tos-mock.sh`) scans all `e2e/**/*.spec.ts` files for the `/api/tos` route mock. Blocks commit if missing.

### 2. Mobile Viewport Timeout Configuration

**Requirement**: Mobile E2E tests MUST use 60s timeout instead of default 30s.

**Configuration** (`playwright.config.ts`):

```typescript
{
  name: 'Mobile Chrome (Pixel 7)',
  use: {
    ...devices['Pixel 7'],
  },
  timeout: process.env.CI_MOBILE_TESTS === '1' ? 60000 : 30000,
}
```

**Rationale**: Mobile viewports (iPhone SE 375x667, Pixel 7 412x915) render slower in CI, especially on:

- First paint with SSR hydration
- Image lazy loading
- JavaScript bundle execution
- Network conditions in GitHub Actions runners

**Failure pattern**: Tests pass locally (faster hardware) but timeout in CI at page navigation or element interaction.

### 3. testIgnore Pattern for Complex Auth Flows

**Requirement**: Specs requiring multi-step admin setup or circular auth dependencies MUST use `testIgnore` in `playwright.config.ts` during development, with clear documentation of requirements.

**Pattern** (`playwright.config.ts`):

```typescript
testIgnore: [
  '**/e2e/admin-complex-auth.spec.ts', // Requires pre-seeded admin + session
  '**/e2e/protected-routes-circular.spec.ts', // Auth dependency loop
],
```

**When to use**:

- Admin tests requiring pre-existing session that cannot be created via API
- Tests with circular dependencies (e.g., need feature X to test feature X)
- Tests requiring external services not available in CI (already covered by `test.skip()`)

**Alternative**: Use `test.skip()` with condition inside the spec file:

```typescript
test.skip(
  !!process.env.CI,
  "Requires complex manual setup not available in CI",
);
```

**Documentation requirement**: Add skipped test to ADR 0059 "Local-Only Tests" table with reason and local run instructions.

### 4. CI Enforcement Strategy

**Pre-commit hooks** (`scripts/`):

1. `check-e2e-tos-mock.sh`: Verify `/api/tos` mock in all E2E specs
2. `check-e2e-mobile-timeout.sh`: Verify mobile timeout >= 60s in playwright.config.ts
3. `check-e2e-testignore-docs.sh`: Verify testIgnore entries documented in ADR 0059

**GitHub Actions CI** (`.github/workflows/ci.yml`):

```yaml
- name: E2E Smoke Tests
  run: npm run test:e2e:smoke
  timeout-minutes: 10

- name: E2E Mobile Tests
  env:
    CI_MOBILE_TESTS: "1"
  run: npm run test:e2e:mobile
  timeout-minutes: 20
```

**Release gate** (`scripts/release-gate.sh`):

- Runs full E2E suite (`npm run test`)
- Fails if any testIgnore specs are not documented
- Blocks release if CI-compatible tests fail

### 5. Wall Component Bypass Checklist

**Updated checklist** for adding new "wall" components (extends ADR 0059):

1. Add localStorage bypass to `e2e/global-setup.ts`
2. **NEW**: If component calls APIs on mount, mock in ALL E2E tests (not just auth)
3. **NEW**: Add API mock to pre-commit hook check
4. Run E2E suite locally: `npm run test`
5. Verify mobile tests pass: `CI_MOBILE_TESTS=1 npm run test`
6. Update ADR 0059 "Wall Component Requirements" table
7. Document mock pattern in `.claude/rules/e2e-testing.md`

### 6. Test Stability Debugging Guide

**CI failure diagnosis flowchart**:

```
CI E2E test failed?
├─ "element intercepts pointer events"
│  └─ Missing /api/tos mock → Add to test file
├─ Timeout after 30s (mobile viewport)
│  └─ Mobile timeout too short → Increase to 60s
├─ "Page should have main landmark"
│  └─ Wall component blocking → Add localStorage to global-setup.ts
├─ Selector not found
│  └─ Check actual DOM selector (e.g., #username vs [type="email"])
├─ 503 from /api/health
│  └─ External service check failing → Return "warn" in test env
└─ Hangs on networkidle
   └─ Persistent connections (SSE/WS) → Use domcontentloaded
```

**Documentation**: Added to ADR 0059 "CI Debugging Checklist".

## Implementation Checklist

- [x] Document TosGateProvider API mock requirement
- [x] Document mobile timeout configuration (60s)
- [x] Document testIgnore pattern and alternatives
- [x] Define CI enforcement strategy with pre-commit hooks
- [x] Update wall component bypass checklist
- [x] Create CI failure diagnosis flowchart
- [ ] Implement pre-commit hook: `check-e2e-tos-mock.sh`
- [ ] Implement pre-commit hook: `check-e2e-mobile-timeout.sh`
- [ ] Implement pre-commit hook: `check-e2e-testignore-docs.sh`
- [ ] Update `.husky/pre-commit` to run new hooks
- [ ] Update `.claude/rules/e2e-testing.md` with new requirements
- [ ] Update `e2e/README.md` with stability patterns

## Consequences

### Positive

1. **Fewer CI failures**: Mandatory `/api/tos` mock prevents most common timeout issue
2. **Faster debugging**: Clear diagnosis flowchart reduces time to resolution
3. **Better mobile coverage**: 60s timeout prevents false negatives on mobile viewports
4. **Documented skips**: testIgnore entries tracked and reviewed for eventual resolution
5. **Automated enforcement**: Pre-commit hooks catch issues before push
6. **Consistent patterns**: All developers follow same mock/timeout/skip conventions

### Risks and Mitigations

**Risk**: Pre-commit hooks slow down workflow.

- **Mitigation**: Hooks run only on staged E2E files, typically <100ms overhead. Use `git commit --no-verify` for urgent hotfixes (must pass CI anyway).

**Risk**: Developers skip hooks with `--no-verify` and push broken tests.

- **Mitigation**: CI runs same checks, blocks merge if failed. Release gate provides final validation.

**Risk**: testIgnore accumulates technical debt of skipped tests.

- **Mitigation**: ADR 0059 documentation requirement forces visibility. Quarterly review of testIgnore list during retrospectives.

**Risk**: 60s mobile timeout masks real performance issues.

- **Mitigation**: Lighthouse CI separately validates performance budgets. E2E timeout is for test stability, not performance validation.

### Follow-ups

1. Implement three pre-commit hooks (T7-02, T7-03, T7-04 in Plan 97)
2. Update `.claude/rules/e2e-testing.md` with new patterns (T7-05)
3. Add `/api/tos` mock to existing E2E specs missing it (T7-06)
4. Document testIgnore review process in CONTRIBUTING.md (T7-07)
5. Create E2E stability dashboard in admin panel showing skip counts (future)

## Related ADRs

- **ADR 0059**: E2E Test Setup Requirements (global setup, wall components, local-only tests)
- **ADR 0102**: Incremental E2E Execution and Release Flow (test sets, release gates)
- **ADR 0081**: Test Data Isolation Strategy (test database, data cleanup)
- **ADR 0099**: Vercel Deployment Checks Gate (CI enforcement, deployment gate)

## References

- Plan 97: FixE2E-Vercel-Admin-Sentry (2026-01-29)
- Playwright Best Practices: https://playwright.dev/docs/best-practices
- Mobile E2E Testing: https://playwright.dev/docs/emulation
- Test Isolation: https://playwright.dev/docs/test-isolation
