/**
 * Tests for RAG Retrieval Service
 * @module rag/retrieval-service
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

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
  generateEmbedding: vi.fn(),
  isEmbeddingConfigured: vi.fn().mockReturnValue(true),
}));

// Mock vector store - use vi.hoisted
const { mockSearchSimilar, mockStoreEmbedding } = vi.hoisted(() => ({
  mockSearchSimilar: vi.fn(),
  mockStoreEmbedding: vi.fn(),
}));

vi.mock("../vector-store", () => ({
  searchSimilar: mockSearchSimilar,
  storeEmbedding: mockStoreEmbedding,
}));

import {
  findSimilarMaterials,
  findRelatedConcepts,
  indexMaterial,
  type RetrievalResult,
  type IndexMaterialInput,
} from "../retrieval-service";
import { generateEmbedding } from "../embedding-service";

describe("Retrieval Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findSimilarMaterials", () => {
    it("should find similar materials for a text query", async () => {
      const mockVector = Array(1536).fill(0.1);
      vi.mocked(generateEmbedding).mockResolvedValue({
        vector: mockVector,
        model: "text-embedding-3-small",
        usage: { tokens: 10 },
      });

      mockSearchSimilar.mockResolvedValue([
        {
          id: "emb-1",
          sourceType: "material",
          sourceId: "mat-1",
          chunkIndex: 0,
          content: "Related content about history",
          similarity: 0.92,
          subject: "history",
          tags: ["rome", "ancient"],
        },
        {
          id: "emb-2",
          sourceType: "material",
          sourceId: "mat-2",
          chunkIndex: 1,
          content: "More history content",
          similarity: 0.85,
          subject: "history",
          tags: [],
        },
      ]);

      const results = await findSimilarMaterials({
        userId: "user-123",
        query: "Roman Empire history",
        limit: 5,
      });

      expect(results).toHaveLength(2);
      expect(results[0].similarity).toBe(0.92);
      expect(results[0].sourceId).toBe("mat-1");
      expect(generateEmbedding).toHaveBeenCalledWith("Roman Empire history");
    });

    it("should filter by subject when provided", async () => {
      vi.mocked(generateEmbedding).mockResolvedValue({
        vector: Array(1536).fill(0.1),
        model: "text-embedding-3-small",
        usage: { tokens: 10 },
      });
      mockSearchSimilar.mockResolvedValue([]);

      await findSimilarMaterials({
        userId: "user-123",
        query: "test query",
        subject: "mathematics",
      });

      expect(mockSearchSimilar).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: "mathematics",
          sourceType: "material",
        }),
      );
    });

    it("should use provided embedding instead of generating new one", async () => {
      const providedVector = Array(1536).fill(0.2);
      mockSearchSimilar.mockResolvedValue([]);

      await findSimilarMaterials({
        userId: "user-123",
        embedding: providedVector,
      });

      expect(generateEmbedding).not.toHaveBeenCalled();
      expect(mockSearchSimilar).toHaveBeenCalledWith(
        expect.objectContaining({
          vector: providedVector,
        }),
      );
    });

    it("should throw error if no query and no embedding provided", async () => {
      await expect(
        findSimilarMaterials({ userId: "user-123" }),
      ).rejects.toThrow("Either query or embedding must be provided");
    });

    it("should respect minSimilarity threshold", async () => {
      vi.mocked(generateEmbedding).mockResolvedValue({
        vector: Array(1536).fill(0.1),
        model: "text-embedding-3-small",
        usage: { tokens: 10 },
      });
      mockSearchSimilar.mockResolvedValue([]);

      await findSimilarMaterials({
        userId: "user-123",
        query: "test",
        minSimilarity: 0.8,
      });

      expect(mockSearchSimilar).toHaveBeenCalledWith(
        expect.objectContaining({
          minSimilarity: 0.8,
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
          sourceId: "mat-1",
          chunkIndex: 0,
          content: "Content 1",
          similarity: 0.9,
          subject: null,
          tags: [],
        },
        {
          id: "emb-2",
          sourceType: "material",
          sourceId: "mat-exclude",
          chunkIndex: 0,
          content: "Content to exclude",
          similarity: 0.85,
          subject: null,
          tags: [],
        },
      ]);

      const results = await findSimilarMaterials({
        userId: "user-123",
        query: "test",
        excludeSourceIds: ["mat-exclude"],
      });

      expect(results).toHaveLength(1);
      expect(results[0].sourceId).toBe("mat-1");
    });
  });

  describe("findRelatedConcepts", () => {
    it("should find concepts from flashcards and studykits", async () => {
      vi.mocked(generateEmbedding).mockResolvedValue({
        vector: Array(1536).fill(0.1),
        model: "text-embedding-3-small",
        usage: { tokens: 10 },
      });

      // First call returns flashcards, second call returns studykits
      mockSearchSimilar
        .mockResolvedValueOnce([
          {
            id: "emb-fc-1",
            sourceType: "flashcard",
            sourceId: "fc-1",
            chunkIndex: 0,
            content: "What is the Roman Senate?",
            similarity: 0.88,
            subject: "history",
            tags: [],
          },
        ])
        .mockResolvedValueOnce([
          {
            id: "emb-sk-1",
            sourceType: "studykit",
            sourceId: "sk-1",
            chunkIndex: 0,
            content: "Roman government structure",
            similarity: 0.82,
            subject: "history",
            tags: [],
          },
        ]);

      const results = await findRelatedConcepts({
        userId: "user-123",
        query: "Roman government",
        includeFlashcards: true,
        includeStudykits: true,
      });

      expect(results).toHaveLength(2);
      expect(results[0].sourceType).toBe("flashcard");
      expect(results[1].sourceType).toBe("studykit");
    });

    it("should exclude certain source IDs", async () => {
      vi.mocked(generateEmbedding).mockResolvedValue({
        vector: Array(1536).fill(0.1),
        model: "text-embedding-3-small",
        usage: { tokens: 10 },
      });

      // Only flashcards (default includes both, but we'll only get flashcard results)
      mockSearchSimilar
        .mockResolvedValueOnce([
          {
            id: "emb-1",
            sourceType: "flashcard",
            sourceId: "fc-1",
            chunkIndex: 0,
            content: "Content 1",
            similarity: 0.9,
            subject: null,
            tags: [],
          },
          {
            id: "emb-2",
            sourceType: "flashcard",
            sourceId: "fc-exclude",
            chunkIndex: 0,
            content: "Content to exclude",
            similarity: 0.85,
            subject: null,
            tags: [],
          },
        ])
        .mockResolvedValueOnce([]); // No studykit results

      const results = await findRelatedConcepts({
        userId: "user-123",
        query: "test",
        excludeSourceIds: ["fc-exclude"],
      });

      expect(results).toHaveLength(1);
      expect(results[0].sourceId).toBe("fc-1");
    });
  });

  describe("indexMaterial", () => {
    it("should chunk and store embeddings for material", async () => {
      const mockVector = Array(1536).fill(0.1);
      vi.mocked(generateEmbedding).mockResolvedValue({
        vector: mockVector,
        model: "text-embedding-3-small",
        usage: { tokens: 50 },
      });

      mockStoreEmbedding.mockResolvedValue({
        id: "emb-new",
        userId: "user-123",
        sourceType: "material",
        sourceId: "mat-new",
      });

      const input: IndexMaterialInput = {
        userId: "user-123",
        sourceType: "material",
        sourceId: "mat-new",
        content:
          "This is some educational content that needs to be indexed for later retrieval.",
        subject: "science",
        tags: ["biology", "cells"],
      };

      const result = await indexMaterial(input);

      expect(result.chunksIndexed).toBeGreaterThanOrEqual(1);
      expect(result.totalTokens).toBeGreaterThan(0);
      expect(mockStoreEmbedding).toHaveBeenCalled();
    });

    it("should chunk long content into multiple embeddings", async () => {
      vi.mocked(generateEmbedding).mockResolvedValue({
        vector: Array(1536).fill(0.1),
        model: "text-embedding-3-small",
        usage: { tokens: 100 },
      });

      mockStoreEmbedding.mockResolvedValue({ id: "emb-1" });

      // Create content that will result in multiple chunks (~2000 chars)
      const longContent = "Lorem ipsum dolor sit amet. ".repeat(100);

      const input: IndexMaterialInput = {
        userId: "user-123",
        sourceType: "material",
        sourceId: "mat-long",
        content: longContent,
      };

      const result = await indexMaterial(input);

      expect(result.chunksIndexed).toBeGreaterThan(1);
    });

    it("should handle empty content gracefully", async () => {
      const input: IndexMaterialInput = {
        userId: "user-123",
        sourceType: "material",
        sourceId: "mat-empty",
        content: "",
      };

      const result = await indexMaterial(input);

      expect(result.chunksIndexed).toBe(0);
      expect(result.totalTokens).toBe(0);
      expect(mockStoreEmbedding).not.toHaveBeenCalled();
    });
  });

  describe("RetrievalResult interface", () => {
    it("should have correct structure", async () => {
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

      const results: RetrievalResult[] = await findSimilarMaterials({
        userId: "user-123",
        query: "test",
      });

      expect(results[0]).toHaveProperty("id");
      expect(results[0]).toHaveProperty("sourceType");
      expect(results[0]).toHaveProperty("sourceId");
      expect(results[0]).toHaveProperty("content");
      expect(results[0]).toHaveProperty("similarity");
      expect(typeof results[0].similarity).toBe("number");
    });
  });
});
