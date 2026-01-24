// ============================================================================
// TIER DEFINITION TYPES - Complete tier configuration and effective tier info
// ============================================================================

import type {
  TierName,
  TierLimits,
  TierAIModels,
  TierFeatureConfig,
  TierPricing,
  UsageType,
} from "./tier-types";
import type { UserSubscription, SubscriptionUsage } from "./tier-subscription";

/**
 * Complete tier definition with all configuration
 */
export interface TierDefinition {
  /** Unique tier identifier */
  id: TierName;

  /** Display name for UI */
  displayName: string;

  /** Human-readable description */
  description: string;

  /** Tier limits and quotas */
  limits: TierLimits;

  /** Available features for this tier */
  features: TierFeatureConfig;

  /** AI models available in this tier */
  models: TierAIModels;

  /** Pricing information */
  pricing: TierPricing;

  /** Order/priority (lower = lower tier) */
  order: number;

  /** Whether this tier is public/available for signup */
  isPublic: boolean;

  /** ISO date when tier became available (optional) */
  availableFrom?: string;

  /** ISO date when tier was deprecated (optional) */
  deprecatedAt?: string;
}

/**
 * Effective tier info combining subscription and tier definition
 * This provides a complete view of a user's current tier status,
 * combining their subscription record with the tier definition
 * and current usage for the billing period
 */
export interface EffectiveTier {
  /** The user's current subscription tier */
  subscription: UserSubscription;

  /** The tier definition corresponding to the subscription tier */
  definition: TierDefinition;

  /** Current usage for this billing period */
  usage: SubscriptionUsage[];

  /** Whether any usage limits have been reached */
  limitsReached: Partial<Record<UsageType, boolean>>;

  /** Days until expiry (null if no expiry) */
  daysUntilExpiry: number | null;
}
