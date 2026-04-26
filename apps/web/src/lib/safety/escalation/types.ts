/**
 * Human Escalation Pathway Types
 * F-06 - AI Act Article 14: Human escalation for crisis/safety events
 *
 * Types for escalation events, triggers, and notifications.
 * All escalations include anonymized context (no PII).
 */

/**
 * Escalation trigger types
 */
export type EscalationTrigger =
  | "crisis_detected" // Self-harm, suicide ideation
  | "repeated_jailbreak" // 3+ jailbreak attempts in session
  | "severe_content_filter" // Critical severity content filter hit
  | "age_gate_bypass" // Potential age verification bypass
  | "session_termination"; // Session forcibly terminated

/**
 * Escalation severity level
 */
export type EscalationSeverity = "high" | "critical";

/**
 * Escalation event for admin notification and audit
 */
export interface EscalationEvent {
  /** Unique event ID */
  id: string;

  /** Trigger type */
  trigger: EscalationTrigger;

  /** Severity level */
  severity: EscalationSeverity;

  /** When escalation occurred */
  timestamp: Date;

  /** Anonymized user identifier (first 8 chars of hash) */
  anonymizedUserId?: string;

  /** Session identifier (hashed) */
  sessionHash?: string;

  /** Maestro involved (if applicable) */
  maestroId?: string;

  /** Event-specific metadata (no PII) */
  metadata: EscalationMetadata;

  /** Whether admin has been notified */
  adminNotified: boolean;

  /** When admin was notified */
  adminNotifiedAt?: Date;

  /** Admin response notes */
  adminNotes?: string;

  /** Resolution status */
  resolved: boolean;

  /** When marked resolved */
  resolvedAt?: Date;
}

/**
 * Metadata for escalation event
 * Contains only anonymized, non-PII context
 */
export interface EscalationMetadata {
  /** Trigger-specific reason */
  reason?: string;

  /** Context type (e.g., "user_input", "ai_response") */
  contextType?: "user_input" | "ai_response" | "system";

  /** Content snippet (if applicable, already sanitized/truncated) */
  contentSnippet?: string;

  /** Number of jailbreak attempts (if trigger is repeated_jailbreak) */
  jailbreakAttemptCount?: number;

  /** User age bracket (if applicable: 'under_13', '13_17', '18_plus') */
  ageBracket?: string;

  /** Confidence score (0-1) if applicable */
  confidence?: number;

  /** Additional context as safe key-value pairs */
  context?: Record<string, string | number | boolean>;
}

/**
 * Admin notification email details
 */
export interface AdminNotification {
  /** Admin email address */
  to: string;

  /** Subject line */
  subject: string;

  /** Email body (HTML) */
  html: string;

  /** Email body (plain text) */
  text?: string;

  /** Reference event ID for tracking */
  eventId: string;

  /** Escalation severity (for email categorization) */
  severity: EscalationSeverity;

  /** Timestamp notification was sent */
  sentAt: Date;
}

/**
 * Configuration for escalation thresholds
 */
export interface EscalationConfig {
  /** Number of jailbreak attempts before escalation */
  jailbreakThreshold: number;

  /** Email address for admin notifications */
  adminEmail?: string;

  /** Whether to automatically notify admin */
  autoNotifyAdmin: boolean;

  /** Whether to store escalations in database */
  storeInDatabase: boolean;

  /** Retention days for escalation records */
  retentionDays: number;
}

/**
 * Default escalation configuration
 */
export const DEFAULT_ESCALATION_CONFIG: EscalationConfig = {
  jailbreakThreshold: 3,
  autoNotifyAdmin: true,
  storeInDatabase: true,
  retentionDays: 730, // 2 years for critical events
};
