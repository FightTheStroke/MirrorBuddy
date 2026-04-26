import { describe, it, expect } from "vitest";
import {
  injectLearningsWithDecay,
  formatLearningsSection,
  type DecayConfig,
  type WeightedLearning,
} from "../learnings-injector";

describe("learnings-injector", () => {
  describe("injectLearningsWithDecay", () => {
    it("should apply exponential decay with correct formula", () => {
      const learnings = [
        {
          content: "Learning 1",
          createdAt: new Date(Date.now() - 0 * 24 * 60 * 60 * 1000),
        }, // today
        {
          content: "Learning 2",
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        }, // 30 days ago
        {
          content: "Learning 3",
          createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        }, // 60 days ago
      ];

      const config: DecayConfig = {
        halflifeDays: 30,
        minThreshold: 0.1,
        maxLearnings: 10,
      };
      const result = injectLearningsWithDecay(learnings, config);

      expect(result.length).toBe(3);
      // Today: exp(-0/30) = 1
      expect(result[0].score).toBeCloseTo(1, 2);
      // 30 days: exp(-30/30) = exp(-1) ≈ 0.368
      expect(result[1].score).toBeCloseTo(Math.exp(-1), 2);
      // 60 days: exp(-60/30) = exp(-2) ≈ 0.135
      expect(result[2].score).toBeCloseTo(Math.exp(-2), 2);
    });

    it("should use default halflife of 30 days", () => {
      const learnings = [
        {
          content: "Learning",
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      ];

      const result = injectLearningsWithDecay(learnings);

      // exp(-30/30) ≈ 0.368
      expect(result[0].score).toBeCloseTo(Math.exp(-1), 2);
    });

    it("should filter out learnings below threshold", () => {
      const learnings = [
        {
          content: "Recent",
          createdAt: new Date(Date.now() - 0 * 24 * 60 * 60 * 1000),
        }, // score ≈ 1
        {
          content: "Stale",
          createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
        }, // score ≈ 0.03
      ];

      const config: DecayConfig = {
        halflifeDays: 30,
        minThreshold: 0.1,
        maxLearnings: 10,
      };
      const result = injectLearningsWithDecay(learnings, config);

      expect(result.length).toBe(1);
      expect(result[0].content).toBe("Recent");
    });

    it("should sort by score descending", () => {
      const learnings = [
        {
          content: "Stale",
          createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
        },
        {
          content: "Recent",
          createdAt: new Date(Date.now() - 0 * 24 * 60 * 60 * 1000),
        },
        {
          content: "Medium",
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      ];

      const config: DecayConfig = {
        halflifeDays: 30,
        minThreshold: 0.01,
        maxLearnings: 10,
      };
      const result = injectLearningsWithDecay(learnings, config);

      expect(result[0].content).toBe("Recent");
      expect(result[1].content).toBe("Medium");
      expect(result[2].content).toBe("Stale");
    });

    it("should limit to maxLearnings", () => {
      const learnings = Array.from({ length: 20 }, (_, i) => ({
        content: `Learning ${i}`,
        createdAt: new Date(Date.now() - i * 1 * 24 * 60 * 60 * 1000),
      }));

      const config: DecayConfig = {
        halflifeDays: 30,
        minThreshold: 0.01,
        maxLearnings: 5,
      };
      const result = injectLearningsWithDecay(learnings, config);

      expect(result.length).toBeLessThanOrEqual(5);
    });

    it("should handle empty learnings array", () => {
      const result = injectLearningsWithDecay([]);
      expect(result).toEqual([]);
    });

    it("should handle custom thresholds", () => {
      const learnings = [
        {
          content: "L1",
          createdAt: new Date(Date.now() - 0 * 24 * 60 * 60 * 1000),
        },
        {
          content: "L2",
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        },
      ];

      // With high threshold, fewer items pass
      const config: DecayConfig = {
        halflifeDays: 30,
        minThreshold: 0.8,
        maxLearnings: 10,
      };
      const result = injectLearningsWithDecay(learnings, config);

      expect(result.length).toBe(1);
      expect(result[0].content).toBe("L1");
    });
  });

  describe("formatLearningsSection", () => {
    it("should format learnings as Italian markdown section", () => {
      const learnings: WeightedLearning[] = [
        { content: "Test learning", score: 0.95, ageDays: 1 },
        { content: "Older learning", score: 0.5, ageDays: 20 },
      ];

      const formatted = formatLearningsSection(learnings);

      expect(formatted).toContain("## Nozioni Apprese");
      expect(formatted).toContain("Test learning");
      expect(formatted).toContain("Older learning");
    });

    it("should add decay indicators", () => {
      const learnings: WeightedLearning[] = [
        { content: "Recent", score: 0.95, ageDays: 1 },
        { content: "Medium", score: 0.5, ageDays: 20 },
        { content: "Stale", score: 0.15, ageDays: 50 },
      ];

      const formatted = formatLearningsSection(learnings);

      // Should contain indicators
      expect(formatted).toContain("🟢"); // recent
      expect(formatted).toContain("🟡"); // medium
      expect(formatted).toContain("🔴"); // stale
    });

    it("should include age information", () => {
      const learnings: WeightedLearning[] = [
        { content: "Learning", score: 0.8, ageDays: 5 },
      ];

      const formatted = formatLearningsSection(learnings);

      expect(formatted).toContain("5 giorni");
    });

    it("should handle empty learnings", () => {
      const formatted = formatLearningsSection([]);
      expect(formatted).toBe("");
    });

    it("should pluralize days correctly", () => {
      const learnings: WeightedLearning[] = [
        { content: "L1", score: 0.8, ageDays: 1 },
      ];

      const formatted = formatLearningsSection(learnings);

      expect(formatted).toContain("1 giorno");
    });
  });
});
