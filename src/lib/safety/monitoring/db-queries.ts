import { prisma } from '@/lib/db';
import type { SafetyEventType, EventSeverity } from './types';

interface GetSafetyEventsFromDbOptions {
  startDate: Date;
  endDate: Date;
  severity?: EventSeverity;
  unresolvedOnly?: boolean;
  limit?: number;
}

export async function getSafetyEventsFromDb(options: GetSafetyEventsFromDbOptions) {
  const { startDate, endDate, severity, unresolvedOnly, limit = 100 } = options;

  const events = await prisma.safetyEvent.findMany({
    where: {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
      ...(severity && { severity }),
      ...(unresolvedOnly && { resolvedAt: null }),
    },
    orderBy: { timestamp: 'desc' },
    take: limit,
  });

  return {
    events: events.map(e => ({
      id: e.id,
      type: e.type as SafetyEventType,
      severity: e.severity as EventSeverity,
      timestamp: e.timestamp,
      resolvedAt: e.resolvedAt,
      resolvedBy: e.resolvedBy,
      resolution: e.resolution,
    })),
    total: events.length,
  };
}

export async function getSafetyStatsFromDb(startDate: Date, endDate: Date) {
  const events = await prisma.safetyEvent.findMany({
    where: {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const bySeverity: Record<EventSeverity, number> = {
    info: 0,
    warning: 0,
    alert: 0,
    critical: 0,
  };

  const byType: Record<SafetyEventType, number> = {
    input_blocked: 0,
    input_warned: 0,
    output_sanitized: 0,
    jailbreak_attempt: 0,
    crisis_detected: 0,
    age_gate_triggered: 0,
    pii_detected: 0,
    profanity_detected: 0,
    handoff_to_adult: 0,
    session_terminated: 0,
    repeated_violation: 0,
  };

  let unresolvedCount = 0;
  let criticalCount = 0;

  for (const event of events) {
    bySeverity[event.severity as EventSeverity]++;
    byType[event.type as SafetyEventType]++;
    if (!event.resolvedAt) unresolvedCount++;
    if (event.severity === 'critical') criticalCount++;
  }

  return {
    totalEvents: events.length,
    unresolvedCount,
    criticalCount,
    bySeverity,
    byType,
  };
}

export async function resolveSafetyEvent(
  eventId: string,
  resolvedBy: string,
  resolution: string
): Promise<void> {
  await prisma.safetyEvent.update({
    where: { id: eventId },
    data: {
      resolvedBy,
      resolvedAt: new Date(),
      resolution,
    },
  });
}

