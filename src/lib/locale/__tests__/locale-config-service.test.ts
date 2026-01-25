/**
 * Tests for LocaleConfigService
 * Verifies caching, country resolution, and error handling
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { localeConfigService } from "../locale-config-service";
import { prisma } from "@/lib/db";
import type { LocaleConfig } from "@prisma/client";

// Mock Prisma client
vi.mock("@/lib/db", () => ({
  prisma: {
    localeConfig: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("LocaleConfigService", () => {
  const mockLocales: LocaleConfig[] = [
    {
      id: "IT",
      countryName: "Italia",
      primaryLocale: "it",
      primaryLanguageMaestroId: "manzoni-italiano",
      secondaryLocales: ["en", "fr"],
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "FR",
      countryName: "France",
      primaryLocale: "fr",
      primaryLanguageMaestroId: "moliere-french",
      secondaryLocales: ["en"],
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "DE",
      countryName: "Germany",
      primaryLocale: "de",
      primaryLanguageMaestroId: "goethe-german",
      secondaryLocales: ["en"],
      enabled: false, // Disabled locale
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    // Invalidate cache to ensure clean state
    localeConfigService.invalidateCache();
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance on multiple calls", () => {
      const instance1 = localeConfigService;
      const instance2 = localeConfigService;

      expect(instance1).toBe(instance2);
    });
  });

  describe("getEnabledLocales", () => {
    it("should fetch enabled locales from database", async () => {
      const enabledLocales = mockLocales.filter((l) => l.enabled);
      vi.mocked(prisma.localeConfig.findMany).mockResolvedValue(enabledLocales);

      const result = await localeConfigService.getEnabledLocales();

      expect(result).toEqual(enabledLocales);
      expect(result).toHaveLength(2); // IT and FR only (DE is disabled)
      expect(prisma.localeConfig.findMany).toHaveBeenCalledWith({
        where: { enabled: true },
        orderBy: { countryName: "asc" },
      });
    });

    it("should use cached data on subsequent calls", async () => {
      const enabledLocales = mockLocales.filter((l) => l.enabled);
      vi.mocked(prisma.localeConfig.findMany).mockResolvedValue(enabledLocales);

      // First call - should hit database
      await localeConfigService.getEnabledLocales();

      // Second call - should use cache
      await localeConfigService.getEnabledLocales();

      // Should only call database once
      expect(prisma.localeConfig.findMany).toHaveBeenCalledTimes(1);
    });

    it("should return empty array on database error", async () => {
      vi.mocked(prisma.localeConfig.findMany).mockRejectedValue(
        new Error("Database error"),
      );

      const result = await localeConfigService.getEnabledLocales();

      expect(result).toEqual([]);
    });
  });

  describe("getLocaleForCountry", () => {
    it("should fetch locale for valid country code", async () => {
      const italyLocale = mockLocales[0];
      vi.mocked(prisma.localeConfig.findUnique).mockResolvedValue(italyLocale);

      const result = await localeConfigService.getLocaleForCountry("IT");

      expect(result).toEqual(italyLocale);
      expect(prisma.localeConfig.findUnique).toHaveBeenCalledWith({
        where: { id: "IT" },
      });
    });

    it("should normalize country code to uppercase", async () => {
      const italyLocale = mockLocales[0];
      vi.mocked(prisma.localeConfig.findUnique).mockResolvedValue(italyLocale);

      await localeConfigService.getLocaleForCountry("it");

      expect(prisma.localeConfig.findUnique).toHaveBeenCalledWith({
        where: { id: "IT" },
      });
    });

    it("should return null for disabled locale", async () => {
      const disabledLocale = mockLocales[2]; // DE is disabled
      vi.mocked(prisma.localeConfig.findUnique).mockResolvedValue(
        disabledLocale,
      );

      const result = await localeConfigService.getLocaleForCountry("DE");

      expect(result).toBeNull();
    });

    it("should return null for non-existent country", async () => {
      vi.mocked(prisma.localeConfig.findUnique).mockResolvedValue(null);

      const result = await localeConfigService.getLocaleForCountry("XX");

      expect(result).toBeNull();
    });

    it("should return null on database error", async () => {
      vi.mocked(prisma.localeConfig.findUnique).mockRejectedValue(
        new Error("Database error"),
      );

      const result = await localeConfigService.getLocaleForCountry("IT");

      expect(result).toBeNull();
    });
  });

  describe("getMaestroForCountry", () => {
    it("should return maestro ID for valid country", async () => {
      const italyLocale = mockLocales[0];
      vi.mocked(prisma.localeConfig.findUnique).mockResolvedValue(italyLocale);

      const result = await localeConfigService.getMaestroForCountry("IT");

      expect(result).toBe("manzoni-italiano");
    });

    it("should return null for disabled country", async () => {
      const disabledLocale = mockLocales[2];
      vi.mocked(prisma.localeConfig.findUnique).mockResolvedValue(
        disabledLocale,
      );

      const result = await localeConfigService.getMaestroForCountry("DE");

      expect(result).toBeNull();
    });

    it("should return null for non-existent country", async () => {
      vi.mocked(prisma.localeConfig.findUnique).mockResolvedValue(null);

      const result = await localeConfigService.getMaestroForCountry("XX");

      expect(result).toBeNull();
    });

    it("should return null on database error", async () => {
      vi.mocked(prisma.localeConfig.findUnique).mockRejectedValue(
        new Error("Database error"),
      );

      const result = await localeConfigService.getMaestroForCountry("IT");

      expect(result).toBeNull();
    });
  });

  describe("invalidateCache", () => {
    it("should clear cache and force database fetch", async () => {
      const enabledLocales = mockLocales.filter((l) => l.enabled);
      vi.mocked(prisma.localeConfig.findMany).mockResolvedValue(enabledLocales);

      // First call
      await localeConfigService.getEnabledLocales();

      // Invalidate cache
      localeConfigService.invalidateCache();

      // Second call - should hit database again
      await localeConfigService.getEnabledLocales();

      expect(prisma.localeConfig.findMany).toHaveBeenCalledTimes(2);
    });
  });

  describe("getCacheStats", () => {
    it("should return cache statistics", async () => {
      const enabledLocales = mockLocales.filter((l) => l.enabled);
      vi.mocked(prisma.localeConfig.findMany).mockResolvedValue(enabledLocales);

      await localeConfigService.getEnabledLocales();

      const stats = localeConfigService.getCacheStats();

      expect(stats.size).toBeGreaterThan(0);
      expect(stats.enabledLocalesCount).toBe(2);
      expect(stats.lastUpdate).toBeGreaterThan(0);
      expect(stats.isStale).toBe(false);
    });

    it("should show stale=true after cache invalidation", () => {
      localeConfigService.invalidateCache();

      const stats = localeConfigService.getCacheStats();

      expect(stats.size).toBe(0);
      expect(stats.enabledLocalesCount).toBe(0);
      expect(stats.lastUpdate).toBe(0);
      expect(stats.isStale).toBe(true);
    });
  });

  describe("Cache Behavior", () => {
    it("should cache getLocaleForCountry results", async () => {
      const italyLocale = mockLocales[0];
      vi.mocked(prisma.localeConfig.findUnique).mockResolvedValue(italyLocale);

      // First call
      await localeConfigService.getLocaleForCountry("IT");

      // Second call - should use cache
      await localeConfigService.getLocaleForCountry("IT");

      // Should only call database once due to caching
      expect(prisma.localeConfig.findUnique).toHaveBeenCalledTimes(1);
    });

    it("should update lastCacheUpdate when caching new entries", async () => {
      const enabledLocales = mockLocales.filter((l) => l.enabled);
      vi.mocked(prisma.localeConfig.findMany).mockResolvedValue(enabledLocales);

      const statsBefore = localeConfigService.getCacheStats();
      const timeBeforeCall = statsBefore.lastUpdate;

      // Small delay to ensure time progression
      await new Promise((resolve) => setTimeout(resolve, 5));

      await localeConfigService.getEnabledLocales();

      const statsAfter = localeConfigService.getCacheStats();

      expect(statsAfter.lastUpdate).toBeGreaterThan(timeBeforeCall);
    });

    it("should clear country locale cache when getEnabledLocales is called", async () => {
      const italyLocale = mockLocales[0];
      const enabledLocales = mockLocales.filter((l) => l.enabled);

      // First, populate country cache
      vi.mocked(prisma.localeConfig.findUnique).mockResolvedValue(italyLocale);
      await localeConfigService.getLocaleForCountry("IT");

      // Now call getEnabledLocales which should clear and repopulate cache
      vi.mocked(prisma.localeConfig.findMany).mockResolvedValue(enabledLocales);
      await localeConfigService.getEnabledLocales();

      const stats = localeConfigService.getCacheStats();

      // Should have size of enabled locales
      expect(stats.size).toBe(enabledLocales.length);
    });
  });

  describe("Edge Cases", () => {
    it("should handle mixed case country codes consistently", async () => {
      const italyLocale = mockLocales[0];
      vi.mocked(prisma.localeConfig.findUnique).mockResolvedValue(italyLocale);

      const result1 = await localeConfigService.getLocaleForCountry("it");
      vi.clearAllMocks();
      vi.mocked(prisma.localeConfig.findUnique).mockResolvedValue(italyLocale);
      const result2 = await localeConfigService.getLocaleForCountry("It");

      expect(result1).toEqual(result2);
    });

    it("should return different results for enabled vs disabled locales", async () => {
      const enabledLocale = mockLocales[0];
      const disabledLocale = mockLocales[2];

      vi.mocked(prisma.localeConfig.findUnique)
        .mockResolvedValueOnce(enabledLocale)
        .mockResolvedValueOnce(disabledLocale);

      const enabledResult = await localeConfigService.getLocaleForCountry("IT");
      const disabledResult =
        await localeConfigService.getLocaleForCountry("DE");

      expect(enabledResult).not.toBeNull();
      expect(disabledResult).toBeNull();
    });

    it("should handle concurrent requests consistently", async () => {
      const enabledLocales = mockLocales.filter((l) => l.enabled);
      vi.mocked(prisma.localeConfig.findMany).mockResolvedValue(enabledLocales);

      // Simulate concurrent requests - they will all hit DB before cache is populated
      const results = await Promise.all([
        localeConfigService.getEnabledLocales(),
        localeConfigService.getEnabledLocales(),
        localeConfigService.getEnabledLocales(),
      ]);

      // All results should be identical despite concurrent calls
      expect(results[0]).toEqual(results[1]);
      expect(results[1]).toEqual(results[2]);
      expect(results[0]).toHaveLength(2);
    });

    it("should log warnings for non-existent countries", async () => {
      const { logger } = await import("@/lib/logger");

      vi.mocked(prisma.localeConfig.findUnique).mockResolvedValue(null);

      await localeConfigService.getMaestroForCountry("XX");

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("No enabled locale found for country"),
        expect.objectContaining({ countryCode: "XX" }),
      );
    });
  });

  describe("Integration Scenarios", () => {
    it("should fetch maestro through getLocaleForCountry", async () => {
      const frenchLocale = mockLocales[1];
      vi.mocked(prisma.localeConfig.findUnique).mockResolvedValue(frenchLocale);

      const maestro = await localeConfigService.getMaestroForCountry("FR");

      expect(maestro).toBe("moliere-french");
    });

    it("should handle rapid invalidation and refetch", async () => {
      const enabledLocales = mockLocales.filter((l) => l.enabled);
      vi.mocked(prisma.localeConfig.findMany).mockResolvedValue(enabledLocales);

      // First fetch
      await localeConfigService.getEnabledLocales();

      // Invalidate and fetch again
      localeConfigService.invalidateCache();
      await localeConfigService.getEnabledLocales();

      // Invalidate again and fetch a third time
      localeConfigService.invalidateCache();
      await localeConfigService.getEnabledLocales();

      // Should have called database 3 times (once per invalidation + fetch)
      expect(prisma.localeConfig.findMany).toHaveBeenCalledTimes(3);
    });

    it("should maintain cache consistency across multiple operations", async () => {
      const enabledLocales = mockLocales.filter((l) => l.enabled);
      const italyLocale = mockLocales[0];

      vi.mocked(prisma.localeConfig.findMany).mockResolvedValue(enabledLocales);
      vi.mocked(prisma.localeConfig.findUnique).mockResolvedValue(italyLocale);

      // First operation
      const locales = await localeConfigService.getEnabledLocales();

      // Second operation
      const italyFromCountry =
        await localeConfigService.getLocaleForCountry("IT");

      // Verify consistency
      const italyFromList = locales.find((l) => l.id === "IT");
      expect(italyFromCountry).toEqual(italyFromList);
    });
  });
});
