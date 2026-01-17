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

import { containsCrisisKeywords } from './safety-prompts-core';
import { IT_CONTENT_PATTERNS } from './safety-patterns';
import {
  PROFANITY_EN,
  PROFANITY_IT,
  JAILBREAK_PATTERNS,
  EXPLICIT_PATTERNS,
  VIOLENCE_PATTERNS,
  PII_PATTERNS,
  SAFE_RESPONSES,
} from './content-filter-patterns';

/**
 * Severity levels for content filtering
 */
export type FilterSeverity = 'none' | 'low' | 'medium' | 'high' | 'critical';

/**
 * Filter action to take based on severity
 */
export type FilterAction = 'allow' | 'warn' | 'redirect' | 'block';

/**
 * Result of content filtering
 */
export interface FilterResult {
  /** Whether the content is safe to process */
  safe: boolean;
  /** Severity level of detected issues */
  severity: FilterSeverity;
  /** Recommended action */
  action: FilterAction;
  /** Reason for the result (internal, never shown to user) */
  reason?: string;
  /** Category of detected issue */
  category?: 'profanity' | 'explicit' | 'jailbreak' | 'crisis' | 'pii' | 'violence';
  /** Suggested response to show user (if not safe) */
  suggestedResponse?: string;
}

/**
 * Check text against a list of patterns
 * Note: Resets lastIndex for global patterns to avoid stateful matching issues
 */
function matchesPatterns(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => {
    pattern.lastIndex = 0; // Reset for global patterns
    return pattern.test(text);
  });
}

/**
 * Main content filtering function.
 * Call this on every user input BEFORE sending to AI.
 *
 * @param text - The user's input text
 * @returns FilterResult with safety assessment and recommended action
 *
 * @example
 * const result = filterInput(userMessage);
 * if (!result.safe) {
 *   return result.suggestedResponse;
 * }
 * // Proceed with AI call
 */
export function filterInput(text: string): FilterResult {
  // Normalize: lowercase for pattern matching, but keep original for context
  const normalized = text.toLowerCase().trim();

  // Empty input is safe but pointless
  if (!normalized) {
    return {
      safe: true,
      severity: 'none',
      action: 'allow',
    };
  }

  // CRITICAL: Check for crisis/distress first (highest priority)
  if (containsCrisisKeywords(text)) {
    return {
      safe: false,
      severity: 'critical',
      action: 'redirect',
      reason: 'Crisis keywords detected',
      category: 'crisis',
      suggestedResponse: SAFE_RESPONSES.crisis,
    };
  }

  // HIGH: Violence patterns
  if (matchesPatterns(normalized, VIOLENCE_PATTERNS)) {
    return {
      safe: false,
      severity: 'high',
      action: 'block',
      reason: 'Violence-related content detected',
      category: 'violence',
      suggestedResponse: SAFE_RESPONSES.violence,
    };
  }

  // HIGH: Jailbreak attempts
  if (matchesPatterns(normalized, JAILBREAK_PATTERNS)) {
    return {
      safe: false,
      severity: 'high',
      action: 'redirect',
      reason: 'Jailbreak/injection attempt detected',
      category: 'jailbreak',
      suggestedResponse: SAFE_RESPONSES.jailbreak,
    };
  }

  // HIGH: Explicit content
  if (matchesPatterns(normalized, EXPLICIT_PATTERNS)) {
    return {
      safe: false,
      severity: 'high',
      action: 'block',
      reason: 'Explicit content request detected',
      category: 'explicit',
      suggestedResponse: SAFE_RESPONSES.explicit,
    };
  }

  // MEDIUM: Profanity (IT)
  if (matchesPatterns(normalized, PROFANITY_IT)) {
    return {
      safe: false,
      severity: 'medium',
      action: 'warn',
      reason: 'Italian profanity detected',
      category: 'profanity',
      suggestedResponse: SAFE_RESPONSES.profanity,
    };
  }

  // MEDIUM: Profanity (EN)
  if (matchesPatterns(normalized, PROFANITY_EN)) {
    return {
      safe: false,
      severity: 'medium',
      action: 'warn',
      reason: 'English profanity detected',
      category: 'profanity',
      suggestedResponse: SAFE_RESPONSES.profanity,
    };
  }

  // Check for severe Italian patterns from safety-prompts
  const severePatterns = IT_CONTENT_PATTERNS.severe;
  if (severePatterns.some((pattern) => normalized.includes(pattern))) {
    return {
      safe: false,
      severity: 'high',
      action: 'block',
      reason: 'Severe content pattern detected',
      category: 'violence',
      suggestedResponse: SAFE_RESPONSES.violence,
    };
  }

  // F-16: PII detection now blocks (safe: false)
  if (matchesPatterns(text, PII_PATTERNS)) {
    return {
      safe: false, // F-16: Block PII for privacy protection
      severity: 'medium',
      action: 'block',
      reason: 'PII detected in input',
      category: 'pii',
      suggestedResponse: SAFE_RESPONSES.pii,
    };
  }

  // All checks passed
  return {
    safe: true,
    severity: 'none',
    action: 'allow',
  };
}

/**
 * Quick check if input contains any blocking issues.
 * Use this for fast-path checks before detailed filtering.
 */
export function isInputBlocked(text: string): boolean {
  const result = filterInput(text);
  return result.action === 'block';
}

/**
 * Get appropriate response for blocked/warned content.
 * Returns null if content is safe.
 */
export function getFilterResponse(text: string): string | null {
  const result = filterInput(text);
  if (result.safe && result.action === 'allow') {
    return null;
  }
  return result.suggestedResponse || SAFE_RESPONSES.jailbreak;
}

/**
 * Batch filter multiple messages (useful for conversation history)
 */
export function filterMessages(messages: string[]): FilterResult[] {
  return messages.map(filterInput);
}

/**
 * Check if any message in a batch is blocked
 */
export function hasBlockedMessage(messages: string[]): boolean {
  return messages.some((msg) => isInputBlocked(msg));
}

/**
 * F-16: Redact PII from text before processing
 * Replaces detected PII patterns with placeholder text
 *
 * @param text - The input text that may contain PII
 * @returns Text with PII redacted
 *
 * @example
 * redactPII("Call me at 333-123-4567"); // "Call me at [PHONE]"
 * redactPII("Email: test@example.com"); // "Email: [EMAIL]"
 */
export function redactPII(text: string): string {
  let redacted = text;

  // Email addresses
  redacted = redacted.replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, '[EMAIL]');

  // Italian phone numbers
  redacted = redacted.replace(/\+39\s*\d{10}/g, '[PHONE]');
  redacted = redacted.replace(/\b3\d{2}[\s.-]?\d{3}[\s.-]?\d{4}\b/g, '[PHONE]');
  redacted = redacted.replace(/\b0\d{1,3}[\s.-]?\d{6,8}\b/g, '[PHONE]');

  // Italian addresses
  redacted = redacted.replace(/via\s+[a-z]+\s+\d+/gi, '[ADDRESS]');
  redacted = redacted.replace(/piazza\s+[a-z]+\s+\d*/gi, '[ADDRESS]');

  return redacted;
}

/**
 * F-16: Check if text contains PII without blocking
 * Useful for logging or metrics without triggering the full filter
 */
export function containsPII(text: string): boolean {
  return matchesPatterns(text, PII_PATTERNS);
}
