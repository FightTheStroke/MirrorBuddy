/**
 * Safety Audit Module
 * Part of Ethical Design Hardening (F-07, F-08)
 *
 * Provides audit trail logging, compliance audit logging, and knowledge base auditing.
 */

// ========== Basic Safety Audit Types ==========
export type {
  SafetyAuditEventType,
  AuditSeverity,
  SafetyAuditEntry,
  SafetyAuditMetadata,
  ComplianceIndicators,
  KnowledgeBaseAuditEntry,
  KnowledgeAuditResult,
  KnowledgeAuditIssue,
  AuditRetentionPolicy,
} from "./types";

export { DEFAULT_AUDIT_RETENTION } from "./types";

// ========== Compliance Audit Types (F-07 - L.132 Art.4) ==========
export type {
  RegulatoryContext,
  ComplianceUserContext,
  MitigationAction,
  ComplianceOutcome,
  ComplianceAuditEntry,
  ComplianceAuditStats,
  ComplianceAuditExport,
} from "./compliance-audit-types";

export { DEFAULT_COMPLIANCE_CONFIG } from "./compliance-audit-types";

// ========== Audit Trail Service (F-07) ==========
export {
  recordSafetyEvent,
  recordContentFiltered,
  recordGuardrailTriggered,
  recordPromptInjectionAttempt,
  recordSafetyConfigChange,
  getAuditEntries,
  getAuditStatistics,
} from "./audit-trail-service";

// ========== Compliance Audit Service (F-07 - L.132 Art.4) ==========
export {
  recordComplianceEvent,
  recordComplianceContentFiltered,
  recordComplianceCrisisDetected,
  recordComplianceJailbreakAttempt,
  recordComplianceGuardrailTriggered,
  getComplianceEntries,
  getComplianceStatistics,
  exportComplianceAudit,
} from "./compliance-audit-service";

// ========== Knowledge Base Auditor (F-08) ==========
export {
  auditKnowledgeBase,
  auditAllMaestri,
  formatAuditSummary,
} from "./knowledge-auditor";
