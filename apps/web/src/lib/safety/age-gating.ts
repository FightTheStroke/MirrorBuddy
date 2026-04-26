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

// Re-export types
export type {
  AgeBracket,
  TopicSensitivity,
  ContentTopic,
  AgeGateResult,
} from './age-gating-types';

// Re-export configuration matrix and guidance
export {
  TOPIC_MATRIX,
  ADAPTATION_GUIDANCE,
  ALTERNATIVE_SUGGESTIONS,
} from './age-gating-matrix';

// Re-export core age gating functions
export {
  getAgeBracket,
  checkAgeGate,
} from './age-gating-core';

// Re-export topic detection functions
export {
  detectTopics,
  filterForAge,
} from './age-gating-detection';

// Re-export language guidance functions
export {
  getLanguageGuidance,
  getAgeGatePrompt,
} from './age-gating-language';
