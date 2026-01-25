/**
 * Integration test for tierService - verifies ADR 0073 implementation
 * Ensures getFeatureAIConfigForUser returns valid configs for all feature types
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    tierDefinition: {
      findFirst: vi.fn(() =>
        Promise.resolve({
          id: "tier-trial",
          name: "Trial",
          isDefault: true,
          aiModelConfig: { defaultModel: "gpt-4o-mini" },
          featureConfigs: {
            formula: { model: "gpt-4o", temperature: 0.3, maxTokens: 1500 },
            demo: { model: "gpt-4o", temperature: 0.8, maxTokens: 4000 },
          },
        }),
      ),
      findMany: vi.fn(() => Promise.resolve([])),
    },
    userFeatureConfig: {
      findFirst: vi.fn(() => Promise.resolve(null)),
    },
    userSubscription: {
      findFirst: vi.fn(() => Promise.resolve(null)),
    },
  },
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { tierService } from "@/lib/tier/tier-service";
import type { FeatureType } from "@/lib/tier/types";

describe("TierService Integration - ADR 0073", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tierService.invalidateCache();
  });

  const allFeatureTypes: FeatureType[] = [
    "chat",
    "realtime",
    "pdf",
    "mindmap",
    "quiz",
    "flashcards",
    "summary",
    "formula",
    "chart",
    "homework",
    "webcam",
    "demo",
  ];

  describe("getFeatureAIConfigForUser returns valid config", () => {
    it.each(allFeatureTypes)(
      "returns config with all required fields for %s",
      async (featureType) => {
        const config = await tierService.getFeatureAIConfigForUser(
          null,
          featureType,
        );

        expect(config).toHaveProperty("model");
        expect(config).toHaveProperty("temperature");
        expect(config).toHaveProperty("maxTokens");
        expect(typeof config.model).toBe("string");
        expect(typeof config.temperature).toBe("number");
        expect(typeof config.maxTokens).toBe("number");
        expect(config.model.length).toBeGreaterThan(0);
        expect(config.temperature).toBeGreaterThanOrEqual(0);
        expect(config.temperature).toBeLessThanOrEqual(2);
        expect(config.maxTokens).toBeGreaterThan(0);
      },
    );
  });

  describe("config values are reasonable", () => {
    it("formula has low temperature for precision", async () => {
      const config = await tierService.getFeatureAIConfigForUser(
        null,
        "formula",
      );
      expect(config.temperature).toBeLessThanOrEqual(0.5);
    });

    it("demo has higher temperature for creativity", async () => {
      const config = await tierService.getFeatureAIConfigForUser(null, "demo");
      expect(config.temperature).toBeGreaterThanOrEqual(0.7);
    });
  });
});
