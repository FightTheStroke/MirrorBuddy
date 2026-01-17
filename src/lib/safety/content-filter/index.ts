/**
 * MirrorBuddy Content Filter
 * Input validation and filtering for child safety
 *
 * This module filters user input BEFORE it reaches the AI model.
 * It detects and handles:
 * - Profanity (Italian + English)
 * - Explicit content requests
 * - Jailbreak/injection attempts
 * - Crisis/distress signals
 *
 * Related: #30 Safety Guardrails Issue, S-02 Task
 */

// Types
export type { FilterResult } from './types';
export type { FilterSeverity, FilterAction } from './types';

// Patterns
export {
  PROFANITY_IT,
  PROFANITY_EN,
  JAILBREAK_PATTERNS,
  EXPLICIT_PATTERNS,
  VIOLENCE_PATTERNS,
  PII_PATTERNS,
  matchesPatterns,
} from './patterns';

// Responses
export { SAFE_RESPONSES } from './responses';

// Core functions
export {
  filterInput,
  isInputBlocked,
  getFilterResponse,
  filterMessages,
  hasBlockedMessage,
} from './filter';
