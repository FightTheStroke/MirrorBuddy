/**
 * Admin Safety Dashboard API
 * F-15 - Provides real-time AI system health and safety event data
 * Compliance: AI Act Art.14 (human oversight for high-risk systems)
 *
 * Data sources (D-07: durable stores only — in-memory buffers reset per
 * serverless instance/cold start and must never back this route):
 * - Compliance audit events (ComplianceAuditEntry table)
 * - Escalation events (SafetyEvent table: crisis, jailbreak, content filter)
 * - Safety metrics and trends (computed from ComplianceAuditEntry)
 */

import { NextResponse } from 'next/server';
import { pipe, withSentry, withAdminReadOnly } from '@/lib/api/middlewares';
import {
  getComplianceEntriesFromDb,
  getComplianceStatisticsFromDb,
  getRecentEscalationsFromDb,
  getUnresolvedEscalationsFromDb,
} from '@/lib/safety/server';
import { prisma } from '@/lib/db';

export const revalidate = 0;
export interface SafetyDashboardResponse {
  overview: {
    totalEvents: number;
    criticalCount: number;
    unresolvedEscalations: number;
    trendDirection: 'increasing' | 'decreasing' | 'stable';
    periodStart: string;
    periodEnd: string;
  };
  recentEvents: Array<{
    id: string;
    timestamp: string;
    eventType: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    outcome: string;
    maestroId?: string;
    ageGroup: string;
    userId?: string;
    sessionId?: string;
  }>;
  escalations: Array<{
    id: string;
    trigger: string;
    severity: string;
    timestamp: string;
    maestroId?: string;
    resolved: boolean;
  }>;
  statistics: {
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    eventsByOutcome: Record<string, number>;
    regulatoryImpact: {
      aiActEvents: number;
      gdprEvents: number;
      coppaEvents: number;
      italianL132Art4Events: number;
    };
    mitigationMetrics: {
      blockedCount: number;
      modifiedCount: number;
      escalatedCount: number;
      allowedCount: number;
      monitoredCount: number;
    };
  };
}

export const GET = pipe(
  withSentry('/api/admin/safety'),
  withAdminReadOnly,
)(async (): Promise<NextResponse<SafetyDashboardResponse | { error: string }>> => {
  // D-07: all reads come from durable stores (DB), never in-memory buffers.
  const [
    statistics, // Compliance audit statistics (last 30 days)
    recentComplianceEvents, // Recent compliance events (last 20)
    recentEscalations, // Escalation events (last 24 hours)
    unresolvedEscalations,
    safetyEvents, // Recent SafetyEvent records with userId/sessionId for admin actions
  ] = await Promise.all([
    getComplianceStatisticsFromDb(30),
    getComplianceEntriesFromDb({ limit: 20 }),
    getRecentEscalationsFromDb(1440),
    getUnresolvedEscalationsFromDb(),
    prisma.safetyEvent.findMany({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 20,
    }),
  ]);

  // Create a map of safety events by type for quick lookup
  const safetyEventMap = new Map(safetyEvents.map((e) => [e.type, e]));

  // Format recent events for dashboard with userId/sessionId from SafetyEvent
  const recentEvents = recentComplianceEvents.map((event) => {
    const safetyEvent = safetyEventMap.get(event.eventType);
    return {
      id: event.id,
      timestamp: event.timestamp,
      eventType: event.eventType,
      severity: event.severity,
      outcome: event.outcome,
      maestroId: event.maestroId,
      ageGroup: event.userContext.ageGroup,
      userId: safetyEvent?.userId || undefined,
      sessionId: safetyEvent?.conversationId || undefined,
    };
  });

  // Format escalation events
  const escalations = recentEscalations.map((event) => ({
    id: event.id,
    trigger: event.trigger,
    severity: event.severity,
    timestamp: event.timestamp.toISOString(),
    maestroId: event.maestroId,
    resolved: event.resolved,
  }));

  // Calculate total events in period
  const totalEvents = statistics.totalEvents;
  const criticalCount = statistics.criticalEvents;

  const response: SafetyDashboardResponse = {
    overview: {
      totalEvents,
      criticalCount,
      unresolvedEscalations: unresolvedEscalations.length,
      trendDirection: statistics.trendDirection,
      periodStart: statistics.periodStart,
      periodEnd: statistics.periodEnd,
    },
    recentEvents,
    escalations,
    statistics: {
      eventsByType: statistics.eventsByType,
      eventsBySeverity: statistics.eventsBySeverity,
      eventsByOutcome: statistics.eventsByOutcome,
      regulatoryImpact: statistics.regulatoryImpact,
      mitigationMetrics: statistics.mitigationMetrics,
    },
  };

  return NextResponse.json(response);
});
