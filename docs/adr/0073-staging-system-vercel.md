# ADR 0073: Staging System on Vercel

## Status

Accepted

## Date

2026-01-25

## Context

MirrorBuddy deployments on Vercel had critical issues:

1. **Preview deployments used production database** - Bug testing could corrupt real user data
2. **Cron jobs ran on ALL environments** - Duplicate processing, metrics pollution
3. **No staging mechanism** - Only `E2E_TESTS=1` for local testing
4. **Cost constraint** - Cannot add another Supabase project ($25/mo)

## Decision

Implement **logical isolation** within the production database using:

1. **Environment detection** via `VERCEL_ENV` variable (automatic from Vercel)
2. **`isTestData` flag** on all relevant models (already existed in schema)
3. **Prisma extension** to auto-tag creates in preview mode
4. **Cron guards** to skip jobs in non-production

## Consequences

### Positive

- **Zero additional cost** - Reuses existing infrastructure
- **Automatic protection** - Preview data tagged without developer intervention
- **Cron safety** - No duplicate job execution in previews
- **Admin visibility** - Can view/purge test data via admin UI
- **Full testing** - Can test against production-like environment

### Negative

- **Shared database** - Test data exists alongside production (mitigated by filtering)
- **Schema coupling** - All trackable models need `isTestData` field
- **Cleanup required** - Manual purge or scheduled cleanup of test data

### Technical Details

**Environment Detection**:

```typescript
export const isStagingMode = process.env.VERCEL_ENV === "preview";
```

**Prisma Extension** (in `src/lib/db.ts`):

```typescript
const stagingExtension = basePrisma.$extends({
  query: {
    $allModels: {
      async create({ model, args, query }) {
        if (isStagingMode && MODELS_WITH_TEST_DATA_FLAG.includes(model)) {
          args.data = { ...args.data, isTestData: true };
        }
        return query(args);
      },
    },
  },
});
```

**Cron Guard Pattern**:

```typescript
if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
  return NextResponse.json({ skipped: true, reason: "Not production" });
}
```

## Alternatives Considered

### 1. Separate Supabase Project

- **Pros**: Complete isolation
- **Cons**: $25/mo cost, sync complexity, migration overhead
- **Rejected**: Zero-cost constraint

### 2. Branch Databases (Neon/PlanetScale)

- **Pros**: True database branching
- **Cons**: Migration from Supabase, new vendor
- **Rejected**: Migration effort, vendor lock-in concerns

### 3. E2E Test Database Only

- **Pros**: Already exists locally
- **Cons**: Cannot access from Vercel preview (no localhost)
- **Rejected**: Not applicable for cloud previews

## Related

- Plan 75: Staging System Vercel
- ADR 0059: E2E Test Setup Requirements
- Existing migrations: 20260121030000, 20260121031000 (`isTestData` field)

## References

- [Vercel Environment Variables](https://vercel.com/docs/environment-variables/system-environment-variables)
- [Prisma Client Extensions](https://www.prisma.io/docs/concepts/components/prisma-client/client-extensions)
