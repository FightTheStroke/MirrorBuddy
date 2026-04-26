import type { SafetyEvent, SafetyEventType, EventSeverity, SafetyMetrics } from './types';
import { eventBuffer } from './logging';

export function getSessionEvents(sessionId: string): SafetyEvent[] {
  return eventBuffer.filter(e => e.sessionId === sessionId);
}

export function getEventsByType(
  type: SafetyEventType,
  limit = 100
): SafetyEvent[] {
  return eventBuffer
    .filter(e => e.type === type)
    .slice(-limit);
}

export function getEventsBySeverity(
  severity: EventSeverity,
  limit = 100
): SafetyEvent[] {
  return eventBuffer
    .filter(e => e.severity === severity)
    .slice(-limit);
}

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
    byType[event.type] = (byType[event.type] || 0) + 1;
    bySeverity[event.severity] = (bySeverity[event.severity] || 0) + 1;

    if (event.userId) {
      uniqueUsers.add(event.userId);
    }

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

