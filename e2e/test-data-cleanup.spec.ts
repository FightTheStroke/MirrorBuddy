/**
 * E2E Test: Test Data Helpers Example
 *
 * Demonstrates usage of createTestUser, createTestConversation, and cleanupTestData helpers.
 * These helpers implement F-04 and F-18 requirements for test data isolation and cleanup.
 *
 * Run: npx playwright test e2e/test-data-cleanup.spec.ts
 */

import { test, expect, afterEach } from "@playwright/test";
import {
  createTestUser,
  createTestConversation,
  createTestMessage,
  cleanupTestData,
  getTestDataRegistry,
} from "./helpers/test-data";

/**
 * Cleanup hook: F-04 automatic cleanup after each test
 * Removes all test data marked with isTestData=true
 */
afterEach(async () => {
  await cleanupTestData();
});

test.describe("Test Data Helpers - F-04, F-18", () => {
  test("createTestUser marks data with isTestData=true", async () => {
    // F-18: Helper creates user with isTestData=true automatically
    const user = await createTestUser({
      email: "testuser@example.com",
      name: "Test User",
      age: 14,
    });

    expect(user.isTestData).toBe(true);
    expect(user.email).toBe("testuser@example.com");
    expect(user.id).toBeDefined();

    // Verify in registry for cleanup
    const registry = getTestDataRegistry();
    expect(registry.userIds.has(user.id)).toBe(true);
  });

  test("createTestConversation marks data with isTestData=true", async () => {
    const user = await createTestUser();
    // F-18: Helper creates conversation with isTestData=true automatically
    const conversation = await createTestConversation({
      userId: user.id,
      maestroId: "euclide-matematica",
      title: "Test Math Conversation",
    });

    expect(conversation.isTestData).toBe(true);
    expect(conversation.userId).toBe(user.id);
    expect(conversation.title).toBe("Test Math Conversation");

    // Verify in registry for cleanup
    const registry = getTestDataRegistry();
    expect(registry.conversationIds.has(conversation.id)).toBe(true);
  });

  test("createTestMessage marks data with isTestData=true", async () => {
    const user = await createTestUser();
    const conversation = await createTestConversation({
      userId: user.id,
    });

    // F-18: Helper creates message with isTestData=true automatically
    const message = await createTestMessage({
      conversationId: conversation.id,
      role: "user",
      content: "Test message content",
    });

    expect(message.isTestData).toBe(true);
    expect(message.conversationId).toBe(conversation.id);
    expect(message.role).toBe("user");
    expect(message.content).toBe("Test message content");

    // Verify in registry for cleanup
    const registry = getTestDataRegistry();
    expect(registry.messageIds.has(message.id)).toBe(true);
  });

  test("cleanupTestData removes all tracked test records (F-04)", async () => {
    const user1 = await createTestUser({ email: "user1@example.com" });
    await createTestUser({ email: "user2@example.com" });
    const conversation = await createTestConversation({ userId: user1.id });
    await createTestMessage({
      conversationId: conversation.id,
      role: "user",
      content: "Message 1",
    });
    await createTestMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: "Message 2",
    });

    // Verify registry has all records
    const registryBefore = getTestDataRegistry();
    expect(registryBefore.userIds.size).toBe(2);
    expect(registryBefore.conversationIds.size).toBe(1);
    expect(registryBefore.messageIds.size).toBe(2);

    // F-04: Clean up all test data
    await cleanupTestData();

    // Verify registry is cleared
    const registryAfter = getTestDataRegistry();
    expect(registryAfter.userIds.size).toBe(0);
    expect(registryAfter.conversationIds.size).toBe(0);
    expect(registryAfter.messageIds.size).toBe(0);
  });

  test("test data is auto-cleaned after test completes (afterEach hook)", async () => {
    // Create test data
    const user = await createTestUser();
    await createTestConversation({ userId: user.id });

    // Verify tracking before cleanup hook runs
    const registry = getTestDataRegistry();
    expect(registry.userIds.size).toBeGreaterThan(0);

    // Note: afterEach hook will call cleanupTestData() automatically
    // Registry should be cleared after this test completes
  });

  test("multiple tests can use helpers without conflicts", async () => {
    // Each test gets a fresh registry thanks to afterEach cleanup
    const user = await createTestUser({ email: "multi-test-user@example.com" });
    const registry = getTestDataRegistry();
    // Should only have data from this test
    expect(registry.userIds.size).toBe(1);
    expect(registry.userIds.has(user.id)).toBe(true);
  });

  test("helpers accept minimal input with sensible defaults", async () => {
    // Create with minimal input
    const user = await createTestUser();
    expect(user.id).toBeDefined();
    expect(user.email).toBeDefined(); // Auto-generated

    const conversation = await createTestConversation({ userId: user.id });
    expect(conversation.id).toBeDefined();
    expect(conversation.maestroId).toBe("euclide-matematica"); // Default maestro

    const message = await createTestMessage({
      conversationId: conversation.id,
      role: "user",
      content: "Quick message",
    });
    expect(message.id).toBeDefined();
  });
});

test.describe("Test Data Helpers - Integration with UI Tests", () => {
  /**
   * Example: Using test data helpers to set up state before UI testing
   * (Demonstrates practical usage pattern for F-04 and F-18)
   */
  test("create test data then verify via API", async ({ request }) => {
    // Create test data with helpers
    const user = await createTestUser();
    const conversation = await createTestConversation({
      userId: user.id,
      title: "Integration Test Conversation",
    });

    // Use in API tests
    const response = await request.get(`/api/conversations/${conversation.id}`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.title).toBe("Integration Test Conversation");
    expect(data.isTestData).toBe(true); // Verify marking

    // afterEach hook will clean up automatically
  });
});
