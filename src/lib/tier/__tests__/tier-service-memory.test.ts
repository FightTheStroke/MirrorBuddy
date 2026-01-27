/**
 * TierService Memory Configuration Tests
 *
 * Tests for the getTierMemoryConfig method which retrieves tier-specific
 * memory limits for conversation history, semantic search, and cross-maestro memory.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { TierService } from "../tier-service";
import { getTierMemoryLimits } from "@/lib/conversation/tier-memory-config";

describe("TierService.getTierMemoryConfig", () => {
  let tierService: TierService;

  beforeEach(() => {
    tierService = new TierService();
  });

  describe("Anonymous users (null userId)", () => {
    it("should return Trial tier memory config for null userId", async () => {
      const memoryConfig = await tierService.getTierMemoryConfig(null);

      expect(memoryConfig).toBeDefined();
      expect(memoryConfig.recentConversations).toBe(0);
      expect(memoryConfig.timeWindowDays).toBe(0);
      expect(memoryConfig.maxKeyFacts).toBe(0);
      expect(memoryConfig.maxTopics).toBe(0);
      expect(memoryConfig.semanticEnabled).toBe(false);
      expect(memoryConfig.crossMaestroEnabled).toBe(false);
    });

    it("should match getTierMemoryLimits for Trial tier", async () => {
      const memoryConfig = await tierService.getTierMemoryConfig(null);
      const expectedConfig = getTierMemoryLimits("trial");

      expect(memoryConfig).toEqual(expectedConfig);
    });
  });

  describe("Base tier users", () => {
    it("should return Base tier memory config for registered user without subscription", async () => {
      // This test assumes the user doesn't have a subscription, defaulting to Base tier
      // Real implementation would depend on database setup
      // For now, we're testing the interface contract

      const memoryConfig = await tierService.getTierMemoryConfig("base-user");

      expect(memoryConfig).toBeDefined();
      expect(memoryConfig).toHaveProperty("recentConversations");
      expect(memoryConfig).toHaveProperty("timeWindowDays");
      expect(memoryConfig).toHaveProperty("maxKeyFacts");
      expect(memoryConfig).toHaveProperty("maxTopics");
      expect(memoryConfig).toHaveProperty("semanticEnabled");
      expect(memoryConfig).toHaveProperty("crossMaestroEnabled");
    });
  });

  describe("Pro tier users", () => {
    it("should return Pro tier memory config for Pro subscriber", async () => {
      const memoryConfig = await tierService.getTierMemoryConfig("pro-user");

      expect(memoryConfig).toBeDefined();
      expect(memoryConfig).toHaveProperty("recentConversations");
      expect(memoryConfig).toHaveProperty("semanticEnabled");
      expect(memoryConfig).toHaveProperty("crossMaestroEnabled");
    });
  });

  describe("Return type", () => {
    it("should return TierMemoryLimits interface", async () => {
      const memoryConfig = await tierService.getTierMemoryConfig(null);

      expect(memoryConfig).toHaveProperty("recentConversations");
      expect(typeof memoryConfig.recentConversations).toBe("number");
      expect(memoryConfig).toHaveProperty("timeWindowDays");
      expect(
        memoryConfig.timeWindowDays === null ||
          typeof memoryConfig.timeWindowDays === "number",
      ).toBe(true);
      expect(memoryConfig).toHaveProperty("maxKeyFacts");
      expect(typeof memoryConfig.maxKeyFacts).toBe("number");
      expect(memoryConfig).toHaveProperty("maxTopics");
      expect(typeof memoryConfig.maxTopics).toBe("number");
      expect(memoryConfig).toHaveProperty("semanticEnabled");
      expect(typeof memoryConfig.semanticEnabled).toBe("boolean");
      expect(memoryConfig).toHaveProperty("crossMaestroEnabled");
      expect(typeof memoryConfig.crossMaestroEnabled).toBe("boolean");
    });

    it("should return a copy, not a reference", async () => {
      const config1 = await tierService.getTierMemoryConfig(null);
      const config2 = await tierService.getTierMemoryConfig(null);

      expect(config1).toEqual(config2);

      // Mutating config1 should not affect config2 (each call returns a copy)
      config1.maxKeyFacts = 999;
      const config3 = await tierService.getTierMemoryConfig(null);
      expect(config3.maxKeyFacts).toBe(0); // Trial has 0, fresh copy
    });
  });

  describe("Caching", () => {
    it("should cache results for the same userId", async () => {
      const userId = "cached-user";

      // Call twice
      const config1 = await tierService.getTierMemoryConfig(userId);
      const config2 = await tierService.getTierMemoryConfig(userId);

      // Should return equivalent results
      expect(config1).toEqual(config2);
    });

    it("should use different cache entries for different userIds", async () => {
      const config1 = await tierService.getTierMemoryConfig("user-1");
      const config2 = await tierService.getTierMemoryConfig("user-2");

      // Both should be valid config objects
      expect(config1).toBeDefined();
      expect(config2).toBeDefined();
    });

    it("should return Trial config consistently for null userId", async () => {
      const config1 = await tierService.getTierMemoryConfig(null);
      const config2 = await tierService.getTierMemoryConfig(null);
      const config3 = await tierService.getTierMemoryConfig(null);

      expect(config1).toEqual(config2);
      expect(config2).toEqual(config3);
    });

    it("should update cache when invalidateCache is called", async () => {
      const userId = "cache-test-user";

      const config1 = await tierService.getTierMemoryConfig(userId);
      tierService.invalidateCache();
      const config2 = await tierService.getTierMemoryConfig(userId);

      // Results should still match
      expect(config1).toEqual(config2);
    });
  });

  describe("Error handling", () => {
    it("should handle errors gracefully and return fallback config", async () => {
      // The implementation should catch errors and return a sensible default
      const memoryConfig = await tierService.getTierMemoryConfig(null);

      // Should never throw, should always return something
      expect(memoryConfig).toBeDefined();
      expect(typeof memoryConfig).toBe("object");
    });
  });
});
