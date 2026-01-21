# ADR 0065: Test Data Isolation Strategy

**Status**: Accepted
**Date**: 2026-01-21
**Decision Makers**: Engineering Team
**Related**: ADR 0059 (E2E Test Setup Requirements), Plan 063 (Admin Theme + Test Isolation + Mobile UX)

## Context

MirrorBuddy's E2E tests were creating test users and data directly in the production database without any mechanism to:

1. Identify test-generated data
2. Prevent test data from polluting production statistics
3. Clean up test data after execution
4. Protect real user accounts from accidental deletion

This caused several issues:

- Production database accumulated test users (e.g., `test-user-123@example.com`)
- Statistics dashboards included test data, skewing metrics
- No safe way to bulk-delete test data without risking real user deletion
- Manual cleanup required after each test run

## Decision

We implement a **three-layer test data isolation strategy**:

### 1. Database Schema: `isTestData` Flag

Add `isTestData BOOLEAN DEFAULT false` column to all tables touched by E2E tests:

- `User`
- `Conversation`
- `Message`
- `SessionMetrics`

**Implementation**: `prisma/migrations/20260121030000_add_is_test_data_flag/migration.sql`

### 2. Protected Users Whitelist

Environment variable `PROTECTED_USERS` contains comma-separated emails of production users that must NEVER be deleted:

```bash
PROTECTED_USERS=roberdan@fightthestroke.org,mariodanfts@gmail.com
```

**Implementation**: `src/lib/test-isolation/protected-users.ts`

### 3. Environment Guards

Block E2E tests from running in production:

```typescript
// e2e/global-setup.ts
if (process.env.NODE_ENV === "production") {
  throw new Error("E2E tests cannot run in production");
}
```

**Implementation**: Environment check in test setup + database constraints

## Consequences

### Positive

✅ **Clean production data**: Test data clearly marked and excludable from statistics
✅ **Safe cleanup**: Can bulk-delete where `isTestData=true` without risk
✅ **Protected accounts**: Whitelist prevents accidental deletion of real users
✅ **Audit trail**: Easy to identify test vs. production data in logs
✅ **Backward compatible**: Existing data defaults to `isTestData=false`

### Negative

⚠️ **Schema changes**: Requires migration (low risk, nullable with defaults)
⚠️ **Test maintenance**: E2E tests must set `isTestData=true` on creation
⚠️ **Query updates**: Statistics queries must add `WHERE isTestData=false`

### Neutral

- Environment variable management (already have .env infrastructure)
- Cleanup scripts required (one-time, then automated in CI)

## Implementation Details

### Database Migration

```sql
-- Safe idempotent migration
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='User' AND column_name='isTestData') THEN
    ALTER TABLE "User" ADD COLUMN "isTestData" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;
```

### Test Helper Pattern

```typescript
// e2e/helpers/test-data.ts
async function createTestUser(data: UserData) {
  return prisma.user.create({
    data: {
      ...data,
      isTestData: true, // Always mark as test data
    },
  });
}
```

### Cleanup Script Pattern

```typescript
// scripts/cleanup-test-data.ts
const protectedEmails = getProtectedUsers();

await prisma.user.deleteMany({
  where: {
    isTestData: true, // Only delete test data
    email: {
      notIn: protectedEmails, // Never delete protected users
    },
  },
});
```

### Statistics Query Pattern

```typescript
// Before (includes test data)
const totalUsers = await prisma.user.count();

// After (excludes test data)
const totalUsers = await prisma.user.count({
  where: { isTestData: false },
});
```

## Alternatives Considered

### Alternative 1: Separate Test Database

**Pros**: Complete isolation, no production impact
**Cons**: Requires separate infrastructure, doesn't test production schema, maintenance overhead
**Rejected**: Over-engineered for current scale

### Alternative 2: Email Pattern Matching

**Pros**: No schema changes, simple regex cleanup
**Cons**: Fragile (typos bypass), no protection for protected users, can't exclude from stats reliably
**Rejected**: Too error-prone

### Alternative 3: Separate `test_data` Schema

**Pros**: Clean separation at database level
**Cons**: Complex Prisma setup, foreign key issues across schemas, testing doesn't match production schema
**Rejected**: Adds unnecessary complexity

## Verification

### Acceptance Tests

```bash
# 1. Schema migration applied
npx prisma migrate deploy

# 2. Protected users helper works
npm run test:unit -- protected-users.test.ts

# 3. Cleanup script respects whitelist
npx tsx scripts/cleanup-test-data.ts --dry-run

# 4. Statistics exclude test data
curl http://localhost:3000/api/admin/stats
# Verify counts exclude isTestData=true records

# 5. E2E tests blocked in production
NODE_ENV=production npm run test
# Expected: Error thrown, tests not executed
```

### Rollback Plan

If issues arise:

1. **Immediate**: Disable cleanup scripts
2. **Short-term**: Set all `isTestData` to `false` to restore previous behavior
3. **Long-term**: Create reverse migration to drop `isTestData` column

```sql
-- Emergency rollback
UPDATE "User" SET "isTestData" = false;
UPDATE "Conversation" SET "isTestData" = false;
UPDATE "Message" SET "isTestData" = false;
UPDATE "SessionMetrics" SET "isTestData" = false;
```

## Related Decisions

- **ADR 0059**: E2E Test Setup Requirements - Established wall bypass patterns
- **Plan 063**: Full implementation of test isolation strategy
- **ADR 0037**: Deferred production items (context for production safety)

## References

- [Prisma Schema](prisma/schema/)
- [Test Isolation Helper](src/lib/test-isolation/protected-users.ts)
- [Cleanup Script](scripts/cleanup-test-data.ts) (to be created in T1-03)
- [Global Setup](e2e/global-setup.ts) (to be updated in T1-05)

## Status History

- **2026-01-21**: Accepted - Implemented in Plan 063 Wave 1
