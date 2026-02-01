/**
 * Admin Safety Dashboard API
 * F-15 - Provides real-time AI system health and safety event data
 * Compliance: AI Act Art.14 (human oversight for high-risk systems)
 *
 * Data sources:
 * - Compliance audit events
 * - Escalation events (crisis, jailbreak, content filter)
 * - Safety metrics and trends
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withAdmin } from "@/lib/api/middlewares";
import {
  getComplianceEntries,
  getComplianceStatistics,
} from "@/lib/safety/audit/compliance-audit-service";
import {
  getRecentEscalations,
  getUnresolvedEscalations,
} from "@/lib/safety/escalation/escalation-service";

export interface SafetyDashboardResponse {
  overview: {
    totalEvents: number;
    criticalCount: number;
    unresolvedEscalations: number;
    trendDirection: "increasing" | "decreasing" | "stable";
    periodStart: string;
    periodEnd: string;
  };
  recentEvents: Array<{
    id: string;
    timestamp: string;
    eventType: string;
    severity: "critical" | "high" | "medium" | "low";
    outcome: string;
    maestroId?: string;
    ageGroup: string;
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
  withSentry("/api/admin/safety"),
  withAdmin,
)(
  async (): Promise<
    NextResponse<SafetyDashboardResponse | { error: string }>
  > => {
    // Get compliance audit statistics
    const statistics = getComplianceStatistics(30); // Last 30 days

    // Get recent compliance events (last 20)
    const recentComplianceEvents = getComplianceEntries({
      limit: 20,
    });

    // Get escalation events
    const recentEscalations = getRecentEscalations(1440); // Last 24 hours
    const unresolvedEscalations = getUnresolvedEscalations();

    // Format recent events for dashboard
    const recentEvents = recentComplianceEvents.map((event) => ({
      id: event.id,
      timestamp: event.timestamp,
      eventType: event.eventType,
      severity: event.severity,
      outcome: event.outcome,
      maestroId: event.maestroId,
      ageGroup: event.userContext.ageGroup,
    }));

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
  },
);
