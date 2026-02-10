/**
 * Tier Fallback Utilities
 *
 * Provides inline fallback tier definitions when database is unavailable.
 * Used by TierService as a graceful degradation strategy.
 */

import type { TierDefinition } from './types';
import { TierCode } from './types';

// Model defaults from env vars (change in .env to migrate without code changes)
const CHAT_MODEL = process.env.DEFAULT_CHAT_MODEL || 'gpt-5-mini';
const CHAT_MODEL_EDU = process.env.DEFAULT_CHAT_MODEL_EDU || 'gpt-5.2-edu';
const DEMO_MODEL = process.env.DEFAULT_DEMO_MODEL || 'gpt-5-nano';

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
      id: 'fallback-trial',
      code: 'trial',
      name: 'Trial',
      description: 'Trial tier for anonymous users',
      chatLimitDaily: 10,
      voiceMinutesDaily: 5,
      toolsLimitDaily: 10,
      docsLimitTotal: 1,
      videoVisionSecondsPerSession: 0,
      videoVisionMinutesMonthly: 0,
      // Per-feature models (ADR 0073) - env-driven defaults
      chatModel: CHAT_MODEL,
      realtimeModel: 'gpt-realtime-mini',
      pdfModel: CHAT_MODEL,
      mindmapModel: CHAT_MODEL,
      quizModel: CHAT_MODEL,
      flashcardsModel: CHAT_MODEL,
      summaryModel: CHAT_MODEL,
      formulaModel: CHAT_MODEL,
      chartModel: CHAT_MODEL,
      homeworkModel: CHAT_MODEL,
      webcamModel: CHAT_MODEL,
      demoModel: DEMO_MODEL,
      featureConfigs: null, // No overrides, use DEFAULT_FEATURE_CONFIGS
      features: {
        chat: true,
        voice: true,
        flashcards: true,
        quizzes: false,
        mindMaps: false,
        tools: ['pdf', 'webcam'],
        maestriLimit: 3,
        coachesAvailable: [],
        buddiesAvailable: [],
      },
      availableMaestri: [],
      availableCoaches: [],
      availableBuddies: [],
      availableTools: ['pdf', 'webcam'],
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
    id: 'fallback-base',
    code: 'base',
    name: 'Base',
    description: 'Base tier for registered users',
    chatLimitDaily: 50,
    voiceMinutesDaily: 30,
    toolsLimitDaily: 30,
    docsLimitTotal: 5,
    videoVisionSecondsPerSession: 0,
    videoVisionMinutesMonthly: 0,
    // Per-feature models (ADR 0073) - env-driven defaults
    chatModel: CHAT_MODEL_EDU,
    realtimeModel: 'gpt-realtime',
    pdfModel: CHAT_MODEL,
    mindmapModel: CHAT_MODEL,
    quizModel: CHAT_MODEL_EDU,
    flashcardsModel: CHAT_MODEL,
    summaryModel: CHAT_MODEL,
    formulaModel: CHAT_MODEL_EDU,
    chartModel: CHAT_MODEL,
    homeworkModel: CHAT_MODEL_EDU,
    webcamModel: CHAT_MODEL_EDU,
    demoModel: DEMO_MODEL,
    featureConfigs: null, // No overrides, use DEFAULT_FEATURE_CONFIGS
    features: {
      chat: true,
      voice: true,
      flashcards: true,
      quizzes: true,
      mindMaps: true,
      tools: ['pdf', 'webcam', 'homework', 'formula'],
      maestriLimit: 25,
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
