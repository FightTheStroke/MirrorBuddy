/**
 * MirrorBuddy Output Sanitizer - Core Logic
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

import {
  SYSTEM_PROMPT_LEAK_PATTERNS,
  POST_GENERATION_BLOCKLIST,
  HARMFUL_URL_PATTERNS,
  OUTPUT_PII_PATTERNS,
  JAILBREAK_SUCCESS_PATTERNS,
} from './output-sanitizer-patterns';

/**
 * Result of output sanitization
 */
export interface SanitizeResult {
  /** Sanitized text (safe to display) */
  text: string;
  /** Whether any modifications were made */
  modified: boolean;
  /** Number of issues found and sanitized */
  issuesFound: number;
  /** Categories of issues found */
  categories: SanitizeCategory[];
}

export type SanitizeCategory =
  | 'system_prompt_leak'
  | 'inappropriate_content'
  | 'harmful_url'
  | 'pii_disclosure'
  | 'jailbreak_response';

/**
 * Replacement for leaked/blocked content
 */
const REDACTION_MARKER = '[contenuto rimosso per sicurezza]';
const URL_REDACTION = '[link rimosso per sicurezza]';

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
 * Sanitize a stream of text chunks (for streaming responses)
 * Accumulates text and sanitizes when a complete sentence is detected
 */
export class StreamingSanitizer {
  private buffer: string = '';
  private totalIssues: number = 0;
  private categories: Set<SanitizeCategory> = new Set();

  /**
   * Process a chunk of streamed text
   * @returns Sanitized text safe to display (may be partial)
   */
  processChunk(chunk: string): string {
    this.buffer += chunk;

    // Check for sentence boundaries to flush
    const sentenceEnd = /[.!?]\s*$/;
    if (sentenceEnd.test(this.buffer)) {
      const result = sanitizeOutput(this.buffer);
      this.totalIssues += result.issuesFound;
      result.categories.forEach((c) => this.categories.add(c));
      this.buffer = '';
      return result.text;
    }

    // For incomplete sentences, do a quick safety check
    // Only return if no immediate red flags
    if (needsSanitization(this.buffer)) {
      // Hold the buffer until we have more context
      return '';
    }

    // Return the current buffer and clear it
    const output = this.buffer;
    this.buffer = '';
    return output;
  }

  /**
   * Flush any remaining buffer at end of stream
   */
  flush(): string {
    if (!this.buffer) return '';
    const result = sanitizeOutput(this.buffer);
    this.totalIssues += result.issuesFound;
    result.categories.forEach((c) => this.categories.add(c));
    this.buffer = '';
    return result.text;
  }

  /**
   * Get summary of all issues found during streaming
   */
  getSummary(): { totalIssues: number; categories: SanitizeCategory[] } {
    return {
      totalIssues: this.totalIssues,
      categories: Array.from(this.categories),
    };
  }

  /**
   * Reset the sanitizer for a new stream
   */
  reset(): void {
    this.buffer = '';
    this.totalIssues = 0;
    this.categories.clear();
  }
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
