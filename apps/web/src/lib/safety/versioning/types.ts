/**
 * Safety Versioning Types
 * Part of Ethical Design Hardening (F-13, F-14)
 *
 * Types for managing safety configurations with versioning
 * and changelog tracking.
 */

/**
 * Safety rule definition
 */
export interface SafetyRule {
  /** Unique rule ID */
  id: string;
  /** Rule name */
  name: string;
  /** Rule category */
  category: SafetyRuleCategory;
  /** Pattern or condition */
  pattern?: string;
  /** Whether rule is active */
  enabled: boolean;
  /** Priority (higher = checked first) */
  priority: number;
  /** Action when triggered */
  action: SafetyAction;
  /** Created timestamp */
  createdAt: Date;
  /** Last modified timestamp */
  updatedAt: Date;
}

/**
 * Safety rule categories
 */
export type SafetyRuleCategory =
  | 'content_moderation'
  | 'prompt_injection'
  | 'pii_protection'
  | 'topic_restriction'
  | 'rate_limiting'
  | 'unicode_normalization';

/**
 * Actions to take when rule triggers
 */
export type SafetyAction =
  | 'block'       // Block the content
  | 'warn'        // Show warning but allow
  | 'log'         // Log only, don't block
  | 'flag'        // Flag for manual review
  | 'normalize';  // Normalize content and continue

/**
 * Safety configuration version
 */
export interface SafetyVersion {
  /** Version number (semver) */
  version: string;
  /** Release date */
  releasedAt: Date;
  /** Changes from previous version */
  changelog: VersionChange[];
  /** All rules in this version */
  rules: SafetyRule[];
  /** Whether this is the active version */
  isActive: boolean;
  /** Creator */
  createdBy: string;
}

/**
 * Change entry for changelog
 */
export interface VersionChange {
  /** Type of change */
  type: 'added' | 'modified' | 'removed' | 'fixed' | 'security';
  /** Description */
  description: string;
  /** Related rule IDs */
  affectedRules?: string[];
  /** Impact level */
  impact: 'low' | 'medium' | 'high';
}

/**
 * Jailbreak attempt record for flagging
 */
export interface JailbreakAttempt {
  /** Unique attempt ID */
  id: string;
  /** Anonymized user ID */
  anonymizedUserId: string;
  /** Session hash */
  sessionHash: string;
  /** Timestamp */
  timestamp: Date;
  /** Pattern type detected */
  patternType: string;
  /** Confidence score */
  confidence: number;
  /** Whether this is a novel pattern */
  isNovel: boolean;
  /** Content hash (for deduplication) */
  contentHash: string;
  /** Review status */
  reviewStatus: 'pending' | 'reviewed' | 'false_positive' | 'confirmed';
  /** Normalized content sample (no PII) */
  sanitizedSample?: string;
}

/**
 * Throttling state for session
 */
export interface SessionThrottleState {
  /** Session hash */
  sessionHash: string;
  /** Number of attempts in window */
  attemptCount: number;
  /** Window start time */
  windowStart: Date;
  /** Whether currently throttled */
  isThrottled: boolean;
  /** Throttle end time (if throttled) */
  throttleEndsAt?: Date;
}

/**
 * Throttle configuration
 */
export interface ThrottleConfig {
  /** Time window in seconds */
  windowSeconds: number;
  /** Max attempts before throttle */
  maxAttempts: number;
  /** Throttle duration in seconds */
  throttleDurationSeconds: number;
  /** Escalation multiplier for repeat offenders */
  escalationMultiplier: number;
}

export const DEFAULT_THROTTLE_CONFIG: ThrottleConfig = {
  windowSeconds: 300, // 5 minutes
  maxAttempts: 3,
  throttleDurationSeconds: 600, // 10 minutes
  escalationMultiplier: 2,
};
