/**
 * TierService - Core tier subscription logic
 *
 * Provides:
 * - getEffectiveTier(userId) - Determine which tier applies to a user
 * - Subscription validation (dates, status)
 * - Graceful fallbacks (Base for registered, Trial for anonymous)
 * - Error handling with logging
 *
 * Business Rules:
 * - null userId → Trial tier (anonymous users)
 * - User without subscription → Base tier (default for registered users)
 * - User with valid subscription → Their subscribed tier
 * - Expired/cancelled subscription → Fallback to Base tier
 * - Subscription validity: status=ACTIVE/TRIAL + startDate <= now < endDate (or null endDate)
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type {
  TierDefinition,
  UserSubscription,
  TierLimits,
  TierFeatures,
} from "./types";
import { TierCode } from "./types";
import { createFallbackTier } from "./tier-fallbacks";
import { transformTier } from "./tier-transformer";
import {
  isSubscriptionValid,
  extractTierLimits,
  getModelFromTier,
} from "./tier-helpers";

export class TierService {
  // Cache for tier feature configs (rarely change)
  private featureCache = new Map<string, Record<string, unknown>>();

  /**
   * Invalidate all cached tier features
   * Call this after tier updates in admin panel
   */
  invalidateCache(): void {
    this.featureCache.clear();
    logger.info("All tier caches invalidated");
  }

  /**
   * Invalidate cache for a specific tier by ID
   * More efficient than clearing entire cache when only one tier changes
   *
   * @param tierId - Tier ID to invalidate (e.g., "tier-pro", "tier-base")
   */
  invalidateTierCache(tierId: string): void {
    this.featureCache.delete(tierId);
    logger.info("Tier cache invalidated", { tierId });
  }

  /**
   * Check if a user has access to a specific feature
   *
   * @param userId - User ID (null for anonymous users)
   * @param featureKey - Feature identifier (e.g., "chat", "voice", "quizzes")
   * @returns true if feature is enabled for user's tier, false otherwise
   */
  async checkFeatureAccess(
    userId: string | null,
    featureKey: string,
  ): Promise<boolean> {
    try {
      // Get user's effective tier
      const tier = await this.getEffectiveTier(userId);

      // Get cached features or cache them
      let features = this.featureCache.get(tier.id);
      if (!features) {
        features = tier.features as Record<string, unknown>;
        this.featureCache.set(tier.id, features);
      }

      // For registered users, check for admin feature overrides
      if (userId) {
        const subscription = await this.getUserSubscription(userId);
        if (subscription?.overrideFeatures) {
          const overrides = subscription.overrideFeatures as Record<
            string,
            unknown
          >;
          // Check if this specific feature has an override
          if (featureKey in overrides) {
            const overrideValue = overrides[featureKey];
            if (typeof overrideValue === "boolean") {
              return overrideValue;
            }
            return Boolean(overrideValue);
          }
        }
      }

      // Check if feature exists and is enabled in tier
      if (!(featureKey in features)) {
        return false;
      }

      const featureValue = features[featureKey];

      // Handle boolean values
      if (typeof featureValue === "boolean") {
        return featureValue;
      }

      // Handle truthy values (arrays, objects, etc.)
      return Boolean(featureValue);
    } catch (error) {
      logger.error("Error checking feature access, denying access", {
        userId,
        featureKey,
        error: String(error),
      });
      return false;
    }
  }

  /**
   * Get the effective tier for a user with admin overrides applied
   *
   * @param userId - User ID (null for anonymous users)
   * @returns TierDefinition with overrideFeatures and overrideLimits merged
   */
  async getEffectiveTier(userId: string | null): Promise<TierDefinition> {
    try {
      // Anonymous users → Trial tier (no overrides possible)
      if (!userId) {
        return await this.getTierByCode(TierCode.TRIAL);
      }

      // Registered users: check for subscription
      const subscription = await this.getUserSubscription(userId);

      if (!subscription) {
        // No subscription → Base tier (default for registered users)
        return await this.getTierByCode(TierCode.BASE);
      }

      // Validate subscription
      if (isSubscriptionValid(subscription)) {
        // Valid subscription → Return subscribed tier with overrides applied
        const baseTier = subscription.tier!;

        // Apply admin overrides if present
        return this.applyOverrides(baseTier, subscription);
      }

      // Invalid/expired subscription → Fallback to Base tier
      logger.warn("Invalid subscription, falling back to Base tier", {
        userId,
        subscriptionId: subscription.id,
        status: subscription.status,
        expiresAt: subscription.expiresAt,
      });

      return await this.getTierByCode(TierCode.BASE);
    } catch (error) {
      logger.error("Error fetching effective tier, using fallback", {
        userId,
        error: String(error),
      });

      // Error fallback: Trial for anonymous, Base for registered
      const fallbackCode = userId ? TierCode.BASE : TierCode.TRIAL;
      return await this.getTierByCode(fallbackCode);
    }
  }

  /**
   * Apply subscription overrides to a tier definition
   * Merges overrideFeatures and overrideLimits into the tier
   */
  private applyOverrides(
    tier: TierDefinition,
    subscription: UserSubscription,
  ): TierDefinition {
    const hasFeatureOverrides =
      subscription.overrideFeatures &&
      Object.keys(subscription.overrideFeatures as object).length > 0;
    const hasLimitOverrides =
      subscription.overrideLimits &&
      Object.keys(subscription.overrideLimits as object).length > 0;

    // No overrides, return tier as-is
    if (!hasFeatureOverrides && !hasLimitOverrides) {
      return tier;
    }

    // Create a new tier with overrides merged
    const mergedTier: TierDefinition = { ...tier };

    // Merge feature overrides
    if (hasFeatureOverrides) {
      mergedTier.features = {
        ...tier.features,
        ...(subscription.overrideFeatures as Partial<TierFeatures>),
      } as TierFeatures;
    }

    // Merge limit overrides
    if (hasLimitOverrides) {
      const limitOverrides = subscription.overrideLimits as Record<
        string,
        number
      >;
      if (limitOverrides.chatLimitDaily !== undefined) {
        mergedTier.chatLimitDaily = limitOverrides.chatLimitDaily;
      }
      if (limitOverrides.voiceMinutesDaily !== undefined) {
        mergedTier.voiceMinutesDaily = limitOverrides.voiceMinutesDaily;
      }
      if (limitOverrides.toolsLimitDaily !== undefined) {
        mergedTier.toolsLimitDaily = limitOverrides.toolsLimitDaily;
      }
      if (limitOverrides.docsLimitTotal !== undefined) {
        mergedTier.docsLimitTotal = limitOverrides.docsLimitTotal;
      }
    }

    return mergedTier;
  }

  /**
   * Get tier by code with fallback to inline tier if not found
   */
  private async getTierByCode(code: TierCode): Promise<TierDefinition> {
    try {
      const tier = await prisma.tierDefinition.findUnique({
        where: { code },
      });

      if (tier) {
        return transformTier(tier);
      }

      // Fallback: tier not in database, create inline
      logger.warn("Tier not found in database, using inline fallback", {
        code,
      });
      return createFallbackTier(code);
    } catch (error) {
      logger.error("Error fetching tier by code, using inline fallback", {
        code,
        error: String(error),
      });
      return createFallbackTier(code);
    }
  }

  /**
   * Get user subscription with tier included
   */
  private async getUserSubscription(
    userId: string,
  ): Promise<UserSubscription | null> {
    try {
      const subscription = await prisma.userSubscription.findUnique({
        where: { userId },
        include: { tier: true },
      });

      if (!subscription) {
        return null;
      }

      return {
        ...subscription,
        tier: subscription.tier ? transformTier(subscription.tier) : undefined,
      } as UserSubscription;
    } catch (error) {
      logger.error("Error fetching user subscription", {
        userId,
        error: String(error),
      });
      return null;
    }
  }

  /**
   * Get tier limits for a user
   *
   * @param userId - User ID (null for anonymous users)
   * @returns TierLimits with consumption limits for the user's tier,
   *          merged with any admin-set overrideLimits from subscription
   */
  async getLimitsForUser(userId: string | null): Promise<TierLimits> {
    try {
      const tier = await this.getEffectiveTier(userId);
      const baseLimits = extractTierLimits(tier);

      // For registered users, check for admin overrides
      if (userId) {
        const subscription = await this.getUserSubscription(userId);
        if (subscription?.overrideLimits) {
          const overrides = subscription.overrideLimits as Partial<TierLimits>;
          // Merge overrides into base limits (overrides take precedence)
          return {
            ...baseLimits,
            ...overrides,
          };
        }
      }

      return baseLimits;
    } catch (error) {
      logger.error("Error fetching limits for user, using fallback", {
        userId,
        error: String(error),
      });

      const fallbackCode = userId ? TierCode.BASE : TierCode.TRIAL;
      const fallbackTier = await this.getTierByCode(fallbackCode);
      return extractTierLimits(fallbackTier);
    }
  }

  /**
   * Get the appropriate AI model for a user based on their tier
   *
   * @param userId - User ID (null for anonymous users)
   * @param type - Model type: 'chat', 'vision', or 'tts'
   * @returns Model name string (e.g., "gpt-4o", "gpt-4o-mini", "gpt-realtime")
   */
  async getAIModelForUser(
    userId: string | null,
    type: "chat" | "vision" | "tts",
  ): Promise<string> {
    try {
      const tier = await this.getEffectiveTier(userId);
      return getModelFromTier(tier, type);
    } catch (error) {
      logger.error("Error fetching AI model for user, using fallback", {
        userId,
        type,
        error: String(error),
      });

      const fallbackCode = userId ? TierCode.BASE : TierCode.TRIAL;
      const fallbackTier = await this.getTierByCode(fallbackCode);
      return getModelFromTier(fallbackTier, type);
    }
  }
}

/**
 * Singleton instance of TierService
 * Used across the application to share cache state
 */
export const tierService = new TierService();
