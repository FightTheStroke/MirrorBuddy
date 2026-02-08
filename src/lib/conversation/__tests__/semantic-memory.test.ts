/**
 * Semantic Memory Tests
 * Tests for searchRelevantSummaries function using pgvector similarity search
 *
 * @module conversation/__tests__/semantic-memory
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { searchRelevantSummaries } from "../semantic-memory";
import * as tierMemoryConfig from "../tier-memory-config";

// Mock dependencies
vi.mock("@/lib/rag/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/rag/server")>();
  return {
    ...actual,
    generatePrivacyAwareEmbedding: vi.fn(),
    searchSimilar: vi.fn(),
  };
});
vi.mock("../tier-memory-config");
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

import { generatePrivacyAwareEmbedding, searchSimilar } from "@/lib/rag/server";
import type { VectorSearchResult } from "@/lib/rag/server";

describe("searchRelevantSummaries", () => {
  const mockUserId = "user-123";
  const mockQuery = "What did we discuss about mathematics?";
  const mockVector = new Array(1536).fill(0.1);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return relevant summaries with content, score, and date", async () => {
    // Arrange
    vi.mocked(tierMemoryConfig.getTierMemoryLimits).mockReturnValue({
      recentConversations: 5,
      timeWindowDays: null,
      maxKeyFacts: 50,
      maxTopics: 30,
      semanticEnabled: true,
      crossMaestroEnabled: true,
    });

    vi.mocked(generatePrivacyAwareEmbedding).mockResolvedValue({
      vector: mockVector,
      model: "text-embedding-3-small",
      usage: { tokens: 10 },
    });

    const mockSearchResults: VectorSearchResult[] = [
      {
        id: "emb-1",
        sourceType: "conversation_summary",
        sourceId: "conv-123",
        chunkIndex: 0,
        content: "We discussed quadratic equations and their applications.",
        similarity: 0.89,
        subject: "mathematics",
        tags: ["algebra", "equations"],
      },
      {
        id: "emb-2",
        sourceType: "conversation_summary",
        sourceId: "conv-456",
        chunkIndex: 0,
        content: "Student asked about solving systems of linear equations.",
        similarity: 0.76,
        subject: "mathematics",
        tags: ["algebra", "systems"],
      },
    ];

    vi.mocked(searchSimilar).mockResolvedValue(mockSearchResults);

    // Act
    const results = await searchRelevantSummaries(mockUserId, mockQuery, "pro");

    // Assert
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      conversationId: "conv-123",
      content: "We discussed quadratic equations and their applications.",
      relevanceScore: 0.89,
      subject: "mathematics",
    });
    expect(results[0].date).toBeInstanceOf(Date);
    expect(results[1]).toMatchObject({
      conversationId: "conv-456",
      relevanceScore: 0.76,
    });

    // Verify embedding was generated
    expect(generatePrivacyAwareEmbedding).toHaveBeenCalledWith(mockQuery);

    // Verify vector search was called correctly
    expect(searchSimilar).toHaveBeenCalledWith({
      userId: mockUserId,
      vector: mockVector,
      limit: 10,
      minSimilarity: 0.6,
      sourceType: "conversation_summary",
    });
  });

  it("should handle empty results gracefully", async () => {
    // Arrange
    vi.mocked(tierMemoryConfig.getTierMemoryLimits).mockReturnValue({
      recentConversations: 5,
      timeWindowDays: null,
      maxKeyFacts: 50,
      maxTopics: 30,
      semanticEnabled: true,
      crossMaestroEnabled: true,
    });

    vi.mocked(generatePrivacyAwareEmbedding).mockResolvedValue({
      vector: mockVector,
      model: "text-embedding-3-small",
      usage: { tokens: 10 },
    });

    vi.mocked(searchSimilar).mockResolvedValue([]);

    // Act
    const results = await searchRelevantSummaries(mockUserId, mockQuery, "pro");

    // Assert
    expect(results).toEqual([]);
    expect(results).toHaveLength(0);
  });

  it("should respect tier limits for non-Pro users", async () => {
    // Arrange
    vi.mocked(tierMemoryConfig.getTierMemoryLimits).mockReturnValue({
      recentConversations: 3,
      timeWindowDays: 15,
      maxKeyFacts: 10,
      maxTopics: 15,
      semanticEnabled: false,
      crossMaestroEnabled: false,
    });

    // Act
    const results = await searchRelevantSummaries(
      mockUserId,
      mockQuery,
      "base",
    );

    // Assert
    expect(results).toEqual([]);
    expect(generatePrivacyAwareEmbedding).not.toHaveBeenCalled();
    expect(searchSimilar).not.toHaveBeenCalled();
  });

  it("should respect custom limit parameter", async () => {
    // Arrange
    vi.mocked(tierMemoryConfig.getTierMemoryLimits).mockReturnValue({
      recentConversations: 5,
      timeWindowDays: null,
      maxKeyFacts: 50,
      maxTopics: 30,
      semanticEnabled: true,
      crossMaestroEnabled: true,
    });

    vi.mocked(generatePrivacyAwareEmbedding).mockResolvedValue({
      vector: mockVector,
      model: "text-embedding-3-small",
      usage: { tokens: 10 },
    });

    vi.mocked(searchSimilar).mockResolvedValue([]);

    // Act
    await searchRelevantSummaries(mockUserId, mockQuery, "pro", 5);

    // Assert
    expect(searchSimilar).toHaveBeenCalledWith({
      userId: mockUserId,
      vector: mockVector,
      limit: 5,
      minSimilarity: 0.6,
      sourceType: "conversation_summary",
    });
  });

  it("should handle errors gracefully and return empty array", async () => {
    // Arrange
    vi.mocked(tierMemoryConfig.getTierMemoryLimits).mockReturnValue({
      recentConversations: 5,
      timeWindowDays: null,
      maxKeyFacts: 50,
      maxTopics: 30,
      semanticEnabled: true,
      crossMaestroEnabled: true,
    });

    vi.mocked(generatePrivacyAwareEmbedding).mockRejectedValue(
      new Error("Embedding service failed"),
    );

    // Act
    const results = await searchRelevantSummaries(mockUserId, mockQuery, "pro");

    // Assert
    expect(results).toEqual([]);
  });

  it("should handle empty/whitespace query and return empty array", async () => {
    // Arrange
    vi.mocked(tierMemoryConfig.getTierMemoryLimits).mockReturnValue({
      recentConversations: 5,
      timeWindowDays: null,
      maxKeyFacts: 50,
      maxTopics: 30,
      semanticEnabled: true,
      crossMaestroEnabled: true,
    });

    // Act
    const results1 = await searchRelevantSummaries(mockUserId, "", "pro");
    const results2 = await searchRelevantSummaries(mockUserId, "   ", "pro");

    // Assert
    expect(results1).toEqual([]);
    expect(results2).toEqual([]);
    expect(generatePrivacyAwareEmbedding).not.toHaveBeenCalled();
  });

  it("should return results sorted by relevance score (highest first)", async () => {
    // Arrange
    vi.mocked(tierMemoryConfig.getTierMemoryLimits).mockReturnValue({
      recentConversations: 5,
      timeWindowDays: null,
      maxKeyFacts: 50,
      maxTopics: 30,
      semanticEnabled: true,
      crossMaestroEnabled: true,
    });

    vi.mocked(generatePrivacyAwareEmbedding).mockResolvedValue({
      vector: mockVector,
      model: "text-embedding-3-small",
      usage: { tokens: 10 },
    });

    // Intentionally unsorted results from vector store
    const mockSearchResults: VectorSearchResult[] = [
      {
        id: "emb-1",
        sourceType: "conversation_summary",
        sourceId: "conv-123",
        chunkIndex: 0,
        content: "Content 1",
        similarity: 0.72,
        subject: "math",
        tags: [],
      },
      {
        id: "emb-2",
        sourceType: "conversation_summary",
        sourceId: "conv-456",
        chunkIndex: 0,
        content: "Content 2",
        similarity: 0.95,
        subject: "math",
        tags: [],
      },
      {
        id: "emb-3",
        sourceType: "conversation_summary",
        sourceId: "conv-789",
        chunkIndex: 0,
        content: "Content 3",
        similarity: 0.83,
        subject: "math",
        tags: [],
      },
    ];

    vi.mocked(searchSimilar).mockResolvedValue(mockSearchResults);

    // Act
    const results = await searchRelevantSummaries(mockUserId, mockQuery, "pro");

    // Assert - should maintain results in order returned by vector store
    expect(results).toHaveLength(3);
    expect(results[0].relevanceScore).toBe(0.72);
    expect(results[1].relevanceScore).toBe(0.95);
    expect(results[2].relevanceScore).toBe(0.83);
  });

  it("should handle vector store error gracefully", async () => {
    // Arrange
    vi.mocked(tierMemoryConfig.getTierMemoryLimits).mockReturnValue({
      recentConversations: 5,
      timeWindowDays: null,
      maxKeyFacts: 50,
      maxTopics: 30,
      semanticEnabled: true,
      crossMaestroEnabled: true,
    });

    vi.mocked(generatePrivacyAwareEmbedding).mockResolvedValue({
      vector: mockVector,
      model: "text-embedding-3-small",
      usage: { tokens: 10 },
    });

    vi.mocked(searchSimilar).mockRejectedValue(
      new Error("Vector store connection failed"),
    );

    // Act
    const results = await searchRelevantSummaries(mockUserId, mockQuery, "pro");

    // Assert
    expect(results).toEqual([]);
  });

  it("should preserve subject and tags from vector store results", async () => {
    // Arrange
    vi.mocked(tierMemoryConfig.getTierMemoryLimits).mockReturnValue({
      recentConversations: 5,
      timeWindowDays: null,
      maxKeyFacts: 50,
      maxTopics: 30,
      semanticEnabled: true,
      crossMaestroEnabled: true,
    });

    vi.mocked(generatePrivacyAwareEmbedding).mockResolvedValue({
      vector: mockVector,
      model: "text-embedding-3-small",
      usage: { tokens: 10 },
    });

    const mockSearchResults: VectorSearchResult[] = [
      {
        id: "emb-1",
        sourceType: "conversation_summary",
        sourceId: "conv-123",
        chunkIndex: 0,
        content: "Discussion about relativity",
        similarity: 0.88,
        subject: "physics",
        tags: ["einstein", "relativity", "spacetime"],
      },
    ];

    vi.mocked(searchSimilar).mockResolvedValue(mockSearchResults);

    // Act
    const results = await searchRelevantSummaries(mockUserId, mockQuery, "pro");

    // Assert
    expect(results[0]).toMatchObject({
      subject: "physics",
      tags: ["einstein", "relativity", "spacetime"],
    });
  });
});
