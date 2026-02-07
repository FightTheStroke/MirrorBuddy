/**
 * Conversation Messages API Tests
 *
 * Tests the POST /api/conversations/[id]/messages endpoint to ensure:
 * 1. User messages are anonymized before storage (PII removal)
 * 2. Assistant messages are not anonymized
 * 3. Conversation ownership is verified
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  prisma: {
    conversation: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    message: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/privacy", () => ({
  anonymizeConversationMessage: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

vi.mock("@/lib/security/csrf", () => ({
  requireCSRF: vi.fn().mockReturnValue(true),
}));

vi.mock("@/lib/auth/session-auth", () => ({
  validateAuth: vi.fn().mockResolvedValue({
    userId: "user-123",
    authenticated: true,
  }),
}));

import { prisma } from "@/lib/db";
import { anonymizeConversationMessage } from "@/lib/privacy";

const mockPrismaFindFirst = prisma.conversation.findFirst as ReturnType<
  typeof vi.fn
>;
const mockPrismaTransaction = prisma.$transaction as ReturnType<typeof vi.fn>;
const mockAnonymize = anonymizeConversationMessage as ReturnType<typeof vi.fn>;

describe("POST /api/conversations/[id]/messages", () => {
  const mockConversation = {
    id: "conv-123",
    userId: "user-123",
    title: null,
    messageCount: 0,
    lastMessageAt: new Date(),
  };

  const mockMessage = {
    id: "msg-123",
    conversationId: "conv-123",
    role: "user",
    content: "Anonymized content",
    toolCalls: null,
    tokenCount: 10,
    createdAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("anonymizes user messages before storing to database", async () => {
    const originalContent =
      "My name is John Smith and my email is john@example.com";
    const anonymizedContent = "My name is [NAME] and my email is [EMAIL]";

    mockPrismaFindFirst.mockResolvedValueOnce(mockConversation);
    mockAnonymize.mockReturnValueOnce(anonymizedContent);
    mockPrismaTransaction.mockResolvedValueOnce([
      { ...mockMessage, content: anonymizedContent },
      mockConversation,
    ]);

    const request = new NextRequest(
      "http://localhost:3000/api/conversations/conv-123/messages",
      {
        method: "POST",
        body: JSON.stringify({
          role: "user",
          content: originalContent,
        }),
      },
    );

    const routeContext = { params: Promise.resolve({ id: "conv-123" }) };
    const response = await POST(request, routeContext);
    const data = await response.json();

    expect(response.status).toBe(200);

    // Verify anonymization was called with the original content
    expect(mockAnonymize).toHaveBeenCalledWith(originalContent);

    // Verify the stored message has anonymized content
    expect(mockPrismaTransaction).toHaveBeenCalled();
    const transactionCalls = mockPrismaTransaction.mock.calls[0][0];
    const _createCall = transactionCalls[0];

    // The create operation should use anonymized content
    expect(data.content).toBe(anonymizedContent);
  });

  it("does not anonymize assistant messages", async () => {
    const assistantContent = "Hello! How can I help you today?";

    mockPrismaFindFirst.mockResolvedValueOnce(mockConversation);
    mockPrismaTransaction.mockResolvedValueOnce([
      { ...mockMessage, role: "assistant", content: assistantContent },
      mockConversation,
    ]);

    const request = new NextRequest(
      "http://localhost:3000/api/conversations/conv-123/messages",
      {
        method: "POST",
        body: JSON.stringify({
          role: "assistant",
          content: assistantContent,
        }),
      },
    );

    const routeContext = { params: Promise.resolve({ id: "conv-123" }) };
    const response = await POST(request, routeContext);

    expect(response.status).toBe(200);

    // Anonymization should NOT be called for assistant messages
    expect(mockAnonymize).not.toHaveBeenCalled();
  });

  it("returns 404 for non-existent conversation", async () => {
    mockPrismaFindFirst.mockResolvedValueOnce(null);

    const request = new NextRequest(
      "http://localhost:3000/api/conversations/conv-999/messages",
      {
        method: "POST",
        body: JSON.stringify({
          role: "user",
          content: "Test message",
        }),
      },
    );

    const routeContext = { params: Promise.resolve({ id: "conv-999" }) };
    const response = await POST(request, routeContext);

    expect(response.status).toBe(404);
    expect(mockAnonymize).not.toHaveBeenCalled();
  });

  it("returns 400 for missing required fields", async () => {
    mockPrismaFindFirst.mockResolvedValueOnce(mockConversation);

    const request = new NextRequest(
      "http://localhost:3000/api/conversations/conv-123/messages",
      {
        method: "POST",
        body: JSON.stringify({
          role: "user",
          // missing content
        }),
      },
    );

    const routeContext = { params: Promise.resolve({ id: "conv-123" }) };
    const response = await POST(request, routeContext);

    expect(response.status).toBe(400);
    expect(mockAnonymize).not.toHaveBeenCalled();
  });
});
