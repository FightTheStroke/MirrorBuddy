/**
 * Reranker Unit Tests
 * Tests for cross-encoder style reranking (P2 quality improvement)
 */

import { describe, it, expect, vi } from "vitest";
import { rerank, type RerankerDocument } from "../reranker";

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

describe("reranker", () => {
  const createDoc = (
    id: string,
    content: string,
    originalScore: number,
  ): RerankerDocument => ({
    id,
    content,
    originalScore,
  });

  describe("basic reranking", () => {
    it("should return empty array for empty input", () => {
      const result = rerank("test query", []);
      expect(result).toEqual([]);
    });

    it("should rerank documents and include all signals", () => {
      const docs = [
        createDoc("1", "This is about mathematics and algebra", 0.8),
        createDoc("2", "Mathematics is the study of numbers", 0.7),
      ];

      const result = rerank("mathematics", docs);

      expect(result).toHaveLength(2);
      expect(result[0].signals).toBeDefined();
      expect(result[0].signals.exactPhraseMatch).toBeGreaterThanOrEqual(0);
      expect(result[0].signals.termCoverage).toBeGreaterThanOrEqual(0);
      expect(result[0].signals.termProximity).toBeGreaterThanOrEqual(0);
      expect(result[0].signals.lengthPenalty).toBeGreaterThan(0);
    });

    it("should preserve original document properties", () => {
      const docs = [
        {
          id: "doc-1",
          content: "Test content here",
          originalScore: 0.9,
          metadata: { source: "test" },
        },
      ];

      const result = rerank("test", docs);

      expect(result[0].id).toBe("doc-1");
      expect(result[0].content).toBe("Test content here");
      expect(result[0].originalScore).toBe(0.9);
      expect(result[0].metadata).toEqual({ source: "test" });
    });
  });

  describe("exact phrase matching", () => {
    it("should boost documents with exact query match", () => {
      const docs = [
        createDoc("1", "The theorem of Pythagoras is important", 0.5),
        createDoc("2", "Pythagoras theorem explains triangles", 0.5),
      ];

      const result = rerank("theorem of Pythagoras", docs);

      // Doc 1 has exact phrase "theorem of Pythagoras"
      expect(result[0].id).toBe("1");
      expect(result[0].signals.exactPhraseMatch).toBeGreaterThan(
        result[1].signals.exactPhraseMatch,
      );
    });

    it("should handle case-insensitive matching", () => {
      const docs = [
        createDoc("1", "MATHEMATICS IS GREAT", 0.5),
        createDoc("2", "other content here", 0.5),
      ];

      const result = rerank("mathematics is great", docs);

      expect(result[0].id).toBe("1");
      expect(result[0].signals.exactPhraseMatch).toBe(1.0);
    });
  });

  describe("term coverage", () => {
    it("should boost documents with more query terms", () => {
      const docs = [
        createDoc("1", "Content about physics only", 0.5),
        createDoc("2", "Content about physics and chemistry together", 0.5),
      ];

      const result = rerank("physics chemistry biology", docs);

      // Doc 2 has more query terms (physics, chemistry)
      expect(result[0].id).toBe("2");
      expect(result[0].signals.termCoverage).toBeGreaterThan(
        result[1].signals.termCoverage,
      );
    });

    it("should filter out stop words from query", () => {
      const docs = [createDoc("1", "The quick brown fox jumps", 0.5)];

      // "the" and "and" are stop words
      const result = rerank("the quick and fox", docs);

      // Should only count "quick" and "fox" (not "the" and "and")
      expect(result[0].signals.termCoverage).toBeGreaterThan(0);
    });
  });

  describe("term proximity", () => {
    it("should boost documents with terms close together", () => {
      const docs = [
        createDoc("1", "Mathematics is great. Physics is also good.", 0.5),
        createDoc("2", "Mathematics and physics are related fields", 0.5),
      ];

      const result = rerank("mathematics physics", docs);

      // Doc 2 has terms closer together
      expect(result[0].id).toBe("2");
      expect(result[0].signals.termProximity).toBeGreaterThan(
        result[1].signals.termProximity,
      );
    });
  });

  describe("length penalty", () => {
    it("should penalize very short documents", () => {
      const docs = [
        createDoc("1", "Short", 0.8), // 5 chars - very short
        createDoc(
          "2",
          "This is a moderately sized document with enough content to be in the ideal range for retrieval quality assessment and ranking purposes here",
          0.7,
        ), // ~150 chars - closer to ideal
      ];

      const result = rerank("content topic", docs);

      // Doc 1 is too short (5 chars vs idealLength 500), should have lower penalty
      // Doc 2 is longer, should have higher penalty (closer to 1.0)
      const doc1Penalty = result.find((d) => d.id === "1")!.signals
        .lengthPenalty;
      const doc2Penalty = result.find((d) => d.id === "2")!.signals
        .lengthPenalty;

      expect(doc1Penalty).toBe(0.5); // Very short gets minimum
      expect(doc2Penalty).toBeGreaterThan(doc1Penalty);
    });

    it("should handle ideal length documents well", () => {
      const idealContent = "a".repeat(500); // Ideal length
      const docs = [createDoc("1", idealContent, 0.5)];

      const result = rerank("test", docs);

      expect(result[0].signals.lengthPenalty).toBe(1.0);
    });
  });

  describe("topK limiting", () => {
    it("should respect topK option", () => {
      const docs = Array.from({ length: 20 }, (_, i) =>
        createDoc(`${i}`, `Content ${i}`, Math.random()),
      );

      const result = rerank("content", docs, { topK: 5 });

      expect(result).toHaveLength(5);
    });

    it("should return all if less than topK", () => {
      const docs = [
        createDoc("1", "Content one", 0.5),
        createDoc("2", "Content two", 0.6),
      ];

      const result = rerank("content", docs, { topK: 10 });

      expect(result).toHaveLength(2);
    });
  });

  describe("custom weights", () => {
    it("should allow custom weight configuration", () => {
      const docs = [
        createDoc("1", "exact match query here", 0.3),
        createDoc("2", "different content entirely", 0.9),
      ];

      // High original score weight should favor doc 2
      const highOriginalWeight = rerank("exact match query", docs, {
        originalScoreWeight: 0.9,
        exactPhraseWeight: 0.05,
        termCoverageWeight: 0.025,
        termProximityWeight: 0.025,
      });

      // High exact phrase weight should favor doc 1
      const highPhraseWeight = rerank("exact match query", docs, {
        originalScoreWeight: 0.1,
        exactPhraseWeight: 0.7,
        termCoverageWeight: 0.1,
        termProximityWeight: 0.1,
      });

      expect(highOriginalWeight[0].id).toBe("2");
      expect(highPhraseWeight[0].id).toBe("1");
    });
  });

  describe("sorting", () => {
    it("should sort by reranked score descending", () => {
      const docs = [
        createDoc("1", "Basic content", 0.3),
        createDoc("2", "More relevant content with query terms", 0.5),
        createDoc("3", "Most relevant query content here", 0.4),
      ];

      const result = rerank("relevant query content", docs);

      // Should be sorted by rerankedScore descending
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].rerankedScore).toBeGreaterThanOrEqual(
          result[i].rerankedScore,
        );
      }
    });
  });

  describe("Italian language support", () => {
    it("should handle Italian stop words", () => {
      const docs = [
        createDoc("1", "La matematica è bella e interessante", 0.5),
      ];

      // "la", "è", "e" are Italian stop words
      const result = rerank("la matematica è bella", docs);

      // Should only count significant terms
      expect(result[0].signals.termCoverage).toBeGreaterThan(0);
    });

    it("should handle Italian accented characters", () => {
      const docs = [createDoc("1", "L'università offre corsi di qualità", 0.5)];

      const result = rerank("università qualità", docs);

      expect(result[0].signals.termCoverage).toBe(1.0);
    });
  });
});
