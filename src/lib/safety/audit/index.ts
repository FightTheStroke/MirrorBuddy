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

// ========== Server-Only Functions ==========
// Import from '@/lib/safety/audit/server' for:
// - recordSafetyEvent, recordContentFiltered, etc.
// - recordComplianceEvent, getComplianceEntries, etc.
// - auditKnowledgeBase, auditAllMaestri, etc.
