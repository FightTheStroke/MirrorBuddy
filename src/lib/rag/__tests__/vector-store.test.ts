/**
 * Tests for Vector Store Service
 * @module rag/vector-store
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

// Mock anonymization service
vi.mock("@/lib/privacy/anonymization-service", () => ({
  anonymizeConversationMessage: vi.fn((content: string) => {
    // Simple mock: replace emails and phone numbers with placeholders
    return content
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL]")
      .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, "[PHONE]");
  }),
}));

// Mock prisma - use vi.hoisted to ensure mockPrisma is available during mock hoisting
const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      contentEmbedding: {
        create: vi.fn(),
        findMany: vi.fn(),
        deleteMany: vi.fn(),
        count: vi.fn(),
      },
    },
  };
});

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

// Import after mocks
import {
  storeEmbedding,
  searchSimilar,
  deleteEmbeddings,
  type VectorSearchResult,
  type StoreEmbeddingInput,
} from "../vector-store";
import { anonymizeConversationMessage } from "@/lib/privacy/anonymization-service";

describe("Vector Store Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("storeEmbedding", () => {
    it("should store embedding with correct structure", async () => {
      const input: StoreEmbeddingInput = {
        userId: "user-123",
        sourceType: "material",
        sourceId: "mat-456",
        chunkIndex: 0,
        content: "Test content",
        vector: Array(1536).fill(0.1),
        model: "text-embedding-3-small",
        subject: "mathematics",
      };

      mockPrisma.contentEmbedding.create.mockResolvedValueOnce({
        id: "emb-789",
        ...input,
        vector: JSON.stringify(input.vector),
        dimensions: 1536,
        tokenCount: 5,
        tags: "[]",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await storeEmbedding(input);

      expect(result.id).toBe("emb-789");
      expect(mockPrisma.contentEmbedding.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user-123",
          sourceType: "material",
          sourceId: "mat-456",
          chunkIndex: 0,
          content: "Test content",
          vector: JSON.stringify(input.vector),
          model: "text-embedding-3-small",
          dimensions: 1536,
          subject: "mathematics",
        }),
      });
    });

    it("should throw error for invalid vector dimensions", async () => {
      const input: StoreEmbeddingInput = {
        userId: "user-123",
        sourceType: "material",
        sourceId: "mat-456",
        content: "Test",
        vector: Array(100).fill(0.1), // Wrong dimensions
      };

      await expect(storeEmbedding(input)).rejects.toThrow(
        "Invalid vector dimensions",
      );
    });

    it("should anonymize content containing PII before storing", async () => {
      const input: StoreEmbeddingInput = {
        userId: "user-123",
        sourceType: "message",
        sourceId: "msg-456",
        chunkIndex: 0,
        content: "My email is john.doe@example.com and phone is 555-123-4567",
        vector: Array(1536).fill(0.1),
        model: "text-embedding-3-small",
      };

      mockPrisma.contentEmbedding.create.mockResolvedValueOnce({
        id: "emb-789",
        userId: input.userId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        chunkIndex: 0,
        content: "My email is [EMAIL] and phone is [PHONE]",
        vector: JSON.stringify(input.vector),
        dimensions: 1536,
        tokenCount: 10,
        model: input.model,
        subject: null,
        tags: "[]",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await storeEmbedding(input);

      expect(anonymizeConversationMessage).toHaveBeenCalledWith(input.content);
      expect(mockPrisma.contentEmbedding.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          content: "My email is [EMAIL] and phone is [PHONE]",
        }),
      });
    });
  });

  describe("searchSimilar", () => {
    it("should return results sorted by similarity", async () => {
      const queryVector = Array(1536).fill(0.1);

      // Mock stored embeddings
      const storedEmbeddings = [
        {
          id: "emb-1",
          userId: "user-123",
          sourceType: "material",
          sourceId: "mat-1",
          chunkIndex: 0,
          content: "Very similar content",
          vector: JSON.stringify(Array(1536).fill(0.09)), // Very similar
          model: "text-embedding-3-small",
          dimensions: 1536,
          tokenCount: 10,
          subject: "math",
          tags: "[]",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "emb-2",
          userId: "user-123",
          sourceType: "material",
          sourceId: "mat-2",
          chunkIndex: 0,
          content: "Less similar content",
          vector: JSON.stringify(Array(1536).fill(0.5)), // Less similar
          model: "text-embedding-3-small",
          dimensions: 1536,
          tokenCount: 10,
          subject: "math",
          tags: "[]",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.contentEmbedding.findMany.mockResolvedValueOnce(
        storedEmbeddings,
      );

      const results = await searchSimilar({
        userId: "user-123",
        vector: queryVector,
        limit: 10,
      });

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe("emb-1"); // Most similar first
      expect(results[0].similarity).toBeGreaterThan(results[1].similarity);
    });

    it("should filter by sourceType", async () => {
      mockPrisma.contentEmbedding.findMany.mockResolvedValueOnce([]);

      await searchSimilar({
        userId: "user-123",
        vector: Array(1536).fill(0.1),
        sourceType: "flashcard",
      });

      expect(mockPrisma.contentEmbedding.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sourceType: "flashcard",
          }),
        }),
      );
    });

    it("should filter by subject", async () => {
      mockPrisma.contentEmbedding.findMany.mockResolvedValueOnce([]);

      await searchSimilar({
        userId: "user-123",
        vector: Array(1536).fill(0.1),
        subject: "history",
      });

      expect(mockPrisma.contentEmbedding.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            subject: "history",
          }),
        }),
      );
    });

    it("should respect minSimilarity threshold", async () => {
      const queryVector = Array(1536).fill(0.1);

      const storedEmbeddings = [
        {
          id: "emb-1",
          userId: "user-123",
          sourceType: "material",
          sourceId: "mat-1",
          chunkIndex: 0,
          content: "Content",
          vector: JSON.stringify(Array(1536).fill(-0.5)), // Low similarity
          model: "text-embedding-3-small",
          dimensions: 1536,
          tokenCount: 10,
          subject: null,
          tags: "[]",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.contentEmbedding.findMany.mockResolvedValueOnce(
        storedEmbeddings,
      );

      const results = await searchSimilar({
        userId: "user-123",
        vector: queryVector,
        minSimilarity: 0.8,
      });

      expect(results).toHaveLength(0); // Should be filtered out
    });
  });

  describe("deleteEmbeddings", () => {
    it("should delete embeddings by sourceId", async () => {
      mockPrisma.contentEmbedding.deleteMany.mockResolvedValueOnce({
        count: 3,
      });

      const count = await deleteEmbeddings({
        userId: "user-123",
        sourceType: "material",
        sourceId: "mat-456",
      });

      expect(count).toBe(3);
      expect(mockPrisma.contentEmbedding.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: "user-123",
          sourceType: "material",
          sourceId: "mat-456",
        },
      });
    });

    it("should delete all embeddings of a type", async () => {
      mockPrisma.contentEmbedding.deleteMany.mockResolvedValueOnce({
        count: 10,
      });

      await deleteEmbeddings({
        userId: "user-123",
        sourceType: "studykit",
      });

      expect(mockPrisma.contentEmbedding.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: "user-123",
          sourceType: "studykit",
        },
      });
    });
  });

  describe("VectorSearchResult interface", () => {
    it("should have correct structure", async () => {
      const queryVector = Array(1536).fill(0.1);
      const storedEmbedding = {
        id: "emb-1",
        userId: "user-123",
        sourceType: "material",
        sourceId: "mat-1",
        chunkIndex: 0,
        content: "Content",
        vector: JSON.stringify(queryVector),
        model: "text-embedding-3-small",
        dimensions: 1536,
        tokenCount: 10,
        subject: "math",
        tags: '["test"]',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.contentEmbedding.findMany.mockResolvedValueOnce([
        storedEmbedding,
      ]);

      const results: VectorSearchResult[] = await searchSimilar({
        userId: "user-123",
        vector: queryVector,
      });

      expect(results[0]).toHaveProperty("id");
      expect(results[0]).toHaveProperty("sourceType");
      expect(results[0]).toHaveProperty("sourceId");
      expect(results[0]).toHaveProperty("content");
      expect(results[0]).toHaveProperty("similarity");
      expect(typeof results[0].similarity).toBe("number");
    });
  });

  describe("StoreEmbeddingInput sourceType validation", () => {
    it("should accept conversation_summary as a valid sourceType", async () => {
      const input: StoreEmbeddingInput = {
        userId: "user-123",
        sourceType: "conversation_summary",
        sourceId: "conv-456",
        chunkIndex: 0,
        content: "Conversation summary content",
        vector: Array(1536).fill(0.1),
        model: "text-embedding-3-small",
        subject: "mathematics",
      };

      mockPrisma.contentEmbedding.create.mockResolvedValueOnce({
        id: "emb-789",
        ...input,
        vector: JSON.stringify(input.vector),
        dimensions: 1536,
        tokenCount: 7,
        tags: "[]",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await storeEmbedding(input);

      expect(result.id).toBe("emb-789");
      expect(mockPrisma.contentEmbedding.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sourceType: "conversation_summary",
          sourceId: "conv-456",
        }),
      });
    });

    it("should search embeddings filtered by conversation_summary sourceType", async () => {
      mockPrisma.contentEmbedding.findMany.mockResolvedValueOnce([]);

      await searchSimilar({
        userId: "user-123",
        vector: Array(1536).fill(0.1),
        sourceType: "conversation_summary",
      });

      expect(mockPrisma.contentEmbedding.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sourceType: "conversation_summary",
          }),
        }),
      );
    });
  });
});
