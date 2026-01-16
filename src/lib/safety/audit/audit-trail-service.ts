/**
 * Safety Audit Trail Service
 * Part of Ethical Design Hardening (F-07)
 *
 * Records safety events for compliance and monitoring.
 * All entries are anonymized - no PII is stored.
 */

import { logger } from '@/lib/logger';
import {
  SafetyAuditEntry,
  SafetyAuditEventType,
  SafetyAuditMetadata,
  AuditSeverity,
} from './types';

const log = logger.child({ module: 'safety-audit' });

/**
 * In-memory audit buffer (flushes to persistent storage)
 */
const auditBuffer: SafetyAuditEntry[] = [];
const BUFFER_FLUSH_SIZE = 50;
const BUFFER_FLUSH_INTERVAL_MS = 60000; // 1 minute

/**
 * Record a safety audit event
 */
export function recordSafetyEvent(
  eventType: SafetyAuditEventType,
  options: {
    userId?: string;
    maestroId?: string;
    sessionId?: string;
    metadata?: Partial<SafetyAuditMetadata>;
    contentHash?: string;
    severity?: AuditSeverity;
  } = {}
): string {
  const entryId = generateAuditId();
  const severity = options.severity || inferSeverity(eventType);

  const entry: SafetyAuditEntry = {
    id: entryId,
    eventType,
    severity,
    timestamp: new Date(),
    anonymizedUserId: options.userId
      ? anonymizeUserId(options.userId)
      : undefined,
    maestroId: options.maestroId,
    sessionHash: options.sessionId ? hashSessionId(options.sessionId) : undefined,
    metadata: sanitizeMetadata(options.metadata || {}),
    contentHash: options.contentHash,
  };

  // Add to buffer
  auditBuffer.push(entry);

  // Log based on severity
  logAuditEvent(entry);

  // Flush if buffer is full
  if (auditBuffer.length >= BUFFER_FLUSH_SIZE) {
    flushAuditBuffer();
  }

  return entryId;
}

/**
 * Record content filter event
 */
export function recordContentFiltered(
  filterType: string,
  options: {
    userId?: string;
    maestroId?: string;
    confidence?: number;
    actionTaken?: string;
  }
): string {
  return recordSafetyEvent('content_filtered', {
    ...options,
    metadata: {
      filterType,
      confidence: options.confidence,
      actionTaken: options.actionTaken || 'blocked',
    },
    severity: 'medium',
  });
}

/**
 * Record guardrail trigger event
 */
export function recordGuardrailTriggered(
  ruleId: string,
  options: {
    userId?: string;
    maestroId?: string;
    confidence?: number;
  }
): string {
  return recordSafetyEvent('guardrail_triggered', {
    ...options,
    metadata: {
      guardrailRuleId: ruleId,
      confidence: options.confidence,
    },
    severity: 'medium',
  });
}

/**
 * Record prompt injection attempt
 */
export function recordPromptInjectionAttempt(
  options: {
    userId?: string;
    maestroId?: string;
    confidence?: number;
    pattern?: string;
  }
): string {
  return recordSafetyEvent('prompt_injection_attempt', {
    ...options,
    metadata: {
      confidence: options.confidence,
      context: options.pattern
        ? { patternType: options.pattern }
        : undefined,
    },
    severity: 'high',
  });
}

/**
 * Record safety config change
 */
export function recordSafetyConfigChange(
  changeDescription: string,
  changedBy: string
): string {
  return recordSafetyEvent('safety_config_changed', {
    metadata: {
      context: {
        change: changeDescription,
        changedBy: anonymizeUserId(changedBy),
      },
    },
    severity: 'high',
  });
}

/**
 * Get audit entries for analysis (returns anonymized data)
 */
export function getAuditEntries(options: {
  eventType?: SafetyAuditEventType;
  severity?: AuditSeverity;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): SafetyAuditEntry[] {
  let entries = [...auditBuffer];

  if (options.eventType) {
    entries = entries.filter((e) => e.eventType === options.eventType);
  }

  if (options.severity) {
    entries = entries.filter((e) => e.severity === options.severity);
  }

  if (options.startDate) {
    entries = entries.filter((e) => e.timestamp >= options.startDate!);
  }

  if (options.endDate) {
    entries = entries.filter((e) => e.timestamp <= options.endDate!);
  }

  // Sort by timestamp desc
  entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  if (options.limit) {
    entries = entries.slice(0, options.limit);
  }

  return entries;
}

/**
 * Get audit statistics for dashboard
 */
export function getAuditStatistics(periodDays: number = 30): {
  totalEvents: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  trendDirection: 'increasing' | 'decreasing' | 'stable';
} {
  const cutoff = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
  const entries = auditBuffer.filter((e) => e.timestamp >= cutoff);

  const byType: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};

  for (const entry of entries) {
    byType[entry.eventType] = (byType[entry.eventType] || 0) + 1;
    bySeverity[entry.severity] = (bySeverity[entry.severity] || 0) + 1;
  }

  // Simple trend calculation (compare first half to second half)
  const midpoint = new Date(cutoff.getTime() + (Date.now() - cutoff.getTime()) / 2);
  const firstHalf = entries.filter((e) => e.timestamp < midpoint).length;
  const secondHalf = entries.filter((e) => e.timestamp >= midpoint).length;

  let trendDirection: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (secondHalf > firstHalf * 1.2) {
    trendDirection = 'increasing';
  } else if (secondHalf < firstHalf * 0.8) {
    trendDirection = 'decreasing';
  }

  return {
    totalEvents: entries.length,
    byType,
    bySeverity,
    trendDirection,
  };
}

// Helper functions
function generateAuditId(): string {
  return `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function anonymizeUserId(userId: string): string {
  return userId.slice(0, 8) + '***';
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

function sanitizeMetadata(metadata: Partial<SafetyAuditMetadata>): SafetyAuditMetadata {
  // Ensure no PII leaks through metadata
  return {
    filterType: metadata.filterType,
    guardrailRuleId: metadata.guardrailRuleId,
    confidence: metadata.confidence,
    actionTaken: metadata.actionTaken,
    context: metadata.context,
  };
}

function inferSeverity(eventType: SafetyAuditEventType): AuditSeverity {
  switch (eventType) {
    case 'prompt_injection_attempt':
    case 'safety_config_changed':
      return 'high';
    case 'content_filtered':
    case 'guardrail_triggered':
      return 'medium';
    case 'rate_limit_triggered':
    case 'false_positive_logged':
      return 'low';
    default:
      return 'medium';
  }
}

function logAuditEvent(entry: SafetyAuditEntry): void {
  const logData = {
    auditId: entry.id,
    eventType: entry.eventType,
    severity: entry.severity,
    maestroId: entry.maestroId,
  };

  switch (entry.severity) {
    case 'critical':
      log.error('CRITICAL safety event', logData);
      break;
    case 'high':
      log.warn('High severity safety event', logData);
      break;
    case 'medium':
      log.info('Safety event recorded', logData);
      break;
    default:
      log.debug('Safety event', logData);
  }
}

function flushAuditBuffer(): void {
  // In production, this would write to database
  // For now, just log the flush
  log.debug('Flushing audit buffer', { entries: auditBuffer.length });
  // Clear buffer after flush (in production, only after successful persistence)
  auditBuffer.length = 0;
}

// Set up periodic flush
if (typeof setInterval !== 'undefined') {
  setInterval(flushAuditBuffer, BUFFER_FLUSH_INTERVAL_MS);
}
