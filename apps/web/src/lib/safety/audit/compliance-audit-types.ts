/**
 * Compliance Audit Types
 * Part of Ethical Design Hardening (F-07 - L.132 Art.4)
 *
 * Types for regulatory audit compliance logging including EU AI Act,
 * GDPR, and COPPA compliance event tracking.
 */

/**
 * Regulatory framework indicators
 */
export interface RegulatoryContext {
  /** EU AI Act (2024) compliance tracking */
  aiAct: boolean;
  /** GDPR data processing compliance */
  gdpr: boolean;
  /** COPPA (Children's Online Privacy) compliance */
  coppa: boolean;
  /** Italian regulation L.132 Art.4 compliance */
  italianL132Art4: boolean;
}

/**
 * User context for audit compliance
 */
export interface ComplianceUserContext {
  /** Anonymized session hash (GDPR-compliant) */
  sessionHash: string;
  /** User age group for regulatory classification */
  ageGroup: "child" | "teen" | "adult" | "unknown";
  /** Geographic region for jurisdiction tracking */
  region?: "EU" | "US" | "OTHER";
}

/**
 * Mitigation actions applied
 */
export type MitigationAction =
  | "content_blocked"
  | "content_modified"
  | "user_warned"
  | "escalated_to_human"
  | "session_paused"
  | "account_restricted"
  | "none";

/**
 * Outcome of compliance event
 */
export type ComplianceOutcome =
  | "blocked" // Content/action was blocked
  | "modified" // Content was modified before delivery
  | "escalated" // Event escalated to human review
  | "allowed" // Content allowed after assessment
  | "monitored"; // Event allowed but flagged for monitoring

/**
 * Complete compliance audit entry with regulatory fields
 */
export interface ComplianceAuditEntry {
  /** Unique entry ID */
  id: string;

  /** Event timestamp (ISO 8601) */
  timestamp: string;

  /** Event type for compliance classification */
  eventType:
    | "content_filtered"
    | "crisis_detected"
    | "jailbreak_attempt"
    | "escalation_triggered"
    | "guardrail_triggered"
    | "prompt_injection_attempt"
    | "safety_config_changed"
    | "knowledge_base_updated"
    | "rate_limit_triggered"
    | "user_reported_issue"
    | "false_positive_logged";

  /** Severity classification for regulatory reporting */
  severity: "critical" | "high" | "medium" | "low";

  /** Regulatory framework applicability */
  regulatoryContext: RegulatoryContext;

  /** Anonymized user context for compliance */
  userContext: ComplianceUserContext;

  /** Event-specific details (no PII) */
  eventDetails: Record<string, unknown>;

  /** Mitigation action that was applied */
  mitigationApplied: MitigationAction;

  /** Final outcome of the event */
  outcome: ComplianceOutcome;

  /** Maestro ID if applicable */
  maestroId?: string;

  /** Content hash for audit trail verification */
  contentHash?: string;

  /** Confidence score for detection algorithms (0-1) */
  confidenceScore?: number;

  /** Audit reviewer notes */
  auditNotes?: string;

  /** Internal reference to related incident if any */
  incidentReference?: string;
}

/**
 * Compliance audit statistics for regulatory reporting
 */
export interface ComplianceAuditStats {
  /** Reporting period start date */
  periodStart: string;

  /** Reporting period end date */
  periodEnd: string;

  /** Total events in period */
  totalEvents: number;

  /** Events by type */
  eventsByType: Record<string, number>;

  /** Events by severity */
  eventsBySeverity: Record<string, number>;

  /** Events by outcome */
  eventsByOutcome: Record<string, number>;

  /** Regulatory framework impact */
  regulatoryImpact: {
    aiActEvents: number;
    gdprEvents: number;
    coppaEvents: number;
    italianL132Art4Events: number;
  };

  /** Age group distribution */
  ageGroupDistribution: Record<string, number>;

  /** Mitigation effectiveness metrics */
  mitigationMetrics: {
    blockedCount: number;
    modifiedCount: number;
    escalatedCount: number;
    allowedCount: number;
    monitoredCount: number;
  };

  /** Trend analysis */
  trendDirection: "increasing" | "decreasing" | "stable";

  /** High severity events requiring attention */
  criticalEvents: number;
}

/**
 * Export compliance audit entry for regulatory inspection
 */
export interface ComplianceAuditExport {
  /** Export metadata */
  metadata: {
    exportDate: string;
    exportedBy: string;
    periodStart: string;
    periodEnd: string;
    totalRecords: number;
  };

  /** Compliance statistics */
  statistics: ComplianceAuditStats;

  /** Audit entries (anonymized) */
  entries: ComplianceAuditEntry[];

  /** Summary of findings */
  summary: string;
}

/**
 * Default compliance configuration
 */
export const DEFAULT_COMPLIANCE_CONFIG = {
  /** Retention policy: 2 years for compliance (GDPR + Italian law) */
  retentionDays: 730,

  /** Auto-escalation threshold for critical events */
  criticalEscalationEnabled: true,

  /** Track AI Act compliance */
  trackAIAct: true,

  /** Track GDPR compliance */
  trackGDPR: true,

  /** Track COPPA compliance */
  trackCOPPA: true,

  /** Track Italian L.132 Art.4 compliance */
  trackItalianL132Art4: true,

  /** Anonymization key length (minimum 8 chars) */
  anonymizationKeyLength: 8,

  /** Geographic region for compliance (default: EU) */
  defaultRegion: "EU" as const,
};
