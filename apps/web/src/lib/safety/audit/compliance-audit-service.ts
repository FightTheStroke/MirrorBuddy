/**
 * Compliance Audit Service
 * Part of Ethical Design Hardening (F-07 - L.132 Art.4)
 *
 * Records safety events with regulatory compliance metadata for audit trails.
 * Ensures GDPR-compliant anonymization and regulatory framework tracking.
 */

import { after } from 'next/server';
import { logger } from '@/lib/logger';
import {
  ComplianceAuditEntry,
  RegulatoryContext,
  ComplianceUserContext,
  MitigationAction,
  ComplianceOutcome,
  ComplianceAuditStats,
  ComplianceAuditExport,
  DEFAULT_COMPLIANCE_CONFIG,
} from './compliance-audit-types';
import { buildRegulatoryContext, computeComplianceStatistics } from './compliance-audit-stats';

const log = logger.child({ module: 'compliance-audit' });

/**
 * In-memory compliance audit buffer.
 *
 * D-07: This buffer is an in-process cache ONLY. On serverless it resets per
 * instance/cold start, so every entry is also persisted immediately to the
 * ComplianceAuditEntry table (see persistEntryToDb), which is the durable
 * source of truth for the admin oversight dashboard.
 */
const complianceBuffer: ComplianceAuditEntry[] = [];
const BUFFER_TRIM_SIZE = 50;
const BUFFER_MAX_ENTRIES = 500;
const BUFFER_TRIM_INTERVAL_MS = 60000; // 1 minute

/**
 * Persist an entry to durable storage (server-only, lazy import).
 * Fire-and-forget with error handling — recording must never block or throw.
 */
async function persistEntryToDb(entry: ComplianceAuditEntry): Promise<void> {
  if (typeof window !== 'undefined') {
    return;
  }
  try {
    const { persistComplianceEntry } = await import('./compliance-audit-db');
    await persistComplianceEntry(entry);
  } catch (error) {
    log.error('Failed to persist compliance entry', {
      auditId: entry.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Record a compliance audit event
 */
export function recordComplianceEvent(
  eventType: ComplianceAuditEntry['eventType'],
  options: {
    severity?: ComplianceAuditEntry['severity'];
    sessionId?: string;
    ageGroup?: ComplianceUserContext['ageGroup'];
    maestroId?: string;
    eventDetails?: Record<string, unknown>;
    mitigationApplied?: MitigationAction;
    outcome?: ComplianceOutcome;
    contentHash?: string;
    confidenceScore?: number;
    auditNotes?: string;
    incidentReference?: string;
    regulatoryContext?: Partial<RegulatoryContext>;
  } = {},
): string {
  const entryId = generateComplianceAuditId();
  const severity = options.severity || inferComplianceSeverity(eventType);
  const timestamp = new Date().toISOString();

  // Build regulatory context
  const regulatoryContext = buildRegulatoryContext(eventType, options.regulatoryContext);

  // Build user context
  const userContext: ComplianceUserContext = {
    sessionHash: options.sessionId ? hashSessionId(options.sessionId) : generateSessionHash(),
    ageGroup: options.ageGroup || 'unknown',
    region: DEFAULT_COMPLIANCE_CONFIG.defaultRegion,
  };

  // Determine mitigation and outcome
  const mitigationApplied = options.mitigationApplied || determineMitigation(eventType);
  const outcome = options.outcome || determineOutcome(eventType, mitigationApplied);

  const entry: ComplianceAuditEntry = {
    id: entryId,
    timestamp,
    eventType,
    severity,
    regulatoryContext,
    userContext,
    eventDetails: options.eventDetails ? sanitizeEventDetails(options.eventDetails) : {},
    mitigationApplied,
    outcome,
    maestroId: options.maestroId,
    contentHash: options.contentHash,
    confidenceScore: options.confidenceScore,
    auditNotes: options.auditNotes,
    incidentReference: options.incidentReference,
  };

  // Add to buffer (in-process cache)
  complianceBuffer.push(entry);

  // D-07/D-61: persist to the durable store — on serverless the in-process
  // buffer resets per instance, so the database is the source of truth.
  // `after()` keeps the write alive past the response instead of a bare
  // `void` fire-and-forget, which risked the function freezing immediately
  // after responding and silently dropping the write (issue #468).
  try {
    after(() => persistEntryToDb(entry));
  } catch {
    // after() throws outside a request-scoped execution context (e.g. a
    // plain script or test run outside route handlers) — fall back to
    // fire-and-forget rather than losing the audit write entirely.
    void persistEntryToDb(entry);
  }

  // Log based on severity and regulatory impact
  logComplianceEvent(entry, regulatoryContext);

  // Critical events with regulatory impact get immediate attention
  if (severity === 'critical' && DEFAULT_COMPLIANCE_CONFIG.criticalEscalationEnabled) {
    escalateComplianceEvent(entry);
  }

  // Trim cache if it grows too large
  if (complianceBuffer.length >= BUFFER_TRIM_SIZE) {
    trimComplianceBuffer();
  }

  return entryId;
}

/**
 * Record content filtering with compliance context
 */
export function recordComplianceContentFiltered(
  filterType: string,
  options: {
    sessionId?: string;
    ageGroup?: ComplianceUserContext['ageGroup'];
    maestroId?: string;
    confidence?: number;
    reason?: string;
  } = {},
): string {
  return recordComplianceEvent('content_filtered', {
    severity: 'medium',
    ...options,
    eventDetails: {
      filterType,
      reason: options.reason,
    },
    mitigationApplied: 'content_blocked',
    outcome: 'blocked',
    confidenceScore: options.confidence,
  });
}

/**
 * Record crisis detection event
 */
export function recordComplianceCrisisDetected(
  crisisType: string,
  options: {
    sessionId?: string;
    ageGroup?: ComplianceUserContext['ageGroup'];
    maestroId?: string;
    confidence?: number;
    indicator?: string;
  } = {},
): string {
  return recordComplianceEvent('crisis_detected', {
    severity: 'critical',
    ...options,
    eventDetails: {
      crisisType,
      indicator: options.indicator,
    },
    mitigationApplied: 'escalated_to_human',
    outcome: 'escalated',
    confidenceScore: options.confidence,
    regulatoryContext: {
      aiAct: true,
      gdpr: true,
      coppa: true,
      italianL132Art4: true,
    },
  });
}

/**
 * Record jailbreak attempt
 */
export function recordComplianceJailbreakAttempt(
  options: {
    sessionId?: string;
    ageGroup?: ComplianceUserContext['ageGroup'];
    maestroId?: string;
    pattern?: string;
    confidence?: number;
  } = {},
): string {
  return recordComplianceEvent('jailbreak_attempt', {
    severity: 'high',
    ...options,
    eventDetails: {
      patternType: options.pattern || 'unknown',
    },
    mitigationApplied: 'content_blocked',
    outcome: 'blocked',
    confidenceScore: options.confidence,
    regulatoryContext: {
      aiAct: true,
      gdpr: true,
      coppa: false,
      italianL132Art4: true,
    },
  });
}

/**
 * Record guardrail trigger with compliance context
 */
export function recordComplianceGuardrailTriggered(
  ruleId: string,
  options: {
    sessionId?: string;
    ageGroup?: ComplianceUserContext['ageGroup'];
    maestroId?: string;
    confidence?: number;
    ruleCategory?: string;
  } = {},
): string {
  return recordComplianceEvent('guardrail_triggered', {
    severity: 'medium',
    ...options,
    eventDetails: {
      ruleId,
      ruleCategory: options.ruleCategory,
    },
    mitigationApplied: 'content_modified',
    outcome: 'modified',
    confidenceScore: options.confidence,
  });
}

/**
 * Get compliance audit entries for analysis
 */
export function getComplianceEntries(options: {
  eventType?: ComplianceAuditEntry['eventType'];
  severity?: ComplianceAuditEntry['severity'];
  outcome?: ComplianceOutcome;
  startDate?: string;
  endDate?: string;
  limit?: number;
  ageGroup?: ComplianceUserContext['ageGroup'];
}): ComplianceAuditEntry[] {
  let entries = [...complianceBuffer];

  if (options.eventType) {
    entries = entries.filter((e) => e.eventType === options.eventType);
  }

  if (options.severity) {
    entries = entries.filter((e) => e.severity === options.severity);
  }

  if (options.outcome) {
    entries = entries.filter((e) => e.outcome === options.outcome);
  }

  if (options.ageGroup) {
    entries = entries.filter((e) => e.userContext.ageGroup === options.ageGroup);
  }

  if (options.startDate) {
    entries = entries.filter((e) => e.timestamp >= options.startDate!);
  }

  if (options.endDate) {
    entries = entries.filter((e) => e.timestamp <= options.endDate!);
  }

  entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (options.limit) {
    entries = entries.slice(0, options.limit);
  }

  return entries;
}

/**
 * Generate compliance audit statistics (from the in-process cache).
 * For durable statistics use getComplianceStatisticsFromDb (server-only).
 */
export function getComplianceStatistics(periodDays: number = 30): ComplianceAuditStats {
  const now = new Date();
  const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000).toISOString();
  const periodEnd = now.toISOString();

  return computeComplianceStatistics(complianceBuffer, periodStart, periodEnd);
}

/**
 * Export compliance audit for regulatory inspection
 */
export function exportComplianceAudit(
  startDate: string,
  endDate: string,
  exportedBy: string,
): ComplianceAuditExport {
  const entries = getComplianceEntries({ startDate, endDate });
  const statistics = getComplianceStatistics();

  const summary = generateComplianceSummary(statistics, entries.length);

  return {
    metadata: {
      exportDate: new Date().toISOString(),
      exportedBy: anonymizeUserId(exportedBy),
      periodStart: startDate,
      periodEnd: endDate,
      totalRecords: entries.length,
    },
    statistics,
    entries,
    summary,
  };
}

// ========== Helper Functions ==========

function generateComplianceAuditId(): string {
  return `comp_audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateSessionHash(): string {
  return `sess_${Math.random().toString(36).slice(2, 12)}`;
}

function hashSessionId(sessionId: string): string {
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    const char = sessionId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `sess_${Math.abs(hash).toString(16)}`;
}

function anonymizeUserId(userId: string): string {
  return userId.slice(0, DEFAULT_COMPLIANCE_CONFIG.anonymizationKeyLength) + '***';
}

/**
 * Sanitize event details to remove PII fields (GDPR compliance)
 */
function sanitizeEventDetails(details: Record<string, unknown>): Record<string, unknown> {
  const piiFields = ['userId', 'email', 'name', 'phone', 'address', 'ip'];
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(details)) {
    if (piiFields.includes(key.toLowerCase())) {
      // Redact PII fields
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string' && key.toLowerCase().includes('id')) {
      // Anonymize any *Id fields that might contain user identifiers
      sanitized[key] = anonymizeUserId(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

function determineMitigation(eventType: ComplianceAuditEntry['eventType']): MitigationAction {
  switch (eventType) {
    case 'crisis_detected':
      return 'escalated_to_human';
    case 'jailbreak_attempt':
    case 'content_filtered':
      return 'content_blocked';
    case 'guardrail_triggered':
      return 'content_modified';
    default:
      return 'none';
  }
}

function determineOutcome(
  eventType: ComplianceAuditEntry['eventType'],
  mitigation: MitigationAction,
): ComplianceOutcome {
  switch (mitigation) {
    case 'content_blocked':
      return 'blocked';
    case 'content_modified':
      return 'modified';
    case 'escalated_to_human':
      return 'escalated';
    case 'user_warned':
    case 'session_paused':
    case 'account_restricted':
      return 'monitored';
    default:
      return 'allowed';
  }
}

function inferComplianceSeverity(
  eventType: ComplianceAuditEntry['eventType'],
): ComplianceAuditEntry['severity'] {
  switch (eventType) {
    case 'crisis_detected':
      return 'critical';
    case 'jailbreak_attempt':
    case 'prompt_injection_attempt':
    case 'escalation_triggered':
    case 'safety_config_changed':
      return 'high';
    case 'content_filtered':
    case 'guardrail_triggered':
    case 'knowledge_base_updated':
      return 'medium';
    default:
      return 'low';
  }
}

function logComplianceEvent(
  entry: ComplianceAuditEntry,
  regulatoryContext: RegulatoryContext,
): void {
  const logData = {
    auditId: entry.id,
    eventType: entry.eventType,
    severity: entry.severity,
    outcome: entry.outcome,
    ageGroup: entry.userContext.ageGroup,
    regulatory: {
      aiAct: regulatoryContext.aiAct,
      gdpr: regulatoryContext.gdpr,
      coppa: regulatoryContext.coppa,
      italian: regulatoryContext.italianL132Art4,
    },
  };

  switch (entry.severity) {
    case 'critical':
      log.error('CRITICAL compliance event', logData);
      break;
    case 'high':
      log.warn('High severity compliance event', logData);
      break;
    case 'medium':
      log.info('Compliance event recorded', logData);
      break;
    default:
      log.debug('Compliance event', logData);
  }
}

function escalateComplianceEvent(entry: ComplianceAuditEntry): void {
  log.error('ESCALATION: Critical compliance event requiring immediate attention', {
    auditId: entry.id,
    eventType: entry.eventType,
    timestamp: entry.timestamp,
    ageGroup: entry.userContext.ageGroup,
  });
  // In production, this would trigger alerts, notifications, etc.
}

function trimComplianceBuffer(): void {
  // Entries are persisted individually at record time (persistEntryToDb).
  // The buffer is only an in-process cache — trim so it cannot grow unbounded.
  if (complianceBuffer.length > BUFFER_MAX_ENTRIES) {
    complianceBuffer.splice(0, complianceBuffer.length - BUFFER_MAX_ENTRIES);
  }
}

/**
 * Clear compliance buffer (for testing only)
 */
export function clearComplianceBuffer(): void {
  complianceBuffer.length = 0;
}

function generateComplianceSummary(stats: ComplianceAuditStats, _totalEntries: number): string {
  let summary = `## Compliance Audit Summary\n`;
  summary += `**Period**: ${stats.periodStart} to ${stats.periodEnd}\n`;
  summary += `**Total Events**: ${stats.totalEvents}\n`;
  summary += `**Critical Events**: ${stats.criticalEvents}\n\n`;

  summary += `### Regulatory Framework Impact\n`;
  summary += `- EU AI Act Events: ${stats.regulatoryImpact.aiActEvents}\n`;
  summary += `- GDPR Events: ${stats.regulatoryImpact.gdprEvents}\n`;
  summary += `- COPPA Events: ${stats.regulatoryImpact.coppaEvents}\n`;
  summary += `- Italian L.132 Art.4 Events: ${stats.regulatoryImpact.italianL132Art4Events}\n\n`;

  summary += `### Mitigation Effectiveness\n`;
  summary += `- Blocked: ${stats.mitigationMetrics.blockedCount}\n`;
  summary += `- Modified: ${stats.mitigationMetrics.modifiedCount}\n`;
  summary += `- Escalated: ${stats.mitigationMetrics.escalatedCount}\n`;
  summary += `- Allowed: ${stats.mitigationMetrics.allowedCount}\n`;
  summary += `- Monitored: ${stats.mitigationMetrics.monitoredCount}\n\n`;

  summary += `### Age Group Distribution\n`;
  for (const [group, count] of Object.entries(stats.ageGroupDistribution)) {
    summary += `- ${group}: ${count}\n`;
  }

  summary += `\n**Trend**: ${stats.trendDirection}\n`;

  return summary;
}

// Set up periodic cache trim
if (typeof setInterval !== 'undefined') {
  setInterval(trimComplianceBuffer, BUFFER_TRIM_INTERVAL_MS);
}
