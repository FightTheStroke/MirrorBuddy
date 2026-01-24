/**
 * Tier Fallback Utilities
 *
 * Provides inline fallback tier definitions when database is unavailable.
 * Used by TierService as a graceful degradation strategy.
 */

import type { TierDefinition } from "./types";
import { TierCode } from "./types";

/**
 * Create inline fallback tier when database is unavailable
 *
 * @param code - Tier code to create fallback for
 * @returns TierDefinition with sensible defaults
 */
export function createFallbackTier(code: TierCode): TierDefinition {
  const now = new Date();

  if (code === TierCode.TRIAL) {
    return {
      id: "fallback-trial",
      code: "trial",
      name: "Trial",
      description: "Trial tier for anonymous users",
      chatLimitDaily: 10,
      voiceMinutesDaily: 5,
      toolsLimitDaily: 10,
      docsLimitTotal: 1,
      chatModel: "gpt-4o-mini",
      realtimeModel: "gpt-realtime-mini",
      features: {
        chat: true,
        voice: true,
        flashcards: true,
        quizzes: false,
        mindMaps: false,
        tools: ["pdf", "webcam"],
        maestriLimit: 3,
        coachesAvailable: [],
        buddiesAvailable: [],
      },
      availableMaestri: [],
      availableCoaches: [],
      availableBuddies: [],
      availableTools: ["pdf", "webcam"],
      stripePriceId: null,
      monthlyPriceEur: null,
      sortOrder: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
  }

  // Base tier fallback
  return {
    id: "fallback-base",
    code: "base",
    name: "Base",
    description: "Base tier for registered users",
    chatLimitDaily: 30,
    voiceMinutesDaily: 15,
    toolsLimitDaily: 30,
    docsLimitTotal: 5,
    chatModel: "gpt-4o-mini",
    realtimeModel: "gpt-realtime-mini",
    features: {
      chat: true,
      voice: true,
      flashcards: true,
      quizzes: true,
      mindMaps: true,
      tools: ["pdf", "webcam", "homework", "formula"],
      maestriLimit: 10,
      coachesAvailable: [],
      buddiesAvailable: [],
    },
    availableMaestri: [],
    availableCoaches: [],
    availableBuddies: [],
    availableTools: [],
    stripePriceId: null,
    monthlyPriceEur: null,
    sortOrder: 1,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}
