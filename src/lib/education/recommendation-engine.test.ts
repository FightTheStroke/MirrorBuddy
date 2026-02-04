/**
 * Tests for AI-powered learning path recommendation engine
 * Plan 104 - Wave 4: Pro Features [T4-05]
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateRecommendations,
  scoreLearningPattern,
  identifyKnowledgeGaps,
  suggestFocusAreas,
} from "./recommendation-engine";
import type { StudentInsights } from "./recommendation-engine";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  prisma: {
    conversation: {
      findMany: vi.fn(),
    },
    learningPath: {
      findMany: vi.fn(),
    },
    flashcardReview: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/ai/providers", () => ({
  chatCompletion: vi.fn(),
}));

vi.mock("@/lib/tier/tier-service", () => ({
  tierService: {
    getEffectiveTier: vi.fn(),
    getFeatureAIConfigForUser: vi.fn(),
  },
}));

vi.mock("@/lib/conversation/semantic-memory", () => ({
  searchRelevantSummaries: vi.fn(),
}));

describe("recommendation-engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateRecommendations", () => {
    it("should return empty for non-Pro users", async () => {
      const { tierService } = await import("@/lib/tier/tier-service");
      vi.mocked(tierService.getEffectiveTier).mockResolvedValue({
        id: "tier-base",
        code: "base",
        name: "Base",
        features: {},
      } as never);

      const result = await generateRecommendations("user-123");

      expect(result).toEqual({
        strengths: [],
        weaknesses: [],
        recommendedTopics: [],
        focusAreas: [],
        overallScore: 0,
        confidenceLevel: "low",
      });
    });

    it("should generate recommendations for Pro users with data", async () => {
      const { tierService } = await import("@/lib/tier/tier-service");
      const { prisma } = await import("@/lib/db");
      const { chatCompletion } = await import("@/lib/ai/providers");

      vi.mocked(tierService.getEffectiveTier).mockResolvedValue({
        id: "tier-pro",
        code: "pro",
        name: "Pro",
        features: {},
      } as never);

      vi.mocked(tierService.getFeatureAIConfigForUser).mockResolvedValue({
        model: "gpt-4o-mini",
        temperature: 0.7,
        maxTokens: 2000,
      });

      vi.mocked(prisma.conversation.findMany).mockResolvedValue([
        {
          id: "conv-1",
          maestroId: "euclide-matematica",
          keyFacts: JSON.stringify({
            learned: ["algebra basics", "quadratic equations"],
          }),
          updatedAt: new Date(),
        },
      ] as never);

      vi.mocked(prisma.learningPath.findMany).mockResolvedValue([
        {
          id: "path-1",
          subject: "mathematics",
          completedTopics: 3,
          totalTopics: 5,
          progressPercent: 60,
        },
      ] as never);

      vi.mocked(prisma.flashcardProgress.findMany).mockResolvedValue([
        {
          cardId: "card-1",
          state: "review",
          reps: 5,
          lapses: 1,
          retrievability: 0.8,
          updatedAt: new Date(),
        },
      ] as never);

      vi.mocked(prisma.quizResult.findMany).mockResolvedValue([
        {
          subject: "mathematics",
          topic: "algebra",
          percentage: 85,
        },
      ] as never);

      vi.mocked(chatCompletion).mockResolvedValue({
        content: JSON.stringify({
          strengths: ["algebra", "problem solving"],
          weaknesses: ["geometry", "proofs"],
          recommendedTopics: ["trigonometry", "calculus intro"],
          focusAreas: ["practice more proofs", "visual geometry tools"],
          overallScore: 75,
          confidenceLevel: "high",
        }),
      } as never);

      const result = await generateRecommendations("user-123");

      expect(result.strengths).toHaveLength(2);
      expect(result.weaknesses).toHaveLength(2);
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.confidenceLevel).toBe("high");
    });
  });

  describe("scoreLearningPattern", () => {
    it("should calculate learning score from metrics", () => {
      const insights: StudentInsights = {
        conversationCount: 20,
        averageSessionLength: 15,
        topSubjects: ["mathematics", "physics"],
        learningPathProgress: 75,
        fsrsAccuracy: 85,
        totalReviews: 100,
        strengthAreas: ["algebra"],
        weakAreas: ["geometry"],
      };

      const score = scoreLearningPattern(insights);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it("should handle incomplete metrics gracefully", () => {
      const insights: StudentInsights = {
        conversationCount: 0,
        averageSessionLength: 0,
        topSubjects: [],
        learningPathProgress: 0,
        fsrsAccuracy: 0,
        totalReviews: 0,
        strengthAreas: [],
        weakAreas: [],
      };

      const score = scoreLearningPattern(insights);

      expect(score).toBe(0);
    });
  });

  describe("identifyKnowledgeGaps", () => {
    it("should identify gaps from incomplete learning paths", async () => {
      const { prisma } = await import("@/lib/db");

      vi.mocked(prisma.learningPath.findMany).mockResolvedValue([
        {
          id: "path-1",
          title: "Math Fundamentals",
          subject: "mathematics",
          completedTopics: 2,
          totalTopics: 5,
          topics: [
            { title: "Algebra", status: "completed" },
            { title: "Geometry", status: "completed" },
            { title: "Trigonometry", status: "locked" },
            { title: "Calculus", status: "locked" },
            { title: "Statistics", status: "locked" },
          ],
        },
      ] as never);

      const gaps = await identifyKnowledgeGaps("user-123");

      expect(gaps).toContain("Trigonometry");
      expect(gaps.length).toBeGreaterThan(0);
    });
  });

  describe("suggestFocusAreas", () => {
    it("should suggest areas based on quiz performance", async () => {
      const { prisma } = await import("@/lib/db");

      vi.mocked(prisma.quizResult.findMany).mockResolvedValue([
        {
          subject: "mathematics",
          topic: "algebra",
          percentage: 45, // Failed (< 60)
        },
        {
          subject: "mathematics",
          topic: "geometry",
          percentage: 40, // Failed (< 60)
        },
      ] as never);

      const focusAreas = await suggestFocusAreas("user-123");

      expect(focusAreas.length).toBeGreaterThan(0);
      expect(focusAreas.some((area) => area.includes("mathematics"))).toBe(
        true,
      );
    });
  });
});
