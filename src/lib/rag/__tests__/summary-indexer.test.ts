/**
 * Tests for Summary Indexer
 * @module rag/summary-indexer
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Hoist all mocks to ensure they're available during module mocking
const { mockGenerateEmbedding, mockStoreEmbedding, mockPrisma } = vi.hoisted(
  () => {
    return {
      mockGenerateEmbedding: vi.fn(),
      mockStoreEmbedding: vi.fn(),
      mockPrisma: {
        contentEmbedding: {
          findFirst: vi.fn(),
          delete: vi.fn(),
        },
      },
    };
  },
);

// Mock logger
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

// Mock embedding service
vi.mock("../embedding-service", () => ({
  generateEmbedding: mockGenerateEmbedding,
}));

// Mock vector store
vi.mock("../vector-store", () => ({
  storeEmbedding: mockStoreEmbedding,
}));

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

// Import after mocks
import { indexConversationSummary } from "../summary-indexer";

describe("Summary Indexer", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock for no existing embedding
    mockPrisma.contentEmbedding.findFirst.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("indexConversationSummary", () => {
    it("should successfully index a conversation summary", async () => {
      const conversationId = "conv-123";
      const userId = "user-456";
      const summary =
        "Student practiced multiplication tables with Euclide. Made good progress on 7x table.";
      const metadata = {
        maestroId: "euclide-matematica",
        topics: ["multiplication", "math"],
      };

      const mockVector = Array(1536).fill(0.1);
      mockGenerateEmbedding.mockResolvedValueOnce({
        vector: mockVector,
        model: "text-embedding-3-small",
        usage: { tokens: 20 },
      });

      mockStoreEmbedding.mockResolvedValueOnce({
        id: "emb-789",
        userId,
        sourceType: "conversation_summary",
        sourceId: conversationId,
        content: summary,
        vector: JSON.stringify(mockVector),
      });

      await indexConversationSummary(conversationId, userId, summary, metadata);

      // Should generate embedding
      expect(mockGenerateEmbedding).toHaveBeenCalledWith(summary);

      // Should store with correct structure
      expect(mockStoreEmbedding).toHaveBeenCalledWith({
        userId,
        sourceType: "conversation_summary",
        sourceId: conversationId,
        chunkIndex: 0,
        content: summary,
        vector: mockVector,
        model: "text-embedding-3-small",
        subject: undefined,
        tags: expect.arrayContaining([
          "maestro:euclide-matematica",
          "topic:multiplication",
          "topic:math",
        ]),
      });
    });

    it("should handle duplicate conversationIds with upsert", async () => {
      const conversationId = "conv-123";
      const userId = "user-456";
      const summary = "Updated summary content";

      // Mock existing embedding
      mockPrisma.contentEmbedding.findFirst.mockResolvedValueOnce({
        id: "existing-emb-123",
        userId,
        sourceType: "conversation_summary",
        sourceId: conversationId,
      });

      const mockVector = Array(1536).fill(0.2);
      mockGenerateEmbedding.mockResolvedValueOnce({
        vector: mockVector,
        model: "text-embedding-3-small",
        usage: { tokens: 15 },
      });

      mockPrisma.contentEmbedding.delete.mockResolvedValueOnce({
        id: "existing-emb-123",
      });

      mockStoreEmbedding.mockResolvedValueOnce({
        id: "new-emb-456",
        userId,
        sourceType: "conversation_summary",
        sourceId: conversationId,
        content: summary,
      });

      await indexConversationSummary(conversationId, userId, summary);

      // Should check for existing embedding
      expect(mockPrisma.contentEmbedding.findFirst).toHaveBeenCalledWith({
        where: {
          userId,
          sourceType: "conversation_summary",
          sourceId: conversationId,
        },
      });

      // Should delete old embedding
      expect(mockPrisma.contentEmbedding.delete).toHaveBeenCalledWith({
        where: { id: "existing-emb-123" },
      });

      // Should create new embedding
      expect(mockStoreEmbedding).toHaveBeenCalled();
    });

    it("should handle errors from embedding service", async () => {
      mockGenerateEmbedding.mockRejectedValueOnce(
        new Error("Azure embedding API unavailable"),
      );

      await expect(
        indexConversationSummary("conv-123", "user-456", "Test summary"),
      ).rejects.toThrow("Azure embedding API unavailable");

      expect(mockStoreEmbedding).not.toHaveBeenCalled();
    });

    it("should handle empty summary text", async () => {
      await expect(
        indexConversationSummary("conv-123", "user-456", ""),
      ).rejects.toThrow("Summary text cannot be empty");

      expect(mockGenerateEmbedding).not.toHaveBeenCalled();
    });

    it("should index without optional metadata", async () => {
      const conversationId = "conv-789";
      const userId = "user-101";
      const summary = "Simple summary without metadata";

      const mockVector = Array(1536).fill(0.3);
      mockGenerateEmbedding.mockResolvedValueOnce({
        vector: mockVector,
        model: "text-embedding-3-small",
        usage: { tokens: 10 },
      });

      mockStoreEmbedding.mockResolvedValueOnce({
        id: "emb-999",
      });

      await indexConversationSummary(conversationId, userId, summary);

      expect(mockStoreEmbedding).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          sourceType: "conversation_summary",
          sourceId: conversationId,
          content: summary,
          tags: [],
        }),
      );
    });

    it("should format metadata as tags correctly", async () => {
      const metadata = {
        maestroId: "galileo",
        topics: ["physics", "astronomy", "gravity"],
      };

      const mockVector = Array(1536).fill(0.4);
      mockGenerateEmbedding.mockResolvedValueOnce({
        vector: mockVector,
        model: "text-embedding-3-small",
        usage: { tokens: 25 },
      });

      mockStoreEmbedding.mockResolvedValueOnce({ id: "emb-111" });

      await indexConversationSummary(
        "conv-456",
        "user-789",
        "Physics lesson",
        metadata,
      );

      expect(mockStoreEmbedding).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: [
            "maestro:galileo",
            "topic:physics",
            "topic:astronomy",
            "topic:gravity",
          ],
        }),
      );
    });

    it("should handle storing embedding error", async () => {
      const mockVector = Array(1536).fill(0.5);
      mockGenerateEmbedding.mockResolvedValueOnce({
        vector: mockVector,
        model: "text-embedding-3-small",
        usage: { tokens: 15 },
      });

      mockStoreEmbedding.mockRejectedValueOnce(
        new Error("Database connection failed"),
      );

      await expect(
        indexConversationSummary("conv-123", "user-456", "Test summary"),
      ).rejects.toThrow("Database connection failed");

      expect(mockGenerateEmbedding).toHaveBeenCalled();
      expect(mockStoreEmbedding).toHaveBeenCalled();
    });

    it("should handle metadata with special characters in topics", async () => {
      const metadata = {
        maestroId: "euclide",
        topics: ["algebra & geometry", "linear-equations", "vector spaces"],
      };

      const mockVector = Array(1536).fill(0.6);
      mockGenerateEmbedding.mockResolvedValueOnce({
        vector: mockVector,
        model: "text-embedding-3-small",
        usage: { tokens: 18 },
      });

      mockStoreEmbedding.mockResolvedValueOnce({ id: "emb-555" });

      await indexConversationSummary(
        "conv-999",
        "user-888",
        "Math lesson",
        metadata,
      );

      expect(mockStoreEmbedding).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: expect.arrayContaining([
            "topic:algebra & geometry",
            "topic:linear-equations",
            "topic:vector spaces",
          ]),
        }),
      );
    });

    it("should handle empty topics array in metadata", async () => {
      const metadata = {
        maestroId: "mozart",
        topics: [],
      };

      const mockVector = Array(1536).fill(0.7);
      mockGenerateEmbedding.mockResolvedValueOnce({
        vector: mockVector,
        model: "text-embedding-3-small",
        usage: { tokens: 12 },
      });

      mockStoreEmbedding.mockResolvedValueOnce({ id: "emb-666" });

      await indexConversationSummary(
        "conv-111",
        "user-222",
        "Music lesson",
        metadata,
      );

      expect(mockStoreEmbedding).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ["maestro:mozart"],
        }),
      );
    });

    it("should handle whitespace-only summary text", async () => {
      await expect(
        indexConversationSummary("conv-123", "user-456", "   \t\n   "),
      ).rejects.toThrow("Summary text cannot be empty");

      expect(mockGenerateEmbedding).not.toHaveBeenCalled();
      expect(mockStoreEmbedding).not.toHaveBeenCalled();
    });

    it("should preserve embedding model name", async () => {
      const mockVector = Array(1536).fill(0.8);
      mockGenerateEmbedding.mockResolvedValueOnce({
        vector: mockVector,
        model: "text-embedding-3-large",
        usage: { tokens: 30 },
      });

      mockStoreEmbedding.mockResolvedValueOnce({ id: "emb-777" });

      await indexConversationSummary("conv-333", "user-444", "Test summary");

      expect(mockStoreEmbedding).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "text-embedding-3-large",
        }),
      );
    });

    it("should handle metadata with only maestroId (no topics)", async () => {
      const metadata = { maestroId: "lovelace" };

      const mockVector = Array(1536).fill(0.9);
      mockGenerateEmbedding.mockResolvedValueOnce({
        vector: mockVector,
        model: "text-embedding-3-small",
        usage: { tokens: 20 },
      });

      mockStoreEmbedding.mockResolvedValueOnce({ id: "emb-888" });

      await indexConversationSummary(
        "conv-555",
        "user-666",
        "CS lesson",
        metadata,
      );

      expect(mockStoreEmbedding).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ["maestro:lovelace"],
        }),
      );
    });
  });
});
