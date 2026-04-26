/**
 * Health Aggregator Tests
 * Unit tests for health aggregation and overall status logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { aggregateHealth, invalidateHealthCache } from "../health-aggregator";
import type { ServiceHealth } from "../health-aggregator-types";

// Mock all health check functions
vi.mock("../health-checks", () => ({
  checkDatabase: vi.fn(),
  checkRedis: vi.fn(),
  checkAzureOpenAI: vi.fn(),
  checkResend: vi.fn(),
  checkSentry: vi.fn(),
  checkVercel: vi.fn(),
}));

// Import mocked functions to control their behavior
import {
  checkDatabase,
  checkRedis,
  checkAzureOpenAI,
  checkResend,
  checkSentry,
  checkVercel,
} from "../health-checks";

describe("Health Aggregator", () => {
  beforeEach(() => {
    // Clear cache before each test
    invalidateHealthCache();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Overall Status Logic", () => {
    it("should return 'healthy' when all configured services are healthy", async () => {
      // Arrange
      const mockServices: ServiceHealth[] = [
        {
          name: "Database",
          status: "healthy",
          lastChecked: new Date(),
          configured: true,
        },
        {
          name: "Redis/KV",
          status: "healthy",
          lastChecked: new Date(),
          configured: true,
        },
        {
          name: "Azure OpenAI",
          status: "healthy",
          lastChecked: new Date(),
          configured: true,
        },
      ];

      vi.mocked(checkDatabase).mockResolvedValue(mockServices[0]);
      vi.mocked(checkRedis).mockResolvedValue(mockServices[1]);
      vi.mocked(checkAzureOpenAI).mockResolvedValue(mockServices[2]);
      vi.mocked(checkResend).mockResolvedValue({
        name: "Resend",
        status: "unknown",
        lastChecked: new Date(),
        configured: false,
      });
      vi.mocked(checkSentry).mockResolvedValue({
        name: "Sentry",
        status: "unknown",
        lastChecked: new Date(),
        configured: false,
      });
      vi.mocked(checkVercel).mockResolvedValue({
        name: "Vercel",
        status: "unknown",
        lastChecked: new Date(),
        configured: false,
      });

      // Act
      const result = await aggregateHealth();

      // Assert
      expect(result.overallStatus).toBe("healthy");
      expect(result.configuredCount).toBe(3);
      expect(result.unconfiguredCount).toBe(3);
    });

    it("should return 'down' when one configured service is down", async () => {
      // Arrange
      vi.mocked(checkDatabase).mockResolvedValue({
        name: "Database",
        status: "down",
        lastChecked: new Date(),
        details: "Connection failed",
        configured: true,
      });
      vi.mocked(checkRedis).mockResolvedValue({
        name: "Redis/KV",
        status: "healthy",
        lastChecked: new Date(),
        configured: true,
      });
      vi.mocked(checkAzureOpenAI).mockResolvedValue({
        name: "Azure OpenAI",
        status: "healthy",
        lastChecked: new Date(),
        configured: true,
      });
      vi.mocked(checkResend).mockResolvedValue({
        name: "Resend",
        status: "unknown",
        lastChecked: new Date(),
        configured: false,
      });
      vi.mocked(checkSentry).mockResolvedValue({
        name: "Sentry",
        status: "unknown",
        lastChecked: new Date(),
        configured: false,
      });
      vi.mocked(checkVercel).mockResolvedValue({
        name: "Vercel",
        status: "unknown",
        lastChecked: new Date(),
        configured: false,
      });

      // Act
      const result = await aggregateHealth();

      // Assert
      expect(result.overallStatus).toBe("down");
    });

    it("should return 'degraded' when one configured service is degraded", async () => {
      // Arrange
      vi.mocked(checkDatabase).mockResolvedValue({
        name: "Database",
        status: "healthy",
        lastChecked: new Date(),
        configured: true,
      });
      vi.mocked(checkRedis).mockResolvedValue({
        name: "Redis/KV",
        status: "degraded",
        lastChecked: new Date(),
        details: "High latency",
        configured: true,
      });
      vi.mocked(checkAzureOpenAI).mockResolvedValue({
        name: "Azure OpenAI",
        status: "healthy",
        lastChecked: new Date(),
        configured: true,
      });
      vi.mocked(checkResend).mockResolvedValue({
        name: "Resend",
        status: "unknown",
        lastChecked: new Date(),
        configured: false,
      });
      vi.mocked(checkSentry).mockResolvedValue({
        name: "Sentry",
        status: "unknown",
        lastChecked: new Date(),
        configured: false,
      });
      vi.mocked(checkVercel).mockResolvedValue({
        name: "Vercel",
        status: "unknown",
        lastChecked: new Date(),
        configured: false,
      });

      // Act
      const result = await aggregateHealth();

      // Assert
      expect(result.overallStatus).toBe("degraded");
    });

    it("should return 'unknown' when all services are unconfigured", async () => {
      // Arrange
      const unconfiguredService = {
        status: "unknown" as const,
        lastChecked: new Date(),
        configured: false,
      };

      vi.mocked(checkDatabase).mockResolvedValue({
        name: "Database",
        ...unconfiguredService,
      });
      vi.mocked(checkRedis).mockResolvedValue({
        name: "Redis/KV",
        ...unconfiguredService,
      });
      vi.mocked(checkAzureOpenAI).mockResolvedValue({
        name: "Azure OpenAI",
        ...unconfiguredService,
      });
      vi.mocked(checkResend).mockResolvedValue({
        name: "Resend",
        ...unconfiguredService,
      });
      vi.mocked(checkSentry).mockResolvedValue({
        name: "Sentry",
        ...unconfiguredService,
      });
      vi.mocked(checkVercel).mockResolvedValue({
        name: "Vercel",
        ...unconfiguredService,
      });

      // Act
      const result = await aggregateHealth();

      // Assert
      expect(result.overallStatus).toBe("unknown");
      expect(result.configuredCount).toBe(0);
      expect(result.unconfiguredCount).toBe(6);
    });

    it("should ignore unconfigured services when computing overall status (healthy case)", async () => {
      // Arrange - 2 configured healthy, 4 unconfigured
      vi.mocked(checkDatabase).mockResolvedValue({
        name: "Database",
        status: "healthy",
        lastChecked: new Date(),
        configured: true,
      });
      vi.mocked(checkRedis).mockResolvedValue({
        name: "Redis/KV",
        status: "healthy",
        lastChecked: new Date(),
        configured: true,
      });
      vi.mocked(checkAzureOpenAI).mockResolvedValue({
        name: "Azure OpenAI",
        status: "unknown",
        lastChecked: new Date(),
        configured: false,
      });
      vi.mocked(checkResend).mockResolvedValue({
        name: "Resend",
        status: "unknown",
        lastChecked: new Date(),
        configured: false,
      });
      vi.mocked(checkSentry).mockResolvedValue({
        name: "Sentry",
        status: "unknown",
        lastChecked: new Date(),
        configured: false,
      });
      vi.mocked(checkVercel).mockResolvedValue({
        name: "Vercel",
        status: "unknown",
        lastChecked: new Date(),
        configured: false,
      });

      // Act
      const result = await aggregateHealth();

      // Assert
      expect(result.overallStatus).toBe("healthy");
      expect(result.configuredCount).toBe(2);
      expect(result.unconfiguredCount).toBe(4);
    });

    it("should ignore unconfigured services when computing overall status (degraded case)", async () => {
      // Arrange - 1 configured degraded, 4 unconfigured
      vi.mocked(checkDatabase).mockResolvedValue({
        name: "Database",
        status: "degraded",
        lastChecked: new Date(),
        details: "High latency",
        configured: true,
      });
      vi.mocked(checkRedis).mockResolvedValue({
        name: "Redis/KV",
        status: "unknown",
        lastChecked: new Date(),
        configured: false,
      });
      vi.mocked(checkAzureOpenAI).mockResolvedValue({
        name: "Azure OpenAI",
        status: "unknown",
        lastChecked: new Date(),
        configured: false,
      });
      vi.mocked(checkResend).mockResolvedValue({
        name: "Resend",
        status: "unknown",
        lastChecked: new Date(),
        configured: false,
      });
      vi.mocked(checkSentry).mockResolvedValue({
        name: "Sentry",
        status: "unknown",
        lastChecked: new Date(),
        configured: false,
      });
      vi.mocked(checkVercel).mockResolvedValue({
        name: "Vercel",
        status: "unknown",
        lastChecked: new Date(),
        configured: false,
      });

      // Act
      const result = await aggregateHealth();

      // Assert
      expect(result.overallStatus).toBe("degraded");
      expect(result.configuredCount).toBe(1);
      expect(result.unconfiguredCount).toBe(5);
    });

    it("should return correct configuredCount and unconfiguredCount", async () => {
      // Arrange - Mix of configured and unconfigured services
      vi.mocked(checkDatabase).mockResolvedValue({
        name: "Database",
        status: "healthy",
        lastChecked: new Date(),
        configured: true,
      });
      vi.mocked(checkRedis).mockResolvedValue({
        name: "Redis/KV",
        status: "healthy",
        lastChecked: new Date(),
        configured: true,
      });
      vi.mocked(checkAzureOpenAI).mockResolvedValue({
        name: "Azure OpenAI",
        status: "healthy",
        lastChecked: new Date(),
        configured: true,
      });
      vi.mocked(checkResend).mockResolvedValue({
        name: "Resend",
        status: "unknown",
        lastChecked: new Date(),
        configured: false,
      });
      vi.mocked(checkSentry).mockResolvedValue({
        name: "Sentry",
        status: "healthy",
        lastChecked: new Date(),
        configured: true,
      });
      vi.mocked(checkVercel).mockResolvedValue({
        name: "Vercel",
        status: "unknown",
        lastChecked: new Date(),
        configured: false,
      });

      // Act
      const result = await aggregateHealth();

      // Assert
      expect(result.configuredCount).toBe(4);
      expect(result.unconfiguredCount).toBe(2);
      expect(result.services).toHaveLength(6);
    });
  });

  describe("Caching Behavior", () => {
    it("should cache results for 30 seconds", async () => {
      // Arrange
      vi.mocked(checkDatabase).mockResolvedValue({
        name: "Database",
        status: "healthy",
        lastChecked: new Date(),
        configured: true,
      });
      vi.mocked(checkRedis).mockResolvedValue({
        name: "Redis/KV",
        status: "healthy",
        lastChecked: new Date(),
        configured: true,
      });
      vi.mocked(checkAzureOpenAI).mockResolvedValue({
        name: "Azure OpenAI",
        status: "healthy",
        lastChecked: new Date(),
        configured: true,
      });
      vi.mocked(checkResend).mockResolvedValue({
        name: "Resend",
        status: "unknown",
        lastChecked: new Date(),
        configured: false,
      });
      vi.mocked(checkSentry).mockResolvedValue({
        name: "Sentry",
        status: "unknown",
        lastChecked: new Date(),
        configured: false,
      });
      vi.mocked(checkVercel).mockResolvedValue({
        name: "Vercel",
        status: "unknown",
        lastChecked: new Date(),
        configured: false,
      });

      // Act - Call twice
      const result1 = await aggregateHealth();
      const result2 = await aggregateHealth();

      // Assert - Health checks should only be called once (cached)
      expect(checkDatabase).toHaveBeenCalledTimes(1);
      expect(result1).toBe(result2); // Same object reference
    });

    it("should invalidate cache when requested", async () => {
      // Arrange
      vi.mocked(checkDatabase).mockResolvedValue({
        name: "Database",
        status: "healthy",
        lastChecked: new Date(),
        configured: true,
      });
      vi.mocked(checkRedis).mockResolvedValue({
        name: "Redis/KV",
        status: "healthy",
        lastChecked: new Date(),
        configured: true,
      });
      vi.mocked(checkAzureOpenAI).mockResolvedValue({
        name: "Azure OpenAI",
        status: "healthy",
        lastChecked: new Date(),
        configured: true,
      });
      vi.mocked(checkResend).mockResolvedValue({
        name: "Resend",
        status: "unknown",
        lastChecked: new Date(),
        configured: false,
      });
      vi.mocked(checkSentry).mockResolvedValue({
        name: "Sentry",
        status: "unknown",
        lastChecked: new Date(),
        configured: false,
      });
      vi.mocked(checkVercel).mockResolvedValue({
        name: "Vercel",
        status: "unknown",
        lastChecked: new Date(),
        configured: false,
      });

      // Act
      await aggregateHealth();
      invalidateHealthCache();
      await aggregateHealth();

      // Assert - Health checks should be called twice (cache invalidated)
      expect(checkDatabase).toHaveBeenCalledTimes(2);
    });
  });
});
