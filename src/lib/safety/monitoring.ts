/**
 * ConvergioEdu Safety Monitoring Module
 * Logs and tracks safety-related events for analysis and compliance
 *
 * This module provides:
 * - Safety event logging
 * - Pattern detection for repeated violations
 * - Aggregated metrics for reporting
 * - Audit trail for compliance
 *
 * Related: #30 Safety Guardrails Issue
 */

import { logger } from '@/lib/logger';

/**
 * Types of safety events to monitor
 */
export type SafetyEventType =
  | 'input_blocked'          // User input was blocked
  | 'input_warned'           // User input triggered warning
  | 'output_sanitized'       // AI output was sanitized
  | 'jailbreak_attempt'      // Jailbreak/injection detected
  | 'crisis_detected'        // Crisis keywords detected
  | 'age_gate_triggered'     // Content blocked for age
  | 'pii_detected'           // Personal info in input
  | 'profanity_detected'     // Profanity in input
  | 'handoff_to_adult'       // Buddy suggested adult help
  | 'session_terminated'     // Session ended for safety
  | 'repeated_violation';    // Pattern of violations detected

/**
 * Severity levels for safety events
 */
export type EventSeverity = 'info' | 'warning' | 'alert' | 'critical';

/**
 * Safety event record
 */
export interface SafetyEvent {
  /** Unique event ID */
  id: string;
  /** Event type */
  type: SafetyEventType;
  /** Event severity */
  severity: EventSeverity;
  /** When the event occurred */
  timestamp: Date;
  /** Session ID (if available) */
  sessionId?: string;
  /** User/student ID (anonymized) */
  userId?: string;
  /** Character involved (maestro, buddy, coach) */
  characterId?: string;
  /** Category of content that triggered event */
  category?: string;
  /** Additional context */
  context?: Record<string, unknown>;
  /** Whether the event was handled automatically */
  autoHandled: boolean;
  /** Response that was shown to user (if any) */
  response?: string;
}

/**
 * Aggregated metrics for a time period
 */
export interface SafetyMetrics {
  /** Time period start */
  periodStart: Date;
  /** Time period end */
  periodEnd: Date;
  /** Total events */
  totalEvents: number;
  /** Events by type */
  byType: Record<SafetyEventType, number>;
  /** Events by severity */
  bySeverity: Record<EventSeverity, number>;
  /** Unique users with violations */
  uniqueUsers: number;
  /** Sessions terminated for safety */
  terminatedSessions: number;
  /** Crisis detections (needs attention) */
  crisisCount: number;
}

/**
 * In-memory event buffer for session tracking
 * In production, this would be replaced with a proper database
 */
const eventBuffer: SafetyEvent[] = [];
const MAX_BUFFER_SIZE = 1000;

/**
 * User violation tracking for pattern detection
 */
const userViolationCounts: Map<string, { count: number; lastEvent: Date }> = new Map();
const VIOLATION_THRESHOLD = 3;
const VIOLATION_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Generate unique event ID
 */
function generateEventId(): string {
  return `se_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
}

/**
 * Log a safety event
 * Main function to call when a safety-related event occurs
 *
 * @param type - Type of safety event
 * @param severity - Severity level
 * @param options - Additional event options
 * @returns The created SafetyEvent
 *
 * @example
 * logSafetyEvent('input_blocked', 'warning', {
 *   sessionId: session.id,
 *   category: 'profanity',
 *   context: { pattern: 'matched_word' }
 * });
 */
export function logSafetyEvent(
  type: SafetyEventType,
  severity: EventSeverity,
  options: Partial<Omit<SafetyEvent, 'id' | 'type' | 'severity' | 'timestamp'>> = {}
): SafetyEvent {
  const event: SafetyEvent = {
    id: generateEventId(),
    type,
    severity,
    timestamp: new Date(),
    autoHandled: options.autoHandled ?? true,
    ...options,
  };

  // Add to buffer
  eventBuffer.push(event);
  if (eventBuffer.length > MAX_BUFFER_SIZE) {
    eventBuffer.shift(); // Remove oldest
  }

  // Log using application logger
  const logMethod = severity === 'critical' || severity === 'alert'
    ? 'error'
    : severity === 'warning'
      ? 'warn'
      : 'info';

  logger[logMethod](`Safety event: ${type}`, {
    eventId: event.id,
    severity,
    category: event.category,
    sessionId: event.sessionId,
    userId: event.userId ? anonymizeId(event.userId) : undefined,
  });

  // Check for violation patterns
  if (event.userId && isViolationType(type)) {
    checkViolationPattern(event.userId, event);
  }

  return event;
}

/**
 * Check if event type is a violation
 */
function isViolationType(type: SafetyEventType): boolean {
  return [
    'input_blocked',
    'jailbreak_attempt',
    'profanity_detected',
  ].includes(type);
}

/**
 * Anonymize user ID for logging
 */
function anonymizeId(id: string): string {
  if (id.length <= 8) return '***';
  return `${id.slice(0, 4)}...${id.slice(-4)}`;
}

/**
 * Check for repeated violation patterns
 */
function checkViolationPattern(userId: string, event: SafetyEvent): void {
  const now = Date.now();
  const existing = userViolationCounts.get(userId);

  if (existing) {
    const timeSinceLastEvent = now - existing.lastEvent.getTime();

    if (timeSinceLastEvent < VIOLATION_WINDOW_MS) {
      existing.count++;
      existing.lastEvent = new Date();

      if (existing.count >= VIOLATION_THRESHOLD) {
        // Log repeated violation alert
        logSafetyEvent('repeated_violation', 'alert', {
          userId: event.userId,
          sessionId: event.sessionId,
          context: {
            violationCount: existing.count,
            windowMinutes: VIOLATION_WINDOW_MS / 60000,
            lastEventType: event.type,
          },
          autoHandled: false, // Needs human review
        });

        // Reset counter after alert
        existing.count = 0;
      }
    } else {
      // Window expired, reset
      existing.count = 1;
      existing.lastEvent = new Date();
    }
  } else {
    userViolationCounts.set(userId, {
      count: 1,
      lastEvent: new Date(),
    });
  }
}

/**
 * Get recent events for a session
 */
export function getSessionEvents(sessionId: string): SafetyEvent[] {
  return eventBuffer.filter(e => e.sessionId === sessionId);
}

/**
 * Get recent events by type
 */
export function getEventsByType(
  type: SafetyEventType,
  limit = 100
): SafetyEvent[] {
  return eventBuffer
    .filter(e => e.type === type)
    .slice(-limit);
}

/**
 * Get events by severity
 */
export function getEventsBySeverity(
  severity: EventSeverity,
  limit = 100
): SafetyEvent[] {
  return eventBuffer
    .filter(e => e.severity === severity)
    .slice(-limit);
}

/**
 * Get aggregated metrics for a time period
 */
export function getMetrics(
  periodStart: Date,
  periodEnd: Date
): SafetyMetrics {
  const events = eventBuffer.filter(
    e => e.timestamp >= periodStart && e.timestamp <= periodEnd
  );

  const byType = {} as Record<SafetyEventType, number>;
  const bySeverity = {} as Record<EventSeverity, number>;
  const uniqueUsers = new Set<string>();
  let terminatedSessions = 0;
  let crisisCount = 0;

  for (const event of events) {
    // Count by type
    byType[event.type] = (byType[event.type] || 0) + 1;

    // Count by severity
    bySeverity[event.severity] = (bySeverity[event.severity] || 0) + 1;

    // Track unique users
    if (event.userId) {
      uniqueUsers.add(event.userId);
    }

    // Special counters
    if (event.type === 'session_terminated') {
      terminatedSessions++;
    }
    if (event.type === 'crisis_detected') {
      crisisCount++;
    }
  }

  return {
    periodStart,
    periodEnd,
    totalEvents: events.length,
    byType,
    bySeverity,
    uniqueUsers: uniqueUsers.size,
    terminatedSessions,
    crisisCount,
  };
}

/**
 * Clear event buffer (for testing or manual maintenance)
 */
export function clearEventBuffer(): void {
  eventBuffer.length = 0;
  userViolationCounts.clear();
}

/**
 * Check if session should be terminated due to safety concerns
 * Based on accumulated violations in session
 */
export function shouldTerminateSession(sessionId: string): boolean {
  const sessionEvents = getSessionEvents(sessionId);

  // Terminate if any critical event
  if (sessionEvents.some(e => e.severity === 'critical')) {
    return true;
  }

  // Terminate if too many alerts
  const alertCount = sessionEvents.filter(e => e.severity === 'alert').length;
  if (alertCount >= 3) {
    return true;
  }

  // Terminate if multiple jailbreak attempts
  const jailbreakCount = sessionEvents.filter(
    e => e.type === 'jailbreak_attempt'
  ).length;
  if (jailbreakCount >= 2) {
    return true;
  }

  return false;
}

/**
 * Log helper: Input blocked event
 */
export function logInputBlocked(
  category: string,
  options: Partial<SafetyEvent> = {}
): SafetyEvent {
  return logSafetyEvent('input_blocked', 'warning', {
    category,
    ...options,
  });
}

/**
 * Log helper: Jailbreak attempt
 */
export function logJailbreakAttempt(
  options: Partial<SafetyEvent> = {}
): SafetyEvent {
  return logSafetyEvent('jailbreak_attempt', 'alert', {
    category: 'jailbreak',
    ...options,
  });
}

/**
 * Log helper: Crisis detection
 */
export function logCrisisDetected(
  options: Partial<SafetyEvent> = {}
): SafetyEvent {
  return logSafetyEvent('crisis_detected', 'critical', {
    category: 'crisis',
    autoHandled: false, // Always needs human follow-up
    ...options,
  });
}

/**
 * Log helper: Output sanitized
 */
export function logOutputSanitized(
  issuesFound: string[],
  options: Partial<SafetyEvent> = {}
): SafetyEvent {
  return logSafetyEvent('output_sanitized', 'info', {
    context: { issuesFound },
    ...options,
  });
}

/**
 * Log helper: Handoff to adult
 */
export function logHandoffToAdult(
  reason: string,
  options: Partial<SafetyEvent> = {}
): SafetyEvent {
  return logSafetyEvent('handoff_to_adult', 'info', {
    context: { reason },
    ...options,
  });
}

/**
 * Log helper: Age gate triggered
 */
export function logAgeGateTriggered(
  topic: string,
  age: number,
  options: Partial<SafetyEvent> = {}
): SafetyEvent {
  return logSafetyEvent('age_gate_triggered', 'warning', {
    category: 'age_restriction',
    context: { topic, age },
    ...options,
  });
}

/**
 * Export current buffer for analysis (admin only)
 * In production, this would require proper authentication
 */
export function exportEvents(): SafetyEvent[] {
  return [...eventBuffer];
}

/**
 * Get summary statistics
 */
export function getSummary(): {
  bufferSize: number;
  oldestEvent: Date | null;
  newestEvent: Date | null;
  criticalCount: number;
  alertCount: number;
} {
  return {
    bufferSize: eventBuffer.length,
    oldestEvent: eventBuffer[0]?.timestamp ?? null,
    newestEvent: eventBuffer[eventBuffer.length - 1]?.timestamp ?? null,
    criticalCount: eventBuffer.filter(e => e.severity === 'critical').length,
    alertCount: eventBuffer.filter(e => e.severity === 'alert').length,
  };
}
