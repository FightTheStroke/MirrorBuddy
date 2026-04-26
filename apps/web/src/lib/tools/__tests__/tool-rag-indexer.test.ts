/**
 * Tests for Tool RAG Indexer - Privacy Integration
 * Verifies that tool outputs are anonymized before embedding
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { indexToolOutput } from "../tool-rag-indexer";
import type { StoredToolOutput } from "../tool-output-types";

// Mock dependencies
vi.mock("@/lib/rag", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/rag")>();
  return {
    ...actual,
    isEmbeddingConfigured: vi.fn().mockReturnValue(true),
  };
});

vi.mock("@/lib/rag/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/rag/server")>();
  return {
    ...actual,
    generatePrivacyAwareEmbedding: vi.fn().mockResolvedValue({
      vector: new Array(1536).fill(0.1),
      model: "text-embedding-ada-002",
      usage: { tokens: 100 },
    }),
    storeEmbedding: vi.fn().mockResolvedValue({
      id: "emb_123",
    }),
  };
});

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

import { generatePrivacyAwareEmbedding } from "@/lib/rag/server";

describe("Tool RAG Indexer - Privacy Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should use generatePrivacyAwareEmbedding instead of generateEmbedding", async () => {
    const toolOutput: StoredToolOutput = {
      id: "tool_123",
      conversationId: "conv_789",
      toolType: "summary",
      toolId: null,
      data: {
        summary: "John Smith studied chemistry at john@example.com",
        content: "This is a test summary",
      },
      createdAt: new Date(),
    };

    await indexToolOutput(toolOutput, "user_456", "conv_789");

    // Verify privacy-aware function was called
    expect(generatePrivacyAwareEmbedding).toHaveBeenCalledTimes(1);
    expect(generatePrivacyAwareEmbedding).toHaveBeenCalledWith(
      expect.stringContaining("studied chemistry"),
    );
  });

  it("should anonymize PII in quiz tool outputs before embedding", async () => {
    const toolOutput: StoredToolOutput = {
      id: "tool_quiz_1",
      conversationId: "conv_123",
      toolType: "quiz",
      toolId: null,
      data: {
        questions: [
          {
            question: "What did Maria Rossi study?",
            answers: [
              { text: "Physics", correct: true },
              { text: "Chemistry", correct: false },
            ],
            explanation: "Maria excelled in physics",
          },
        ],
      },
      createdAt: new Date(),
    };

    await indexToolOutput(toolOutput, "user_456");

    // Verify privacy-aware function was called with extracted quiz text
    expect(generatePrivacyAwareEmbedding).toHaveBeenCalledTimes(1);
    const callArg = (generatePrivacyAwareEmbedding as any).mock.calls[0][0];
    expect(callArg).toContain("study");
    expect(callArg).toContain("Physics");
  });

  it("should anonymize PII in flashcard tool outputs before embedding", async () => {
    const toolOutput: StoredToolOutput = {
      id: "tool_flash_1",
      conversationId: "conv_456",
      toolType: "flashcard",
      toolId: null,
      data: {
        cards: [
          {
            front: "Who discovered penicillin?",
            back: "Alexander Fleming at fleming@research.org",
          },
        ],
      },
      createdAt: new Date(),
    };

    await indexToolOutput(toolOutput, "user_456");

    // Verify privacy-aware function was called
    expect(generatePrivacyAwareEmbedding).toHaveBeenCalledTimes(1);
    const callArg = (generatePrivacyAwareEmbedding as any).mock.calls[0][0];
    expect(callArg).toContain("penicillin");
    expect(callArg).toContain("Fleming");
  });

  it("should handle mindmap tool outputs with privacy", async () => {
    const toolOutput: StoredToolOutput = {
      id: "tool_mindmap_1",
      conversationId: "conv_789",
      toolType: "mindmap",
      toolId: null,
      data: {
        markdown: "# History\n## Contact: historian@museum.org",
      },
      createdAt: new Date(),
    };

    await indexToolOutput(toolOutput, "user_456");

    expect(generatePrivacyAwareEmbedding).toHaveBeenCalledTimes(1);
    const callArg = (generatePrivacyAwareEmbedding as any).mock.calls[0][0];
    expect(callArg).toContain("History");
  });
});
