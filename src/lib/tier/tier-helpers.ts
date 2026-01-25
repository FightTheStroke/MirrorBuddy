/**
 * TierService Helper Functions
 *
 * Extracted helper logic to keep tier-service.ts under 250 lines
 * Includes per-feature AI configuration (ADR 0073)
 */

import type {
  UserSubscription,
  TierDefinition,
  TierLimits,
  FeatureAIConfig,
  TierFeatureConfigs,
} from "./types";
import { DEFAULT_FEATURE_CONFIGS, type FeatureType } from "./types";

/**
 * Validate subscription status and dates
 *
 * Subscription is valid if:
 * - Status is ACTIVE or TRIAL
 * - Start date is in the past or today
 * - End date is in the future or null (no expiration)
 */
export function isSubscriptionValid(subscription: UserSubscription): boolean {
  const now = new Date();

  // Check status
  const validStatuses = ["ACTIVE", "TRIAL"];
  if (!validStatuses.includes(subscription.status)) {
    return false;
  }

  // Check start date (subscription not started yet)
  if (subscription.startedAt > now) {
    return false;
  }

  // Check expiration date
  if (subscription.expiresAt && subscription.expiresAt <= now) {
    return false;
  }

  return true;
}

/**
 * Extract tier limits from tier definition
 */
export function extractTierLimits(tier: TierDefinition): TierLimits {
  return {
    dailyMessages: tier.chatLimitDaily,
    dailyVoiceMinutes: tier.voiceMinutesDaily,
    dailyTools: tier.toolsLimitDaily,
    maxDocuments: tier.docsLimitTotal,
    maxMaestri: (tier.features as { maestriLimit?: number })?.maestriLimit ?? 3,
  };
}

/**
 * Get AI model from tier based on type (legacy)
 * @deprecated Use getModelForFeature for per-feature selection
 */
export function getModelFromTier(
  tier: TierDefinition,
  type: "chat" | "vision" | "tts",
): string {
  if (type === "tts") {
    return tier.realtimeModel;
  }

  // For chat and vision, use chatModel
  // Vision capabilities are included in chat models (gpt-4o, gpt-4o-mini)
  return tier.chatModel;
}

/**
 * Feature type for per-feature model selection (ADR 0073)
 */
export type FeatureModelType =
  | "chat"
  | "realtime"
  | "pdf"
  | "mindmap"
  | "quiz"
  | "flashcards"
  | "summary"
  | "formula"
  | "chart"
  | "homework"
  | "webcam"
  | "demo";

/**
 * Get AI model for a specific feature (ADR 0073)
 *
 * @param tier - Tier definition with per-feature models
 * @param feature - Feature type (chat, mindmap, quiz, etc.)
 * @returns Model name for the feature
 */
export function getModelForFeature(
  tier: TierDefinition,
  feature: FeatureModelType,
): string {
  const modelMap: Record<FeatureModelType, string> = {
    chat: tier.chatModel,
    realtime: tier.realtimeModel,
    pdf: tier.pdfModel,
    mindmap: tier.mindmapModel,
    quiz: tier.quizModel,
    flashcards: tier.flashcardsModel,
    summary: tier.summaryModel,
    formula: tier.formulaModel,
    chart: tier.chartModel,
    homework: tier.homeworkModel,
    webcam: tier.webcamModel,
    demo: tier.demoModel,
  };

  return modelMap[feature] || tier.chatModel;
}

/**
 * Get full AI configuration for a specific feature (ADR 0073)
 *
 * Returns model, temperature, and maxTokens with the following priority:
 * 1. Tier's featureConfigs override (if set)
 * 2. Per-feature model column from tier
 * 3. DEFAULT_FEATURE_CONFIGS for temperature/maxTokens
 *
 * @param tier - Tier definition
 * @param feature - Feature type
 * @returns Complete FeatureAIConfig with model, temperature, maxTokens
 */
export function getFeatureAIConfig(
  tier: TierDefinition,
  feature: FeatureType,
): FeatureAIConfig {
  // Get base model from tier's per-feature model columns
  const model = getModelForFeature(tier, feature as FeatureModelType);

  // Get default temperature and maxTokens
  const defaults = DEFAULT_FEATURE_CONFIGS[feature];

  // Check for tier-specific overrides in featureConfigs JSON
  const overrides = (tier.featureConfigs as TierFeatureConfigs | null)?.[
    feature
  ];

  return {
    model: overrides?.model ?? model,
    temperature: overrides?.temperature ?? defaults.temperature,
    maxTokens: overrides?.maxTokens ?? defaults.maxTokens,
  };
}
