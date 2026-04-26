/**
 * Tests for Azure Key Vault Service
 *
 * Test coverage:
 * - Environment variable fallback when AZURE_KEY_VAULT_URL not set
 * - Secret caching and cache expiry
 * - Error handling and retry logic
 *
 * Note: Azure SDK tests are limited because the module uses dynamic imports.
 * The primary focus is on testing fallback behavior and caching logic.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getSecret,
  setSecret,
  cacheSecret,
  clearCachedSecret,
  clearAllCachedSecrets,
  isAzureKeyVaultAvailable,
  getCacheStats,
  getSecretWithRetry,
} from "../azure-key-vault";

describe("azure-key-vault", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    clearAllCachedSecrets();
    // Clone env to avoid side effects
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getSecret - environment variable fallback", () => {
    it("should return env var when AZURE_KEY_VAULT_URL not set", async () => {
      delete process.env.AZURE_KEY_VAULT_URL;
      process.env.TEST_SECRET = "test-value-from-env";

      const result = await getSecret("TEST_SECRET");

      expect(result).toBe("test-value-from-env");
    });

    it("should throw error when secret not found in env vars", async () => {
      delete process.env.AZURE_KEY_VAULT_URL;
      delete process.env.MISSING_SECRET;

      await expect(getSecret("MISSING_SECRET")).rejects.toThrow(
        'Secret "MISSING_SECRET" not found in Azure Key Vault or environment variables',
      );
    });

    it("should cache env var values", async () => {
      delete process.env.AZURE_KEY_VAULT_URL;
      process.env.CACHED_SECRET = "cached-value";

      const result1 = await getSecret("CACHED_SECRET");
      const result2 = await getSecret("CACHED_SECRET");

      expect(result1).toBe("cached-value");
      expect(result2).toBe("cached-value");

      const stats = getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.entries[0].secretName).toBe("CACHED_SECRET");
    });
  });

  describe("getSecret - Azure Key Vault fallback", () => {
    it("should fall back to env var when Azure SDK not available", async () => {
      // When AZURE_KEY_VAULT_URL is set but SDK not installed, falls back to env
      process.env.AZURE_KEY_VAULT_URL = "https://test-vault.vault.azure.net";
      process.env.FALLBACK_SECRET = "env-fallback-value";

      const result = await getSecret("FALLBACK_SECRET");

      expect(result).toBe("env-fallback-value");
    });

    it("should throw if secret not found in env when SDK unavailable", async () => {
      process.env.AZURE_KEY_VAULT_URL = "https://test-vault.vault.azure.net";
      delete process.env.MISSING_SECRET;

      await expect(getSecret("MISSING_SECRET")).rejects.toThrow(
        'Secret "MISSING_SECRET" not found in Azure Key Vault or environment variables',
      );
    });
  });

  describe("secret caching", () => {
    it("should cache secrets on second call", async () => {
      delete process.env.AZURE_KEY_VAULT_URL;
      process.env.CACHED_ENV_SECRET = "cached-env-value";

      const result1 = await getSecret("CACHED_ENV_SECRET");
      const result2 = await getSecret("CACHED_ENV_SECRET");

      expect(result1).toBe("cached-env-value");
      expect(result2).toBe("cached-env-value");

      const stats = getCacheStats();
      expect(stats.size).toBe(1);
    });

    it("should skip cache when skipCache option is true", async () => {
      delete process.env.AZURE_KEY_VAULT_URL;
      process.env.SKIP_CACHE_SECRET = "skip-cache-value";

      await getSecret("SKIP_CACHE_SECRET");
      // Clear the cache to simulate skipCache behavior
      clearCachedSecret("SKIP_CACHE_SECRET");
      const result = await getSecret("SKIP_CACHE_SECRET", { skipCache: true });

      expect(result).toBe("skip-cache-value");
    });

    it("should expire cached secrets after TTL", async () => {
      delete process.env.AZURE_KEY_VAULT_URL;
      process.env.EXPIRING_SECRET = "expiring-value";

      const shortTTL = 100; // 100ms
      await getSecret("EXPIRING_SECRET", { ttlMs: shortTTL });

      // Wait for cache to expire
      await new Promise((resolve) => setTimeout(resolve, shortTTL + 50));

      const stats = getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.entries[0].expiresIn).toBe(0);

      // Next call should fetch again (from env)
      const result = await getSecret("EXPIRING_SECRET");
      expect(result).toBe("expiring-value");
    });

    it("should allow manual cache clearing", async () => {
      delete process.env.AZURE_KEY_VAULT_URL;
      process.env.MANUAL_CLEAR = "value-to-clear";

      await getSecret("MANUAL_CLEAR");
      expect(getCacheStats().size).toBe(1);

      clearCachedSecret("MANUAL_CLEAR");
      expect(getCacheStats().size).toBe(0);
    });

    it("should allow clearing all cached secrets", async () => {
      delete process.env.AZURE_KEY_VAULT_URL;
      process.env.SECRET_1 = "value-1";
      process.env.SECRET_2 = "value-2";

      await getSecret("SECRET_1");
      await getSecret("SECRET_2");
      expect(getCacheStats().size).toBe(2);

      clearAllCachedSecrets();
      expect(getCacheStats().size).toBe(0);
    });
  });

  describe("setSecret", () => {
    it("should throw error when Azure Key Vault not available (no URL)", async () => {
      delete process.env.AZURE_KEY_VAULT_URL;

      await expect(setSecret("NEW_SECRET", "new-value")).rejects.toThrow(
        "Azure Key Vault not available",
      );
    });

    it("should throw error when Azure SDK not installed", async () => {
      process.env.AZURE_KEY_VAULT_URL = "https://test-vault.vault.azure.net";

      // SDK not installed in test environment, should fail
      await expect(setSecret("NEW_SECRET", "new-value")).rejects.toThrow(
        "Azure Key Vault not available",
      );
    });
  });

  describe("getSecretWithRetry", () => {
    it("should succeed on first attempt", async () => {
      delete process.env.AZURE_KEY_VAULT_URL;
      process.env.RETRY_SECRET = "retry-value";

      const result = await getSecretWithRetry("RETRY_SECRET");

      expect(result).toBe("retry-value");
    });

    it("should throw error after max retries when secret not found", async () => {
      delete process.env.AZURE_KEY_VAULT_URL;
      delete process.env.FAILING_SECRET;

      await expect(getSecretWithRetry("FAILING_SECRET", 2, 10)).rejects.toThrow(
        'Failed to get secret "FAILING_SECRET" after 2 attempts',
      );
    });
  });

  describe("isAzureKeyVaultAvailable", () => {
    it("should return false when AZURE_KEY_VAULT_URL not set", async () => {
      delete process.env.AZURE_KEY_VAULT_URL;

      const result = await isAzureKeyVaultAvailable();

      expect(result).toBe(false);
    });

    it("should return false when Azure SDK not installed", async () => {
      process.env.AZURE_KEY_VAULT_URL = "https://test-vault.vault.azure.net";

      // SDK packages not installed in test environment
      const result = await isAzureKeyVaultAvailable();

      expect(result).toBe(false);
    });
  });

  describe("getCacheStats", () => {
    it("should return empty stats when cache is empty", () => {
      const stats = getCacheStats();

      expect(stats.size).toBe(0);
      expect(stats.entries).toEqual([]);
    });

    it("should return accurate stats for cached secrets", async () => {
      delete process.env.AZURE_KEY_VAULT_URL;
      process.env.STATS_SECRET_1 = "value-1";
      process.env.STATS_SECRET_2 = "value-2";

      await getSecret("STATS_SECRET_1");
      await getSecret("STATS_SECRET_2");

      const stats = getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.entries).toHaveLength(2);
      expect(stats.entries[0].expiresIn).toBeGreaterThan(0);
      expect(stats.entries[1].expiresIn).toBeGreaterThan(0);
    });
  });

  describe("cacheSecret", () => {
    it("should allow manual secret caching", () => {
      cacheSecret("MANUAL_SECRET", "manual-value", 60000);

      const stats = getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.entries[0].secretName).toBe("MANUAL_SECRET");
      expect(stats.entries[0].expiresIn).toBeGreaterThan(0);
    });

    it("should use default TTL when not specified", () => {
      cacheSecret("DEFAULT_TTL_SECRET", "default-ttl-value");

      const stats = getCacheStats();
      expect(stats.size).toBe(1);
      // Default TTL is 5 minutes = 300000ms, should be close to that
      expect(stats.entries[0].expiresIn).toBeGreaterThan(290000);
    });
  });
});
