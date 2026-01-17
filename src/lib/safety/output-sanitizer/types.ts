/**
 * Output Sanitizer Types
 * Type definitions for output sanitization
 *
 * Related: #30 Safety Guardrails Issue, S-03 Task
 */

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
