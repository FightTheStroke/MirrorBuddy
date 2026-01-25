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
      // Per-feature models (ADR 0073) - cost-effective for trial
      chatModel: "gpt-4o-mini",
      realtimeModel: "gpt-realtime-mini",
      pdfModel: "gpt-4o-mini",
      mindmapModel: "gpt-4o-mini",
      quizModel: "gpt-4o-mini",
      flashcardsModel: "gpt-4o-mini",
      summaryModel: "gpt-4o-mini",
      formulaModel: "gpt-4o-mini",
      chartModel: "gpt-4o-mini",
      homeworkModel: "gpt-4o-mini",
      webcamModel: "gpt-4o-mini",
      demoModel: "gpt-4o-mini",
      featureConfigs: null, // No overrides, use DEFAULT_FEATURE_CONFIGS
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
    // Per-feature models (ADR 0073) - education-optimized for registered users
    chatModel: "gpt-5.2-edu",
    realtimeModel: "gpt-realtime",
    pdfModel: "gpt-5-mini",
    mindmapModel: "gpt-5-mini",
    quizModel: "gpt-5.2-edu",
    flashcardsModel: "gpt-5-mini",
    summaryModel: "gpt-5-mini",
    formulaModel: "gpt-5.2-edu",
    chartModel: "gpt-5-mini",
    homeworkModel: "gpt-5.2-edu",
    webcamModel: "gpt-5.2-edu",
    demoModel: "gpt-4o-mini",
    featureConfigs: null, // No overrides, use DEFAULT_FEATURE_CONFIGS
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
