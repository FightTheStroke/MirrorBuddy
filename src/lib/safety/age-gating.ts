/**
 * MirrorBuddy Age Gating Module
 * Ensures content is appropriate for the student's age group
 *
 * This module provides:
 * - Age-appropriate content filtering
 * - Topic restrictions by age bracket
 * - Language complexity adaptation
 * - Sensitive topic handling based on developmental stage
 *
 * Related: #30 Safety Guardrails Issue
 */

// Re-export all from modular age-gating directory
export type {
  AgeBracket,
  TopicSensitivity,
  ContentTopic,
  AgeGateResult,
} from './age-gating/types';

export {
  TOPIC_MATRIX,
  ADAPTATION_GUIDANCE,
  ALTERNATIVE_SUGGESTIONS,
} from './age-gating/topic-matrix';

export {
  getAgeBracket,
  checkAgeGate,
} from './age-gating/core';

export {
  detectTopics,
  filterForAge,
} from './age-gating/topic-detection';

export {
  getLanguageGuidance,
  getAgeGatePrompt,
} from './age-gating/language-guidance';
