/**
 * Output Sanitizer Core Functions
 * Main sanitization logic for AI output
 *
 * Related: #30 Safety Guardrails Issue, S-03 Task
 */

import type { SanitizeResult, SanitizeCategory } from './types';
import {
  SYSTEM_PROMPT_LEAK_PATTERNS,
  POST_GENERATION_BLOCKLIST,
  HARMFUL_URL_PATTERNS,
  OUTPUT_PII_PATTERNS,
  JAILBREAK_SUCCESS_PATTERNS,
  REDACTION_MARKER,
  URL_REDACTION,
} from './patterns';

/**
 * Sanitizes AI output before displaying to user.
 * Call this on every AI response BEFORE showing to the student.
 *
 * @param text - The AI's generated output
 * @returns SanitizeResult with cleaned text and modification info
 *
 * @example
 * const aiResponse = await chatCompletion(messages, systemPrompt);
 * const sanitized = sanitizeOutput(aiResponse.content);
 * // Display sanitized.text to user
 */
export function sanitizeOutput(text: string): SanitizeResult {
  let sanitized = text;
  const categories: SanitizeCategory[] = [];
  let issuesFound = 0;

  // 1. Check for system prompt leaks
  for (const pattern of SYSTEM_PROMPT_LEAK_PATTERNS) {
    if (pattern.test(sanitized)) {
      sanitized = sanitized.replace(pattern, '');
      if (!categories.includes('system_prompt_leak')) {
        categories.push('system_prompt_leak');
      }
      issuesFound++;
    }
    // Reset regex state for global patterns
    pattern.lastIndex = 0;
  }

  // 2. Check for blocked content that slipped through
  for (const pattern of POST_GENERATION_BLOCKLIST) {
    if (pattern.test(sanitized)) {
      sanitized = sanitized.replace(pattern, REDACTION_MARKER);
      if (!categories.includes('inappropriate_content')) {
        categories.push('inappropriate_content');
      }
      issuesFound++;
    }
    pattern.lastIndex = 0;
  }

  // 3. Check for harmful URLs
  for (const pattern of HARMFUL_URL_PATTERNS) {
    if (pattern.test(sanitized)) {
      sanitized = sanitized.replace(pattern, URL_REDACTION);
      if (!categories.includes('harmful_url')) {
        categories.push('harmful_url');
      }
      issuesFound++;
    }
    pattern.lastIndex = 0;
  }

  // 4. Check for PII in output
  for (const pattern of OUTPUT_PII_PATTERNS) {
    if (pattern.test(sanitized)) {
      sanitized = sanitized.replace(pattern, REDACTION_MARKER);
      if (!categories.includes('pii_disclosure')) {
        categories.push('pii_disclosure');
      }
      issuesFound++;
    }
    pattern.lastIndex = 0;
  }

  // 5. Check for jailbreak success indicators
  for (const pattern of JAILBREAK_SUCCESS_PATTERNS) {
    if (pattern.test(sanitized)) {
      // For jailbreak success, replace entire response
      if (!categories.includes('jailbreak_response')) {
        categories.push('jailbreak_response');
        sanitized = "Sono qui per aiutarti a imparare! Su quale materia vuoi lavorare oggi?";
        issuesFound++;
      }
    }
    pattern.lastIndex = 0;
  }

  // 6. Clean up excessive whitespace from redactions
  sanitized = sanitized.replace(/\s{3,}/g, ' ').trim();

  return {
    text: sanitized,
    modified: issuesFound > 0,
    issuesFound,
    categories,
  };
}

/**
 * Quick check if output needs sanitization
 */
export function needsSanitization(text: string): boolean {
  const allPatterns = [
    ...SYSTEM_PROMPT_LEAK_PATTERNS,
    ...POST_GENERATION_BLOCKLIST,
    ...HARMFUL_URL_PATTERNS,
    ...OUTPUT_PII_PATTERNS,
    ...JAILBREAK_SUCCESS_PATTERNS,
  ];

  for (const pattern of allPatterns) {
    if (pattern.test(text)) {
      pattern.lastIndex = 0;
      return true;
    }
    pattern.lastIndex = 0;
  }

  return false;
}

/**
 * Validates that output doesn't contain any blocked patterns.
 * Use in tests to verify AI responses are clean.
 */
export function validateOutput(text: string): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  const patternGroups = [
    { name: 'System prompt leak', patterns: SYSTEM_PROMPT_LEAK_PATTERNS },
    { name: 'Blocked content', patterns: POST_GENERATION_BLOCKLIST },
    { name: 'Harmful URL', patterns: HARMFUL_URL_PATTERNS },
    { name: 'PII disclosure', patterns: OUTPUT_PII_PATTERNS },
    { name: 'Jailbreak indicator', patterns: JAILBREAK_SUCCESS_PATTERNS },
  ];

  for (const group of patternGroups) {
    for (const pattern of group.patterns) {
      if (pattern.test(text)) {
        issues.push(`${group.name}: matched pattern ${pattern.source}`);
      }
      pattern.lastIndex = 0;
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
