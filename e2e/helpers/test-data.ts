/**
 * E2E Test Data Helpers
 *
 * Provides convenient functions for creating test data with automatic isTestData marking
 * and cleanup hooks. Implements F-04 and F-18 requirements.
 *
 * Usage:
 *   import { createTestUser, createTestConversation, cleanupTestData } from './helpers/test-data';
 *
 *   test('my feature', async () => {
 *     const user = await createTestUser({ email: 'test@example.com' });
 *     const conversation = await createTestConversation({ userId: user.id });
 *     // ... test code ...
 *     await cleanupTestData(); // Runs automatically with afterEach hook
 *   });
 */

import { getPrismaClient } from "./prisma-setup";
import {
  trackTestRecord,
  getTestDataRegistry,
  getInternalRegistry,
  clearTestDataRegistry,
} from "./test-data-registry";

export { disconnectPrisma } from "./prisma-setup";
export { getTestDataRegistry };

// ============================================================================
// Test User Creation
// ============================================================================

interface CreateTestUserInput {
  email?: string;
  username?: string;
  name?: string;
  age?: number;
  role?: "USER" | "ADMIN";
  disabled?: boolean;
}

interface TestUser {
  id: string;
  email: string | null;
  username: string | null;
  role: string;
  isTestData: boolean;
}

/**
 * Create a test user with isTestData=true
 * Automatically tracks the user for cleanup
 *
 * F-18: Helper automatically marks isTestData=true
 */
export async function createTestUser(
  input?: CreateTestUserInput,
): Promise<TestUser> {
  const prisma = getPrismaClient();

  const email = input?.email || `test-${Date.now()}@example.com`;
  const username = input?.username || `testuser_${Date.now()}`;

  const user = await prisma.user.create({
    data: {
      email,
      username,
      isTestData: true, // F-18: Automatically mark as test data
      role: input?.role || "USER",
      disabled: input?.disabled || false,
      profile: {
        create: {
          name: input?.name || "Test User",
          age: input?.age || 12,
        },
      },
      settings: {
        create: {},
      },
    },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      isTestData: true,
    },
  });

  trackTestRecord("userIds", user.id);
  return user;
}

// ============================================================================
// Test Conversation Creation
// ============================================================================

interface CreateTestConversationInput {
  userId: string;
  maestroId?: string;
  title?: string;
  isParentMode?: boolean;
}

interface TestConversation {
  id: string;
  userId: string;
  maestroId: string;
  title: string | null;
  isTestData: boolean;
}

/**
 * Create a test conversation with isTestData=true
 * Automatically tracks the conversation for cleanup
 *
 * F-18: Helper automatically marks isTestData=true
 */
export async function createTestConversation(
  input: CreateTestConversationInput,
): Promise<TestConversation> {
  const prisma = getPrismaClient();

  const conversation = await prisma.conversation.create({
    data: {
      userId: input.userId,
      maestroId: input.maestroId || "euclide-matematica",
      title: input.title || `Test Conversation ${Date.now()}`,
      isParentMode: input.isParentMode || false,
      isTestData: true, // F-18: Automatically mark as test data
    },
    select: {
      id: true,
      userId: true,
      maestroId: true,
      title: true,
      isTestData: true,
    },
  });

  trackTestRecord("conversationIds", conversation.id);
  return conversation;
}

// ============================================================================
// Test Message Creation
// ============================================================================

interface CreateTestMessageInput {
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  tokenCount?: number;
}

interface TestMessage {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  isTestData: boolean;
}

/**
 * Create a test message with isTestData=true
 * Automatically tracks the message for cleanup
 *
 * F-18: Helper automatically marks isTestData=true
 */
export async function createTestMessage(
  input: CreateTestMessageInput,
): Promise<TestMessage> {
  const prisma = getPrismaClient();

  const message = await prisma.message.create({
    data: {
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      tokenCount: input.tokenCount || 0,
      isTestData: true, // F-18: Automatically mark as test data
    },
    select: {
      id: true,
      conversationId: true,
      role: true,
      content: true,
      isTestData: true,
    },
  });

  trackTestRecord("messageIds", message.id);
  return message;
}

// ============================================================================
// Test Data Cleanup (F-04)
// ============================================================================

/**
 * Clean up all test data created during the test
 * Uses isTestData flag for cleanup isolation
 *
 * F-04: Cleanup automatico in afterEach/afterAll con marcatura dati test
 */
export async function cleanupTestData(): Promise<void> {
  const prisma = getPrismaClient();
  const registry = getInternalRegistry();

  try {
    // Use transaction for atomicity
    await prisma.$transaction(async (tx) => {
      // Delete messages first (to avoid FK constraint issues)
      if (registry.messageIds.size > 0) {
        await tx.message.deleteMany({
          where: {
            id: { in: Array.from(registry.messageIds) },
          },
        });
      }

      // Delete conversations (cascade will handle ToolOutput records)
      if (registry.conversationIds.size > 0) {
        await tx.conversation.deleteMany({
          where: {
            id: { in: Array.from(registry.conversationIds) },
          },
        });
      }

      // Delete users (cascade will handle Profile, Settings, and other relations)
      if (registry.userIds.size > 0) {
        await tx.user.deleteMany({
          where: {
            id: { in: Array.from(registry.userIds) },
          },
        });
      }
    });

    // Clear the registry after cleanup
    clearTestDataRegistry();
  } catch (error) {
    console.error("Error cleaning up test data:", error);
    throw error;
  }
}
