# ADR 0105: Prisma Race Condition Prevention

**Status**: Accepted
**Date**: 31 January 2026
**Context**: Plan P099 - Zero-Defect Release

## Context

During CI E2E testing, concurrent Playwright workers triggered race conditions
in Prisma `findFirst` + `create` patterns. Two workers hitting the same endpoint
simultaneously would both find null, both attempt `create`, and the second would
fail with `P2002: Unique constraint violation`.

### Confirmed impact

- `TrialSession.create()` - duplicate `(ipHash, visitorId)` on concurrent mobile E2E
- `AccessibilitySettings.create()` - duplicate `userId` on concurrent page loads
- `UserGamification.create()` - duplicate `userId` on concurrent API calls

### Root cause

The check-then-act pattern is inherently non-atomic:

```typescript
// UNSAFE: Race condition between find and create
const record = await prisma.model.findUnique({ where: { userId } });
if (!record) {
  await prisma.model.create({ data: { userId, ... } }); // P2002 if concurrent
}
```

## Decision

All "get or create" patterns MUST use one of these atomic approaches:

### Option A: Prisma upsert (preferred)

```typescript
const record = await prisma.model.upsert({
  where: { userId },
  update: {}, // No changes if exists
  create: { userId, ...defaults },
});
```

### Option B: Create with P2002 catch (when upsert not possible)

```typescript
try {
  const record = await prisma.model.create({ data: { userId, ... } });
} catch (err) {
  if (err instanceof Error && err.message.includes("Unique constraint")) {
    const record = await prisma.model.findUnique({ where: { userId } });
    if (record) return record;
  }
  throw err;
}
```

### When find-then-create is acceptable

- Admin-only endpoints with single concurrent user
- Batch scripts running sequentially
- Always document the assumption with a comment

## Consequences

### Positive

- Zero P2002 crashes in concurrent E2E and production
- Idempotent API endpoints (safe to retry)
- Simpler error handling (no retry logic needed)

### Negative

- `upsert` may be slightly slower than `find` alone (but safer)
- Need ESLint rule to enforce (see `no-prisma-race-condition`)

## Files fixed

| File                                             | Model                          | Fix            |
| ------------------------------------------------ | ------------------------------ | -------------- |
| `src/lib/trial/trial-service.ts`                 | TrialSession                   | upsert         |
| `src/lib/tier/registration-helper.ts`            | UserSubscription               | upsert         |
| `src/lib/gamification/db.ts`                     | UserGamification + DailyStreak | upsert + catch |
| `src/lib/education/adaptive-difficulty.ts`       | Progress                       | upsert         |
| `src/lib/feature-flags/feature-flags-service.ts` | FeatureFlag                    | upsert         |
| `src/app/api/invites/request/route.ts`           | InviteRequest                  | catch P2002    |

## ESLint enforcement

Rule `no-prisma-race-condition` warns on `prisma.*.create` preceded by
`prisma.*.find` on the same model within the same function scope.

## References

- Prisma docs: [Upsert](https://www.prisma.io/docs/orm/reference/prisma-client-reference#upsert)
- OWASP: TOCTOU (Time-of-check to time-of-use)
