/**
 * MirrorBuddy Safety Prompts (Re-exports)
 * Central module for child-safe AI guardrails
 *
 * CRITICAL: This module MUST be used by ALL AI characters:
 * - All 16 Maestri (historical tutors)
 * - All 5 Coaches (learning method coaches)
 * - Mario/Maria (peer buddies)
 * - Any future character
 *
 * Related: #30 Safety Guardrails Issue
 */

// Re-export core safety module
export {
  SAFETY_CORE_PROMPT,
  SafetyInjectionOptions,
  injectSafetyGuardrails,
  hasSafetyGuardrails,
} from './safety-core';

// Re-export patterns and crisis utilities
export {
  IT_CONTENT_PATTERNS,
  containsCrisisKeywords,
  CRISIS_RESPONSE,
} from './safety-core';
