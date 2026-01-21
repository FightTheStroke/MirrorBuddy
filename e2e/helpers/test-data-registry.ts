/**
 * Test Data Registry
 *
 * Tracks test records created during E2E tests for cleanup and debugging.
 * Implements F-04 and F-18 requirements.
 */

export interface TestDataRegistry {
  userIds: Set<string>;
  conversationIds: Set<string>;
  messageIds: Set<string>;
}

const testDataRegistry: TestDataRegistry = {
  userIds: new Set(),
  conversationIds: new Set(),
  messageIds: new Set(),
};

/**
 * Track a test record for later cleanup
 */
export function trackTestRecord(
  type: keyof TestDataRegistry,
  id: string,
): void {
  testDataRegistry[type].add(id);
}

/**
 * Get the current test data registry (for debugging and verification)
 */
export function getTestDataRegistry(): TestDataRegistry {
  return {
    userIds: new Set(testDataRegistry.userIds),
    conversationIds: new Set(testDataRegistry.conversationIds),
    messageIds: new Set(testDataRegistry.messageIds),
  };
}

/**
 * Clear the test data registry (call after cleanup)
 */
export function clearTestDataRegistry(): void {
  testDataRegistry.userIds.clear();
  testDataRegistry.conversationIds.clear();
  testDataRegistry.messageIds.clear();
}

/**
 * Get internal registry reference (for cleanup operations)
 */
export function getInternalRegistry(): TestDataRegistry {
  return testDataRegistry;
}
