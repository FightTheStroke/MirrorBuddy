/**
 * MirrorBuddy Output Sanitizer
 * Post-processing filter for AI model outputs
 *
 * This module sanitizes AI OUTPUT after it's generated but before
 * it's shown to the user. It's the last line of defense against:
 * - Leaked system prompts
 * - Inappropriate content that slipped through
 * - Harmful URLs or links
 * - Excessive personal information
 *
 * Related: #30 Safety Guardrails Issue, S-03 Task
 */

// Types
export type { SanitizeResult, SanitizeCategory } from './types';

// Patterns
export {
  SYSTEM_PROMPT_LEAK_PATTERNS,
  POST_GENERATION_BLOCKLIST,
  HARMFUL_URL_PATTERNS,
  OUTPUT_PII_PATTERNS,
  JAILBREAK_SUCCESS_PATTERNS,
  REDACTION_MARKER,
  URL_REDACTION,
} from './patterns';

// Core functions
export {
  sanitizeOutput,
  needsSanitization,
  validateOutput,
} from './sanitizer';

// Streaming
export { StreamingSanitizer } from './streaming';
