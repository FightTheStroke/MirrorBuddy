// ============================================================================
// AGE GATING MODULE INDEX
// Re-exports all age gating functionality
// ============================================================================

export type {
  AgeBracket,
  TopicSensitivity,
  ContentTopic,
  AgeGateResult,
} from './types';

export { TOPIC_MATRIX, ADAPTATION_GUIDANCE, ALTERNATIVE_SUGGESTIONS } from './topic-matrix';
export { getAgeBracket, checkAgeGate } from './core';
export { detectTopics, filterForAge } from './topic-detection';
export { getLanguageGuidance, getAgeGatePrompt } from './language-guidance';
