# Skipped Tests Registry

> Tracking all skipped tests to prevent regression debt accumulation.
> Updated: 2026-01-26

## Policy

1. **No unconditional skips** - Every `test.skip()` MUST have a reason
2. **Track all skips** - Add to this registry with deadline
3. **Review monthly** - Remove stale entries, fix or justify
4. **Baseline: 5 skipped tests** - CI warns if exceeded

---

## Category 1: External Service Dependencies (Valid)

These tests require external services not available in CI. **Acceptable.**

| File                             | Test              | Reason                 | Status |
| -------------------------------- | ----------------- | ---------------------- | ------ |
| `maestro-conversation.spec.ts`   | AI conversation   | Azure OpenAI not in CI | Valid  |
| `chat-tools-integration.spec.ts` | Tool invocation   | AI provider required   | Valid  |
| `voice-api.spec.ts`              | WebSocket tests   | Proxy not in CI        | Valid  |
| `google-drive.spec.ts`           | Drive integration | OAuth not in CI        | Valid  |

---

## Category 2: Conditional Skips (Valid)

These skip based on runtime conditions (user not seeded, viewport size, etc.). **Acceptable.**

| File                               | Test                      | Condition                        | Status |
| ---------------------------------- | ------------------------- | -------------------------------- | ------ |
| `auth.spec.ts:77`                  | Login with credentials    | Test user not seeded             | Valid  |
| `auth.spec.ts:121`                 | Logout from settings      | User not authenticated           | Valid  |
| `auth.spec.ts:167`                 | Logout from sidebar       | Button not visible               | Valid  |
| `accessibility.spec.ts:487`        | Dyslexia font change      | CI env (font loading unreliable) | Valid  |
| `visual-regression.spec.ts:32`     | Visual diff               | VISUAL_REGRESSION env not set    | Valid  |
| `mobile/responsive-layout.spec.ts` | Touch target tests (4)    | viewport >= 1024px (lg:hidden)   | Valid  |
| `mobile/ipad.spec.ts`              | Sidebar overlay tests (3) | viewport >= 1024px (lg:hidden)   | Valid  |

---

## Category 3: Needs Attention (Fix or Document)

These have unconditional skips that need investigation.

| File | Line | Test | Action Required | Deadline |
| ---- | ---- | ---- | --------------- | -------- |
| -    | -    | -    | None pending    | -        |

---

## How to Add a Skip

When skipping a test, you MUST:

1. Add a reason: `test.skip(condition, "Reason here")`
2. Add to this registry
3. Set a deadline for fixing

```typescript
// WRONG - unconditional skip with no reason
test.skip("my test", async () => {});

// WRONG - conditional skip with no message
if (!condition) {
  test.skip();
  return;
}

// CORRECT - conditional skip with message
test.skip(!process.env.AI_KEY, "Requires AI_KEY env var");

// CORRECT - conditional skip inside test with reason
if (!hasRequiredData) {
  test.skip(true, "Test data not seeded");
  return;
}
```

---

## Monthly Review Checklist

- [ ] Are all skips in this registry?
- [ ] Have deadlines passed? Fix or extend with justification
- [ ] Can any external-service tests be mocked instead?
- [ ] Is baseline still accurate?

Last reviewed: 2026-01-26
