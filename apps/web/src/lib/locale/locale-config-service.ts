// ============================================================================
// LOCALE CONFIG SERVICE
// Manages runtime locale resolution with caching for performance
// Resolves countries to their primary locales and language maestri
// ============================================================================

import "server-only";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { LocaleConfig } from "@prisma/client";

/**
 * LocaleConfigService - Singleton service for locale configuration management
 *
 * Features:
 * - Fetches enabled locale configurations from database
 * - Resolves country codes to locale configurations
 * - Resolves country codes to language maestri
 * - In-memory caching for performance
 * - Cache invalidation support
 */
class LocaleConfigService {
  private static instance: LocaleConfigService;
  private cache: Map<string, LocaleConfig> = new Map();
  private enabledLocalesCache: LocaleConfig[] | null = null;
  private lastCacheUpdate: number = 0;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): LocaleConfigService {
    if (!LocaleConfigService.instance) {
      LocaleConfigService.instance = new LocaleConfigService();
    }
    return LocaleConfigService.instance;
  }

  /**
   * Check if cache is stale
   */
  private isCacheStale(): boolean {
    return Date.now() - this.lastCacheUpdate > this.CACHE_TTL_MS;
  }

  /**
   * Get all enabled locale configurations
   */
  public async getEnabledLocales(): Promise<LocaleConfig[]> {
    try {
      // Return cached data if fresh
      if (this.enabledLocalesCache && !this.isCacheStale()) {
        return this.enabledLocalesCache;
      }

      // Fetch from database
      const locales = await prisma.localeConfig.findMany({
        where: { enabled: true },
        orderBy: { countryName: "asc" },
      });

      // Update cache
      this.enabledLocalesCache = locales;
      this.lastCacheUpdate = Date.now();

      // Update individual locale cache
      this.cache.clear();
      for (const locale of locales) {
        this.cache.set(locale.id, locale);
      }

      logger.info("[LocaleConfigService] Loaded enabled locales", {
        count: locales.length,
        countries: locales.map((l) => l.id).join(", "),
      });

      return locales;
    } catch (error) {
      logger.error("[LocaleConfigService] Failed to fetch enabled locales", {
        error: String(error),
      });
      // Return empty array on error to prevent service disruption
      return [];
    }
  }

  /**
   * Get locale configuration for a specific country code
   * @param countryCode - ISO 3166-1 alpha-2 country code (e.g., "IT", "FR", "DE")
   * @returns LocaleConfig or null if not found or disabled
   */
  public async getLocaleForCountry(
    countryCode: string,
  ): Promise<LocaleConfig | null> {
    try {
      const normalizedCode = countryCode.toUpperCase();

      // Check cache first
      if (this.cache.has(normalizedCode) && !this.isCacheStale()) {
        const cached = this.cache.get(normalizedCode);
        return cached?.enabled ? cached : null;
      }

      // Fetch from database
      const locale = await prisma.localeConfig.findUnique({
        where: { id: normalizedCode },
      });

      // Cache the result if found
      if (locale) {
        this.cache.set(normalizedCode, locale);
        this.lastCacheUpdate = Date.now();
      }

      // Only return if enabled
      return locale?.enabled ? locale : null;
    } catch (error) {
      logger.error("[LocaleConfigService] Failed to get locale for country", {
        countryCode,
        error: String(error),
      });
      return null;
    }
  }

  /**
   * Get primary language maestro ID for a specific country code
   * @param countryCode - ISO 3166-1 alpha-2 country code
   * @returns Maestro ID (e.g., "manzoni-italiano") or null if not found
   */
  public async getMaestroForCountry(
    countryCode: string,
  ): Promise<string | null> {
    try {
      const locale = await this.getLocaleForCountry(countryCode);

      if (!locale) {
        logger.warn(
          "[LocaleConfigService] No enabled locale found for country",
          { countryCode },
        );
        return null;
      }

      return locale.primaryLanguageMaestroId;
    } catch (error) {
      logger.error("[LocaleConfigService] Failed to get maestro for country", {
        countryCode,
        error: String(error),
      });
      return null;
    }
  }

  /**
   * Invalidate all caches
   * Call this after creating/updating/deleting locale configurations
   */
  public invalidateCache(): void {
    this.cache.clear();
    this.enabledLocalesCache = null;
    this.lastCacheUpdate = 0;

    logger.info("[LocaleConfigService] Cache invalidated");
  }

  /**
   * Get cache statistics for monitoring
   */
  public getCacheStats(): {
    size: number;
    enabledLocalesCount: number;
    lastUpdate: number;
    isStale: boolean;
  } {
    return {
      size: this.cache.size,
      enabledLocalesCount: this.enabledLocalesCache?.length ?? 0,
      lastUpdate: this.lastCacheUpdate,
      isStale: this.isCacheStale(),
    };
  }
}

// Export singleton instance
export const localeConfigService = LocaleConfigService.getInstance();
