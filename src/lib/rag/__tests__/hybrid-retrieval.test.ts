/**
 * Tests for Hybrid Retrieval Service
 * @module rag/hybrid-retrieval
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock embedding service
vi.mock("../embedding-service", () => ({
  generateEmbedding: vi.fn(),
  cosineSimilarity: vi.fn(),
}));

// Mock vector store - use vi.hoisted
const { mockSearchSimilar } = vi.hoisted(() => ({
  mockSearchSimilar: vi.fn(),
}));

vi.mock("../vector-store", () => ({
  searchSimilar: mockSearchSimilar,
}));

// Mock Prisma - use vi.hoisted
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    $queryRaw: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

import { hybridSearch, textSimilarity } from "../hybrid-retrieval";
import { generateEmbedding, cosineSimilarity } from "../embedding-service";

describe("Hybrid Retrieval Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("hybridSearch", () => {
    it("should combine semantic and keyword search results", async () => {
      const mockVector = Array(1536).fill(0.1);
      vi.mocked(generateEmbedding).mockResolvedValue({
        vector: mockVector,
        model: "text-embedding-3-small",
        usage: { tokens: 10 },
      });

      // Semantic results
      mockSearchSimilar.mockResolvedValue([
        {
          id: "emb-1",
          sourceType: "material",
          sourceId: "mat-1",
          chunkIndex: 0,
          content: "Roman Empire history and culture",
          similarity: 0.9,
          subject: "history",
          tags: [],
        },
      ]);

      // Keyword results
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          id: "emb-2",
          sourceType: "material",
          sourceId: "mat-2",
          chunkIndex: 0,
          content: "Ancient Rome civilization",
          subject: "history",
          tags: '["rome"]',
        },
      ]);

      const results = await hybridSearch({
        userId: "user-123",
        query: "Roman Empire history",
        limit: 5,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty("combinedScore");
      expect(results[0]).toHaveProperty("semanticScore");
      expect(results[0]).toHaveProperty("keywordScore");
    });

    it("should weight semantic and keyword scores according to semanticWeight", async () => {
      vi.mocked(generateEmbedding).mockResolvedValue({
        vector: Array(1536).fill(0.1),
        model: "text-embedding-3-small",
        usage: { tokens: 10 },
      });

      mockSearchSimilar.mockResolvedValue([
        {
          id: "emb-1",
          sourceType: "material",
          sourceId: "mat-1",
          chunkIndex: 0,
          content: "Test content",
          similarity: 1.0,
          subject: null,
          tags: [],
        },
      ]);

      mockPrisma.$queryRaw.mockResolvedValue([]);

      // With high semantic weight, semantic-only result should have high score
      const results = await hybridSearch({
        userId: "user-123",
        query: "test",
        semanticWeight: 0.9,
      });

      if (results.length > 0) {
        expect(results[0].semanticScore).toBe(1.0);
        expect(results[0].keywordScore).toBe(0);
        // Combined should be 0.9 * 1.0 + 0.1 * 0 = 0.9
        expect(results[0].combinedScore).toBeCloseTo(0.9, 1);
      }
    });

    it("should filter by sourceType", async () => {
      vi.mocked(generateEmbedding).mockResolvedValue({
        vector: Array(1536).fill(0.1),
        model: "text-embedding-3-small",
        usage: { tokens: 10 },
      });

      mockSearchSimilar.mockResolvedValue([]);
      mockPrisma.$queryRaw.mockResolvedValue([]);

      await hybridSearch({
        userId: "user-123",
        query: "test",
        sourceType: "flashcard",
      });

      expect(mockSearchSimilar).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceType: "flashcard",
        }),
      );
    });

    it("should exclude specified source IDs", async () => {
      vi.mocked(generateEmbedding).mockResolvedValue({
        vector: Array(1536).fill(0.1),
        model: "text-embedding-3-small",
        usage: { tokens: 10 },
      });

      mockSearchSimilar.mockResolvedValue([
        {
          id: "emb-1",
          sourceType: "material",
          sourceId: "mat-keep",
          chunkIndex: 0,
          content: "Keep this",
          similarity: 0.9,
          subject: null,
          tags: [],
        },
        {
          id: "emb-2",
          sourceType: "material",
          sourceId: "mat-exclude",
          chunkIndex: 0,
          content: "Exclude this",
          similarity: 0.85,
          subject: null,
          tags: [],
        },
      ]);

      mockPrisma.$queryRaw.mockResolvedValue([]);

      const results = await hybridSearch({
        userId: "user-123",
        query: "test",
        excludeSourceIds: ["mat-exclude"],
      });

      expect(results.every((r) => r.sourceId !== "mat-exclude")).toBe(true);
    });

    it("should respect minScore threshold", async () => {
      vi.mocked(generateEmbedding).mockResolvedValue({
        vector: Array(1536).fill(0.1),
        model: "text-embedding-3-small",
        usage: { tokens: 10 },
      });

      mockSearchSimilar.mockResolvedValue([
        {
          id: "emb-1",
          sourceType: "material",
          sourceId: "mat-1",
          chunkIndex: 0,
          content: "Low score content",
          similarity: 0.2,
          subject: null,
          tags: [],
        },
      ]);

      mockPrisma.$queryRaw.mockResolvedValue([]);

      const results = await hybridSearch({
        userId: "user-123",
        query: "test",
        minScore: 0.5,
      });

      // Result with 0.2 semantic score * 0.7 weight = 0.14 combined
      // Should be filtered out
      expect(results.length).toBe(0);
    });

    it("should handle empty results gracefully", async () => {
      vi.mocked(generateEmbedding).mockResolvedValue({
        vector: Array(1536).fill(0.1),
        model: "text-embedding-3-small",
        usage: { tokens: 10 },
      });

      mockSearchSimilar.mockResolvedValue([]);
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const results = await hybridSearch({
        userId: "user-123",
        query: "nonexistent topic",
      });

      expect(results).toEqual([]);
    });

    it("should limit results to specified limit", async () => {
      vi.mocked(generateEmbedding).mockResolvedValue({
        vector: Array(1536).fill(0.1),
        model: "text-embedding-3-small",
        usage: { tokens: 10 },
      });

      // Return many results
      const manyResults = Array(20)
        .fill(null)
        .map((_, i) => ({
          id: `emb-${i}`,
          sourceType: "material",
          sourceId: `mat-${i}`,
          chunkIndex: 0,
          content: `Content ${i}`,
          similarity: 0.9 - i * 0.02,
          subject: null,
          tags: [],
        }));

      mockSearchSimilar.mockResolvedValue(manyResults);
      mockPrisma.$queryRaw.mockResolvedValue([]);

      const results = await hybridSearch({
        userId: "user-123",
        query: "test",
        limit: 5,
      });

      expect(results.length).toBeLessThanOrEqual(5);
    });
  });

  describe("textSimilarity", () => {
    it("should calculate similarity between two texts", async () => {
      vi.mocked(generateEmbedding)
        .mockResolvedValueOnce({
          vector: Array(1536).fill(0.5),
          model: "text-embedding-3-small",
          usage: { tokens: 10 },
        })
        .mockResolvedValueOnce({
          vector: Array(1536).fill(0.5),
          model: "text-embedding-3-small",
          usage: { tokens: 10 },
        });

      vi.mocked(cosineSimilarity).mockReturnValue(0.95);

      const similarity = await textSimilarity("Hello world", "Hello there");

      expect(generateEmbedding).toHaveBeenCalledTimes(2);
      expect(cosineSimilarity).toHaveBeenCalled();
      expect(similarity).toBe(0.95);
    });
  });

  describe("HybridRetrievalResult interface", () => {
    it("should have all required properties", async () => {
      vi.mocked(generateEmbedding).mockResolvedValue({
        vector: Array(1536).fill(0.1),
        model: "text-embedding-3-small",
        usage: { tokens: 10 },
      });

      mockSearchSimilar.mockResolvedValue([
        {
          id: "emb-1",
          sourceType: "material",
          sourceId: "mat-1",
          chunkIndex: 0,
          content: "Test content",
          similarity: 0.9,
          subject: "math",
          tags: ["algebra"],
        },
      ]);

      mockPrisma.$queryRaw.mockResolvedValue([]);

      const results = await hybridSearch({
        userId: "user-123",
        query: "test",
      });

      if (results.length > 0) {
        const result = results[0];
        expect(result).toHaveProperty("id");
        expect(result).toHaveProperty("sourceType");
        expect(result).toHaveProperty("sourceId");
        expect(result).toHaveProperty("chunkIndex");
        expect(result).toHaveProperty("content");
        expect(result).toHaveProperty("combinedScore");
        expect(result).toHaveProperty("semanticScore");
        expect(result).toHaveProperty("keywordScore");
        expect(result).toHaveProperty("subject");
        expect(result).toHaveProperty("tags");
      }
    });
  });
});
