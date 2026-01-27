/**
 * Tier-Specific Memory Configuration
 *
 * Defines conversation memory limits and features for each subscription tier.
 * These limits control:
 * - How many previous conversations are retained
 * - How long conversation history is kept
 * - Maximum key facts and topics stored
 * - Advanced features like semantic search and cross-maestro memory
 *
 * ADR: 0021-conversational-memory-injection.md
 */

import type { TierName } from "@/types/tier-types";

/**
 * Configuration for conversation memory limits per tier
 */
export interface TierMemoryLimits {
  /** Number of recent closed conversations to consider for memory injection */
  recentConversations: number;

  /** Number of days to retain conversation history (null = unlimited) */
  timeWindowDays: number | null;

  /** Maximum number of key facts to store and inject into prompts */
  maxKeyFacts: number;

  /** Maximum number of topics to store and inject into prompts */
  maxTopics: number;

  /** Whether semantic search is enabled for conversation retrieval */
  semanticEnabled: boolean;

  /** Whether memory can be shared across different maestri (cross-maestro memory) */
  crossMaestroEnabled: boolean;
}

/**
 * Memory configuration for each subscription tier
 *
 * Trial: No memory - each conversation starts fresh
 * Base: Limited memory - 3 conversations, 15 days, 10 facts, 15 topics
 * Pro: Full memory - 5 conversations, unlimited, 50 facts, 30 topics, semantic + cross-maestro
 */
export const TIER_MEMORY_CONFIG: Record<TierName, TierMemoryLimits> = {
  trial: {
    recentConversations: 0,
    timeWindowDays: 0,
    maxKeyFacts: 0,
    maxTopics: 0,
    semanticEnabled: false,
    crossMaestroEnabled: false,
  },

  base: {
    recentConversations: 3,
    timeWindowDays: 15,
    maxKeyFacts: 10,
    maxTopics: 15,
    semanticEnabled: false,
    crossMaestroEnabled: false,
  },

  pro: {
    recentConversations: 5,
    timeWindowDays: null,
    maxKeyFacts: 50,
    maxTopics: 30,
    semanticEnabled: true,
    crossMaestroEnabled: true,
  },
};

/**
 * Get memory configuration for a specific tier
 *
 * Returns a deep copy to prevent accidental mutations
 * of the configuration object.
 *
 * @param tierName The subscription tier
 * @returns Memory limits for the tier
 *
 * @example
 * const limits = getTierMemoryLimits('pro');
 * console.log(limits.maxKeyFacts); // 50
 */
export function getTierMemoryLimits(tierName: TierName): TierMemoryLimits {
  return structuredClone(TIER_MEMORY_CONFIG[tierName]);
}
