# E2E Test Helpers

Test data helpers for creating isolated test data with automatic cleanup.

Implements F-04 and F-18 requirements for test data isolation and cleanup.

## Modules

### `test-data.ts` (Main API)

Primary module for creating test data. Exports:

- `createTestUser(input?)` - Create a test user with isTestData=true
- `createTestConversation(input)` - Create a test conversation
- `createTestMessage(input)` - Create a test message
- `cleanupTestData()` - Delete all tracked test data
- `getTestDataRegistry()` - Get current tracked records (for debugging)
- `disconnectPrisma()` - Disconnect database client

### `test-data-registry.ts`

Tracks created test records for cleanup and debugging.

### `prisma-setup.ts`

Singleton Prisma client with SSL configuration for Supabase (ADR 0063).

## Quick Start

### Basic Usage

```typescript
import { test, afterEach } from "@playwright/test";
import {
  createTestUser,
  createTestConversation,
  cleanupTestData,
} from "./helpers/test-data";

// Cleanup after each test
afterEach(async () => {
  await cleanupTestData();
});

test("my feature", async () => {
  // Create test data (automatically marked with isTestData=true)
  const user = await createTestUser({
    email: "testuser@example.com",
    name: "Test User",
    age: 14,
  });

  const conversation = await createTestConversation({
    userId: user.id,
    maestroId: "euclide-matematica",
    title: "Test Conversation",
  });

  const message = await createTestMessage({
    conversationId: conversation.id,
    role: "user",
    content: "Hello, Euclide!",
  });

  // ... test code ...
  // cleanupTestData() runs automatically after test via afterEach hook
});
```

### Features

#### F-18: Automatic isTestData Marking

All helper functions automatically set `isTestData=true`:

```typescript
const user = await createTestUser();
console.log(user.isTestData); // true

const conversation = await createTestConversation({ userId: user.id });
console.log(conversation.isTestData); // true
```

#### F-04: Automatic Cleanup

Cleanup runs automatically after each test:

```typescript
afterEach(async () => {
  await cleanupTestData(); // Deletes all tracked test data
});
```

Or manually in afterAll:

```typescript
import { test, afterAll } from "@playwright/test";

test.describe("Group of tests", () => {
  afterAll(async () => {
    await cleanupTestData();
  });

  test("test 1", async () => {
    const user = await createTestUser();
    // ...
  });

  test("test 2", async () => {
    const user = await createTestUser();
    // ...
  });
});
```

#### Transactional Cleanup

Cleanup uses database transactions for atomicity:

```typescript
// All deletes happen in a single transaction
// If any delete fails, the entire transaction rolls back
await cleanupTestData();
```

#### Type-Safe Interfaces

All helpers are type-safe:

```typescript
const user: TestUser = await createTestUser();
// TypeScript knows user.id, user.email, user.isTestData

const conversation: TestConversation = await createTestConversation({
  userId: user.id,
});
// Properties type-checked at compile time
```

## Advanced Usage

### Debugging - Get Test Data Registry

```typescript
import { getTestDataRegistry } from "./helpers/test-data";

test("debug test data", async () => {
  const user = await createTestUser();
  const conversation = await createTestConversation({ userId: user.id });

  const registry = getTestDataRegistry();
  console.log("Tracked users:", registry.userIds); // Set { "user-id-1" }
  console.log("Tracked conversations:", registry.conversationIds); // Set { "conv-id-1" }
});
```

### Disconnect on Test Suite Completion

```typescript
import { test, afterAll } from "@playwright/test";
import { disconnectPrisma } from "./helpers/test-data";

test.describe("E2E Suite", () => {
  afterAll(async () => {
    await disconnectPrisma();
  });

  test("test 1", async () => {
    // ...
  });
});
```

### Multi-Test Isolation

Each test's data is cleaned up automatically, so tests don't interfere:

```typescript
afterEach(async () => {
  await cleanupTestData();
});

test("test 1", async () => {
  const user1 = await createTestUser({ email: "user1@test.com" });
  // user1 is cleaned up after test 1
});

test("test 2", async () => {
  const user2 = await createTestUser({ email: "user2@test.com" });
  // user2 is cleaned up after test 2
  // user1 is already gone - no conflicts
});
```

## Database Isolation

Test data is isolated by the `isTestData=true` flag:

```sql
-- Only test data
SELECT * FROM "User" WHERE "isTestData" = true;

-- Production data is never affected
SELECT * FROM "User" WHERE "isTestData" = false;
```

## Configuration

### Environment Variables

- `TEST_DATABASE_URL` - Test database connection string (required)
- `NODE_ENV` - Must be `development` or `test` (not production)
- `SUPABASE_CA_CERT` - SSL certificate for Supabase (optional)

Example `.env.test`:

```bash
TEST_DATABASE_URL="postgresql://user:pass@localhost/mirrorbuddy_test"
NODE_ENV=test
```

## Cleanup Strategy

### Per-Test Cleanup (Recommended)

```typescript
test.afterEach(async () => {
  await cleanupTestData();
});
```

Benefits:

- Each test starts with clean database state
- No test data accumulation
- Failed tests don't leave residual data

### Per-Suite Cleanup

```typescript
test.describe("Feature Group", () => {
  test.afterAll(async () => {
    await cleanupTestData();
  });

  test("test 1", () => {});
  test("test 2", () => {});
});
```

Benefits:

- Faster execution if tests are independent
- Data available for manual inspection after tests

### Global Cleanup

```typescript
// e2e/global-teardown.ts
// Already configured in playwright.config.ts
// Cleans up ALL test data by isTestData flag
```

Benefits:

- Safety net - catches any missed cleanups
- Handles failed tests gracefully

## Testing the Helpers

Example test file: `test-data-cleanup.spec.ts`

Run the example tests:

```bash
npx playwright test e2e/test-data-cleanup.spec.ts
```

This verifies:

- Helpers create data with isTestData=true
- Tracking works correctly
- Cleanup removes all data
- afterEach hook cleans up automatically

## Troubleshooting

### Test Data Not Cleaned Up

**Problem**: Test data remains after test completes

**Solution**: Ensure afterEach hook is called

```typescript
test.afterEach(async () => {
  await cleanupTestData();
});
```

### Connection Errors

**Problem**: `Connection refused` or SSL errors

**Solution**: Verify `TEST_DATABASE_URL` is correct

```bash
# Test connection
psql "$TEST_DATABASE_URL" -c "SELECT 1;"
```

### Cascade Delete Not Working

**Problem**: Related records not deleted

**Solution**: Verify schema has `onDelete: Cascade`

```prisma
model Conversation {
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### Registry Not Cleared

**Problem**: Registry still has old IDs after cleanup

**Solution**: Ensure cleanup completes successfully

```typescript
try {
  await cleanupTestData();
} catch (error) {
  console.error("Cleanup failed:", error);
}
```

## F-xx Requirements

### F-04: Cleanup automatico in afterEach/afterAll

✓ `cleanupTestData()` removes all isTestData=true records
✓ Uses transactional cleanup for atomicity
✓ Can be called in afterEach or afterAll hooks
✓ Also used in global-teardown.ts for safety

### F-18: Test helper: createTestUser() marca automaticamente isTestData=true

✓ `createTestUser()` always sets isTestData=true
✓ `createTestConversation()` always sets isTestData=true
✓ `createTestMessage()` always sets isTestData=true
✓ No manual marking required

## Related Files

- `test-data.ts` - Main API (245 lines)
- `test-data-registry.ts` - Tracking (52 lines)
- `prisma-setup.ts` - Database client (57 lines)
- `test-data-cleanup.spec.ts` - Example tests (181 lines)
- `../global-teardown.ts` - Global cleanup (126 lines)
- `../global-setup.ts` - Global setup (150 lines)

All files under 250-line limit per code standards.
