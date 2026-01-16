/**
 * Safety Audit Module
 * Part of Ethical Design Hardening (F-07, F-08)
 *
 * Provides audit trail logging and knowledge base auditing.
 */

// Types
export type {
  SafetyAuditEventType,
  AuditSeverity,
  SafetyAuditEntry,
  SafetyAuditMetadata,
  KnowledgeBaseAuditEntry,
  KnowledgeAuditResult,
  KnowledgeAuditIssue,
  AuditRetentionPolicy,
} from './types';

export { DEFAULT_AUDIT_RETENTION } from './types';

// Audit Trail Service (F-07)
export {
  recordSafetyEvent,
  recordContentFiltered,
  recordGuardrailTriggered,
  recordPromptInjectionAttempt,
  recordSafetyConfigChange,
  getAuditEntries,
  getAuditStatistics,
} from './audit-trail-service';

// Knowledge Base Auditor (F-08)
export {
  auditKnowledgeBase,
  auditAllMaestri,
  formatAuditSummary,
} from './knowledge-auditor';
