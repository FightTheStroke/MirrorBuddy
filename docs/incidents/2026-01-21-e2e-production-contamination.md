# Incident Report: E2E Tests Contaminated Production Database

**Date**: 2026-01-21
**Severity**: CRITICAL
**Status**: RESOLVED

## Summary

E2E tests accidentally wrote to the production Supabase database instead of the local test database, contaminating production data with 66 test users and their associated data.

## Timeline

1. **20:00 CET** - E2E tests ran locally after database sync
2. **20:15 CET** - User discovered test data in production Supabase
3. **20:20 CET** - Emergency cleanup script executed
4. **20:25 CET** - Production database cleaned (66 test users removed, 2 real users preserved)
5. **20:30 CET** - Prevention measures implemented

## Root Cause

The `playwright.config.ts` webServer configuration had a fallback chain that used `process.env.DATABASE_URL` from `.env`:

```typescript
// INCORRECT - Before fix
DATABASE_URL:
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||  // ❌ This loaded production Supabase URL!
  "postgresql://postgres:postgres@localhost:5432/mirrorbuddy_test",
```

When `TEST_DATABASE_URL` was not set in the environment, it fell back to `DATABASE_URL` which contained the production Supabase connection string from `.env`.

## Impact

- **66 test users** created in production database
- **Associated test data**: Profiles, Settings, Conversations
- **Real users affected**: None (2 real users preserved)
- **Data loss**: None (only test data deleted)
- **Downtime**: None

## Resolution

### Immediate Actions (Emergency Cleanup)

Created and executed `scripts/emergency-cleanup-final.ts`:

- Identified 2 real users to preserve:
  - roberdan@fightthestroke.org
  - mariodanfts@gmail.com
- Deleted all data for 66 test users:
  - 66 Profiles
  - 66 Settings
  - 0 Conversations (none found)
- Deleted 66 test user accounts
- Verified 2 real users remain

### Prevention Measures

#### 1. Updated `playwright.config.ts`

- **Removed `DATABASE_URL` fallback** from webServer env
- **Added production URL blocker**: Throws error if URL contains "supabase.com"
- **Added warning**: Logs warning if DATABASE_URL contains production URL

```typescript
// CORRECT - After fix
const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ||
  "postgresql://roberdan@localhost:5432/mirrorbuddy_test";

// BLOCKER: Reject production URLs
if (testDatabaseUrl.includes("supabase.com")) {
  throw new Error("❌ BLOCKED: E2E tests cannot use production database!");
}
```

#### 2. Updated `src/lib/db.ts`

- **Added Supabase URL blocker** in E2E mode
- **Throws error** if TEST_DATABASE_URL contains "supabase.com"
- **Double protection layer** (config + runtime)

```typescript
// In E2E mode
if (testDatabaseUrl.includes("supabase.com")) {
  throw new Error(
    "❌ BLOCKED: E2E test attempted to use production Supabase database!",
  );
}
```

#### 3. Created Test Environment File

- `playwright.config.env.test` - Explicit test-only environment variables
- Ensures E2E tests have correct DATABASE_URL

## Verification

```bash
# Test that production URL is blocked
TEST_DATABASE_URL=postgres://...@supabase.com/postgres npx playwright test
# Expected: Error "BLOCKED: E2E tests cannot use production database!"

# Test with correct local URL
TEST_DATABASE_URL=postgresql://roberdan@localhost:5432/mirrorbuddy_test npx playwright test
# Expected: Tests run successfully
```

## Lessons Learned

### What Went Wrong

1. **Fallback chain** allowed production URL to leak into tests
2. **No validation** of database URL format before use
3. **Silent failure** - no warning when falling back to production URL

### What Went Right

1. **Fast detection** - User noticed immediately
2. **Data preservation** - All real user data preserved
3. **Quick recovery** - Cleanup completed in 10 minutes

### Improvements Made

1. **Multiple protection layers** - Config validation + runtime validation
2. **Explicit errors** - Clear error messages for production URL attempts
3. **Documentation** - This incident report for future reference
4. **CI safeguards** - Tests will fail if production URL detected

## Action Items

- [x] Clean production database
- [x] Add URL validation in playwright.config.ts
- [x] Add URL validation in src/lib/db.ts
- [x] Create test environment file
- [x] Document incident
- [ ] Add CI check to verify TEST_DATABASE_URL is set
- [ ] Add pre-commit hook to warn about production URLs in test config
- [ ] Review other places where DATABASE_URL might leak

## Related Files

- `playwright.config.ts` - Test configuration with URL validation
- `src/lib/db.ts` - Database client with E2E URL blocker
- `scripts/emergency-cleanup-final.ts` - Emergency cleanup script
- `.env` - Contains production DATABASE_URL (DO NOT use in tests)

## References

- ADR 0059: E2E Test Setup Requirements
- `.claude/rules/e2e-testing.md` - E2E testing rules
