/**
 * Tier Memory Configuration Tests
 *
 * Tests for tier-specific memory limits used by conversation memory loader.
 * Verifies that each tier has correct memory configuration for:
 * - Recent conversation history retention
 * - Key facts and topics limits
 * - Semantic search and cross-maestro memory enablement
 */

import { describe, it, expect } from "vitest";
import {
  TierMemoryLimits,
  TIER_MEMORY_CONFIG,
  getTierMemoryLimits,
} from "../tier-memory-config";
import type { TierName } from "@/types/tier-types";

describe("tier-memory-config", () => {
  describe("TierMemoryLimits interface", () => {
    it("should have required fields defined", () => {
      // Verify the type has the correct structure by checking a config object
      const sampleConfig: TierMemoryLimits = {
        recentConversations: 3,
        timeWindowDays: 15,
        maxKeyFacts: 10,
        maxTopics: 15,
        semanticEnabled: false,
        crossMaestroEnabled: false,
      };

      expect(sampleConfig).toHaveProperty("recentConversations");
      expect(sampleConfig).toHaveProperty("timeWindowDays");
      expect(sampleConfig).toHaveProperty("maxKeyFacts");
      expect(sampleConfig).toHaveProperty("maxTopics");
      expect(sampleConfig).toHaveProperty("semanticEnabled");
      expect(sampleConfig).toHaveProperty("crossMaestroEnabled");
    });
  });

  describe("TIER_MEMORY_CONFIG", () => {
    it("should have configuration for all three tiers", () => {
      expect(TIER_MEMORY_CONFIG).toHaveProperty("trial");
      expect(TIER_MEMORY_CONFIG).toHaveProperty("base");
      expect(TIER_MEMORY_CONFIG).toHaveProperty("pro");
    });

    describe("Trial tier", () => {
      const config = TIER_MEMORY_CONFIG.trial;

      it("should have no recent conversations", () => {
        expect(config.recentConversations).toBe(0);
      });

      it("should have no time window", () => {
        expect(config.timeWindowDays).toBe(0);
      });

      it("should have no key facts storage", () => {
        expect(config.maxKeyFacts).toBe(0);
      });

      it("should have no topics storage", () => {
        expect(config.maxTopics).toBe(0);
      });

      it("should not have semantic search enabled", () => {
        expect(config.semanticEnabled).toBe(false);
      });

      it("should not have cross-maestro memory enabled", () => {
        expect(config.crossMaestroEnabled).toBe(false);
      });
    });

    describe("Base tier", () => {
      const config = TIER_MEMORY_CONFIG.base;

      it("should have 3 recent conversations", () => {
        expect(config.recentConversations).toBe(3);
      });

      it("should have 15 day time window", () => {
        expect(config.timeWindowDays).toBe(15);
      });

      it("should have 10 key facts limit", () => {
        expect(config.maxKeyFacts).toBe(10);
      });

      it("should have 15 topics limit", () => {
        expect(config.maxTopics).toBe(15);
      });

      it("should not have semantic search enabled", () => {
        expect(config.semanticEnabled).toBe(false);
      });

      it("should not have cross-maestro memory enabled", () => {
        expect(config.crossMaestroEnabled).toBe(false);
      });
    });

    describe("Pro tier", () => {
      const config = TIER_MEMORY_CONFIG.pro;

      it("should have 5 recent conversations", () => {
        expect(config.recentConversations).toBe(5);
      });

      it("should have unlimited time window (null)", () => {
        expect(config.timeWindowDays).toBeNull();
      });

      it("should have 50 key facts limit", () => {
        expect(config.maxKeyFacts).toBe(50);
      });

      it("should have 30 topics limit", () => {
        expect(config.maxTopics).toBe(30);
      });

      it("should have semantic search enabled", () => {
        expect(config.semanticEnabled).toBe(true);
      });

      it("should have cross-maestro memory enabled", () => {
        expect(config.crossMaestroEnabled).toBe(true);
      });
    });
  });

  describe("getTierMemoryLimits function", () => {
    it("should return trial config for trial tier", () => {
      const limits = getTierMemoryLimits("trial");
      expect(limits).toEqual(TIER_MEMORY_CONFIG.trial);
      expect(limits.recentConversations).toBe(0);
    });

    it("should return base config for base tier", () => {
      const limits = getTierMemoryLimits("base");
      expect(limits).toEqual(TIER_MEMORY_CONFIG.base);
      expect(limits.recentConversations).toBe(3);
    });

    it("should return pro config for pro tier", () => {
      const limits = getTierMemoryLimits("pro");
      expect(limits).toEqual(TIER_MEMORY_CONFIG.pro);
      expect(limits.recentConversations).toBe(5);
      expect(limits.semanticEnabled).toBe(true);
    });

    it("should handle each tier name type correctly", () => {
      const tiers: TierName[] = ["trial", "base", "pro"];
      tiers.forEach((tier) => {
        const limits = getTierMemoryLimits(tier);
        expect(limits).toBeDefined();
        expect(limits).toHaveProperty("recentConversations");
        expect(limits).toHaveProperty("maxKeyFacts");
      });
    });

    it("should return a copy, not a reference", () => {
      const limits1 = getTierMemoryLimits("base");
      const limits2 = getTierMemoryLimits("base");
      expect(limits1).toEqual(limits2);
      // Modifying one should not affect the other
      limits1.maxKeyFacts = 999;
      const limits3 = getTierMemoryLimits("base");
      expect(limits3.maxKeyFacts).toBe(10);
    });
  });

  describe("Configuration consistency", () => {
    it("should have Pro tier with higher limits than Base tier", () => {
      const base = TIER_MEMORY_CONFIG.base;
      const pro = TIER_MEMORY_CONFIG.pro;

      expect(pro.recentConversations).toBeGreaterThan(base.recentConversations);
      expect(pro.maxKeyFacts).toBeGreaterThan(base.maxKeyFacts);
      expect(pro.maxTopics).toBeGreaterThan(base.maxTopics);
    });

    it("should have Base tier with higher limits than Trial tier", () => {
      const trial = TIER_MEMORY_CONFIG.trial;
      const base = TIER_MEMORY_CONFIG.base;

      expect(base.recentConversations).toBeGreaterThan(
        trial.recentConversations,
      );
      expect(base.maxKeyFacts).toBeGreaterThan(trial.maxKeyFacts);
      expect(base.maxTopics).toBeGreaterThan(trial.maxTopics);
    });

    it("should have Pro tier with unlimited time window", () => {
      const pro = TIER_MEMORY_CONFIG.pro;
      expect(pro.timeWindowDays).toBeNull();
    });

    it("should have Trial tier with zero time window", () => {
      const trial = TIER_MEMORY_CONFIG.trial;
      expect(trial.timeWindowDays).toBe(0);
    });

    it("should only enable advanced features (semantic, crossMaestro) for Pro", () => {
      const trial = TIER_MEMORY_CONFIG.trial;
      const base = TIER_MEMORY_CONFIG.base;
      const pro = TIER_MEMORY_CONFIG.pro;

      expect(trial.semanticEnabled).toBe(false);
      expect(trial.crossMaestroEnabled).toBe(false);

      expect(base.semanticEnabled).toBe(false);
      expect(base.crossMaestroEnabled).toBe(false);

      expect(pro.semanticEnabled).toBe(true);
      expect(pro.crossMaestroEnabled).toBe(true);
    });
  });
});
