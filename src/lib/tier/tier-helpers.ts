/**
 * TierService Helper Functions
 *
 * Extracted helper logic to keep tier-service.ts under 250 lines
 */

import type { UserSubscription, TierDefinition, TierLimits } from "./types";

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
 * Get AI model from tier based on type
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
