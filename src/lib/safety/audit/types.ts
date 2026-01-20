/**
 * Safety Audit Types
 * Part of Ethical Design Hardening (F-07, F-08)
 *
 * Types for safety deployment audit and knowledge base auditing.
 * Compliance audit types in compliance-audit-types.ts
 */

/**
 * Types of safety-related events to audit
 */
export type SafetyAuditEventType =
  | "content_filtered" // Content was filtered
  | "guardrail_triggered" // Guardrail blocked content
  | "safety_config_changed" // Safety config modified
  | "knowledge_base_updated" // Maestro knowledge updated
  | "prompt_injection_attempt" // Prompt injection detected
  | "rate_limit_triggered" // Rate limit hit
  | "user_reported_issue" // User reported safety issue
  | "false_positive_logged"; // User indicated false positive

/**
 * Regulatory compliance indicators
 */
export interface ComplianceIndicators {
  aiAct?: boolean; // EU AI Act (2024) relevant
  gdpr?: boolean; // GDPR data processing
  coppa?: boolean; // COPPA compliance
  italianL132Art4?: boolean; // Italian education regulation
}

/**
 * Audit severity for logging priority
 */
export type AuditSeverity = "low" | "medium" | "high" | "critical";

/**
 * Safety audit log entry with compliance support
 */
export interface SafetyAuditEntry {
  /** Unique entry ID */
  id: string;
  /** Event type */
  eventType: SafetyAuditEventType;
  /** Severity level */
  severity: AuditSeverity;
  /** Timestamp */
  timestamp: Date;
  /** Anonymized user identifier (first 8 chars) */
  anonymizedUserId?: string;
  /** Maestro ID (if applicable) */
  maestroId?: string;
  /** Session context hash */
  sessionHash?: string;
  /** Event-specific metadata (no PII) */
  metadata: SafetyAuditMetadata;
  /** Hash of original content (for verification) */
  contentHash?: string;
  /** Regulatory compliance indicators for audit trail */
  complianceIndicators?: ComplianceIndicators;
  /** Age group for regulatory classification */
  ageGroup?: "child" | "teen" | "adult" | "unknown";
  /** Outcome of the event (blocked, modified, escalated, allowed) */
  outcome?: "blocked" | "modified" | "escalated" | "allowed" | "monitored";
}

/**
 * Metadata structure for audit entries
 */
export interface SafetyAuditMetadata {
  /** Filter type (if content_filtered) */
  filterType?: string;
  /** Guardrail rule ID (if guardrail_triggered) */
  guardrailRuleId?: string;
  /** Confidence score (0-1) */
  confidence?: number;
  /** Response action taken */
  actionTaken?: string;
  /** Additional context (no PII) */
  context?: Record<string, string | number | boolean>;
}

/**
 * Knowledge base audit entry
 */
export interface KnowledgeBaseAuditEntry {
  /** Unique entry ID */
  id: string;
  /** Maestro ID */
  maestroId: string;
  /** Type of audit */
  auditType: "safety_scan" | "content_review" | "update_verification";
  /** Timestamp */
  timestamp: Date;
  /** Audit results */
  results: KnowledgeAuditResult;
  /** Auditor (system or human) */
  auditor: "system" | "human";
  /** Status */
  status: "passed" | "failed" | "needs_review";
}

/**
 * Results of knowledge base audit
 */
export interface KnowledgeAuditResult {
  /** Total items scanned */
  totalItems: number;
  /** Items passing safety check */
  passedItems: number;
  /** Items flagged for review */
  flaggedItems: number;
  /** Specific issues found */
  issues: KnowledgeAuditIssue[];
  /** Safety score (0-100) */
  safetyScore: number;
}

/**
 * Individual issue found in knowledge base
 */
export interface KnowledgeAuditIssue {
  /** Issue type */
  type:
    | "inappropriate_content"
    | "factual_error"
    | "outdated_info"
    | "bias_detected"
    | "missing_citation"
    | "harmful_pattern";
  /** Severity */
  severity: AuditSeverity;
  /** Location in knowledge base */
  location: string;
  /** Description */
  description: string;
  /** Suggested fix */
  suggestedFix?: string;
}

/**
 * Audit retention policy
 */
export interface AuditRetentionPolicy {
  /** Days to retain low severity */
  lowSeverityDays: number;
  /** Days to retain medium severity */
  mediumSeverityDays: number;
  /** Days to retain high severity */
  highSeverityDays: number;
  /** Days to retain critical severity */
  criticalSeverityDays: number;
}

export const DEFAULT_AUDIT_RETENTION: AuditRetentionPolicy = {
  lowSeverityDays: 30,
  mediumSeverityDays: 90,
  highSeverityDays: 365,
  criticalSeverityDays: 730, // 2 years
};
