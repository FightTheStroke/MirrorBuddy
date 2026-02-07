/**
 * @module tier
 * Tier management and feature configuration for MirrorBuddy
 */

export type {
  TierDefinition,
  TierFeatures,
  UserSubscription,
  TierAuditLog,
  TierConfigSnapshot,
  EffectiveSubscriptionLimits,
  SubscriptionStatusType,
  FeatureType,
  FeatureAIConfig,
  TierFeatureConfigs,
  ModelCatalogEntry,
  TierLimits,
  UserFeatureConfig,
  UserFeatureConfigInput,
} from "./types";

export {
  TierCode,
  DEFAULT_FEATURE_CONFIGS,
  getSubscriptionStatusDisplay,
  isSubscriptionActive,
  isSubscriptionExpired,
} from "./types";

export type { FeatureModelType } from "./tier-helpers";
export {
  getModelForFeature,
  getModelFromTier,
  getFeatureAIConfig,
} from "./tier-helpers";
