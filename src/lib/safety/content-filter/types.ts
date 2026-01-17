/**
 * Content Filter Types
 * Type definitions for content filtering system
 *
 * Related: #30 Safety Guardrails Issue, S-02 Task
 */

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
