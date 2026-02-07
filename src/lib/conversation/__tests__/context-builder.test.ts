import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildEnhancedContext,
  estimateContextTokens,
} from "../context-builder";
import * as memoryLoader from "../memory-loader";
import * as crossMaestroMemory from "../cross-maestro-memory";
import { tierService } from "@/lib/tier/server";

vi.mock("@/lib/tier/tier-service");
vi.mock("../memory-loader");
vi.mock("../cross-maestro-memory");

describe("context-builder", () => {
  const userId = "user-123";
  const maestroId = "euclide-matematica";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("buildEnhancedContext", () => {
    it("should build context for trial tier with no memory", async () => {
      vi.mocked(tierService.getEffectiveTier).mockResolvedValue({
        id: "tier-trial",
        code: "trial",
        name: "Trial",
        limits: {
          chatMessagesPerMonth: 10,
          voiceSecondsPerMonth: 300,
          toolUsesPerMonth: 10,
          documentUploadsPerMonth: 0,
          maestriCount: 3,
          coachCount: 0,
          buddyCount: 0,
          storageQuotaGb: 0.1,
          concurrentSessions: 1,
        },
      } as any);

      vi.mocked(memoryLoader.loadEnhancedContext).mockResolvedValue({
        recentSummary: null,
        keyFacts: [],
        topics: [],
        lastSessionDate: null,
      });

      const context = await buildEnhancedContext(userId, maestroId, {
        maxContextTokens: 4000,
        includeHierarchical: false,
        includeCrossMaestro: false,
      });

      expect(context).toBeDefined();
      expect(context.tier).toBe("trial");
      expect(context.memory.recentSummary).toBeNull();
    });

    it("should load cross-maestro learnings for pro tier", async () => {
      vi.mocked(tierService.getEffectiveTier).mockResolvedValue({
        id: "tier-pro",
        code: "pro",
        name: "Pro",
      } as any);

      vi.mocked(memoryLoader.loadEnhancedContext).mockResolvedValue({
        recentSummary: "Recent summary",
        keyFacts: ["Fact 1", "Fact 2"],
        topics: ["Math", "Geometry"],
        lastSessionDate: new Date(),
      });

      vi.mocked(crossMaestroMemory.loadCrossMaestroLearnings).mockResolvedValue(
        [
          {
            maestroId: "galileo-physics",
            maestroName: "Galileo",
            subject: "physics",
            learnings: ["Force equals mass times acceleration"],
            date: new Date(),
          },
        ],
      );

      const context = await buildEnhancedContext(userId, maestroId, {
        maxContextTokens: 8000,
        includeHierarchical: true,
        includeCrossMaestro: true,
      });

      expect(context.tier).toBe("pro");
      expect(context.crossMaestroLearnings).toHaveLength(1);
    });

    it("should apply decay to learnings", async () => {
      vi.mocked(tierService.getEffectiveTier).mockResolvedValue({
        id: "tier-base",
        code: "base",
        name: "Base",
      } as any);

      vi.mocked(memoryLoader.loadEnhancedContext).mockResolvedValue({
        recentSummary: "Summary",
        keyFacts: ["Recent fact", "Old fact"],
        topics: ["Math"],
        lastSessionDate: new Date(),
      });

      vi.mocked(crossMaestroMemory.loadCrossMaestroLearnings).mockResolvedValue(
        [],
      );

      const context = await buildEnhancedContext(userId, maestroId, {
        maxContextTokens: 4000,
        includeHierarchical: false,
        includeCrossMaestro: false,
      });

      expect(context.decayedLearnings).toBeDefined();
    });

    it("should truncate context if over token limit", async () => {
      vi.mocked(tierService.getEffectiveTier).mockResolvedValue({
        code: "base",
      } as any);

      const longSummary = "A".repeat(10000);
      vi.mocked(memoryLoader.loadEnhancedContext).mockResolvedValue({
        recentSummary: longSummary,
        keyFacts: Array(50).fill("Fact"),
        topics: Array(30).fill("Topic"),
        lastSessionDate: new Date(),
      });

      vi.mocked(crossMaestroMemory.loadCrossMaestroLearnings).mockResolvedValue(
        [],
      );

      const context = await buildEnhancedContext(userId, maestroId, {
        maxContextTokens: 500,
        includeHierarchical: false,
        includeCrossMaestro: false,
      });

      expect(estimateContextTokens(context.toString())).toBeLessThanOrEqual(
        550,
      );
    });

    it("should combine all memory sources", async () => {
      vi.mocked(tierService.getEffectiveTier).mockResolvedValue({
        code: "pro",
      } as any);

      vi.mocked(memoryLoader.loadEnhancedContext).mockResolvedValue({
        recentSummary: "Recent work on geometry",
        keyFacts: ["Theorem 1", "Theorem 2"],
        topics: ["Geometry"],
        lastSessionDate: new Date(),
        hierarchicalContext: {
          weeklySummary: "Studied euclidean geometry",
        },
      });

      vi.mocked(crossMaestroMemory.loadCrossMaestroLearnings).mockResolvedValue(
        [
          {
            maestroId: "newton-physics",
            maestroName: "Newton",
            subject: "physics",
            learnings: ["F=ma"],
            date: new Date(),
          },
        ],
      );

      const context = await buildEnhancedContext(userId, maestroId, {
        maxContextTokens: 8000,
        includeHierarchical: true,
        includeCrossMaestro: true,
      });

      expect(context.memory).toBeDefined();
      expect(context.combined).toBeDefined();
      expect(context.crossMaestroLearnings).toHaveLength(1);
    });

    it("should respect includeCrossMaestro flag", async () => {
      vi.mocked(tierService.getEffectiveTier).mockResolvedValue({
        code: "pro",
      } as any);

      vi.mocked(memoryLoader.loadEnhancedContext).mockResolvedValue({
        recentSummary: "Summary",
        keyFacts: [],
        topics: [],
        lastSessionDate: new Date(),
      });

      await buildEnhancedContext(userId, maestroId, {
        maxContextTokens: 4000,
        includeHierarchical: false,
        includeCrossMaestro: false,
      });

      expect(
        vi.mocked(crossMaestroMemory.loadCrossMaestroLearnings),
      ).not.toHaveBeenCalled();
    });

    it("should handle errors gracefully", async () => {
      vi.mocked(tierService.getEffectiveTier).mockRejectedValue(
        new Error("Tier lookup failed"),
      );

      const context = await buildEnhancedContext(userId, maestroId, {
        maxContextTokens: 4000,
        includeHierarchical: false,
        includeCrossMaestro: false,
      });

      expect(context).toBeDefined();
      expect(context.memory.keyFacts).toEqual([]);
    });
  });

  describe("estimateContextTokens", () => {
    it("should estimate tokens as approximately chars / 4", () => {
      const text = "A".repeat(400);
      const tokens = estimateContextTokens(text);
      expect(tokens).toBe(100);
    });

    it("should handle empty string", () => {
      const tokens = estimateContextTokens("");
      expect(tokens).toBe(0);
    });

    it("should estimate realistically", () => {
      const sentence = "The quick brown fox jumps over the lazy dog";
      const tokens = estimateContextTokens(sentence);
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThanOrEqual(20);
    });
  });
});
