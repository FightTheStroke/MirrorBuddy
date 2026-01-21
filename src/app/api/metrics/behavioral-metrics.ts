/**
 * Behavioral Metrics for V1 Enterprise Readiness
 *
 * Metrics from V1Plan FASE 2 - Osservabilità Prodotto:
 * - Session Success Rate (target: ≥80%)
 * - Drop-off Rate (target: ≤10%)
 * - Stuck Loop Rate (target: ≤5%)
 * - Turns per session (target: 5-20)
 * - Refusal Precision (target: ≥95%)
 * - Incident counts by severity (S0-S3)
 * - Cost per session
 */

import { prisma } from "@/lib/db";

interface MetricLine {
  name: string;
  type: "counter" | "gauge" | "histogram";
  help: string;
  labels: Record<string, string>;
  value: number;
}

interface SessionStats {
  totalSessions: number;
  successfulSessions: number;
  droppedSessions: number;
  stuckLoopSessions: number;
  avgTurnsPerSession: number;
  avgDurationMinutes: number;
}

interface SafetyStats {
  totalRefusals: number;
  correctRefusals: number;
  incidentsS0: number;
  incidentsS1: number;
  incidentsS2: number;
  incidentsS3: number;
  jailbreakAttempts: number;
  jailbreakBlocked: number;
}

/**
 * Generate behavioral metrics from database
 */
export async function generateBehavioralMetrics(): Promise<MetricLine[]> {
  const metrics: MetricLine[] = [];
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Fetch session stats (24h window)
  const sessionStats = await getSessionStats(dayAgo, now);

  // Session Health metrics
  const successRate =
    sessionStats.totalSessions > 0
      ? sessionStats.successfulSessions / sessionStats.totalSessions
      : 0;
  const dropoffRate =
    sessionStats.totalSessions > 0
      ? sessionStats.droppedSessions / sessionStats.totalSessions
      : 0;
  const stuckLoopRate =
    sessionStats.totalSessions > 0
      ? sessionStats.stuckLoopSessions / sessionStats.totalSessions
      : 0;

  metrics.push(
    {
      name: "mirrorbuddy_session_success_rate",
      type: "gauge",
      help: "Session success rate (target: >=0.80)",
      labels: { period: "24h" },
      value: successRate,
    },
    {
      name: "mirrorbuddy_session_dropoff_rate",
      type: "gauge",
      help: "Session drop-off rate (target: <=0.10)",
      labels: { period: "24h" },
      value: dropoffRate,
    },
    {
      name: "mirrorbuddy_session_stuck_loop_rate",
      type: "gauge",
      help: "Session stuck loop rate (target: <=0.05)",
      labels: { period: "24h" },
      value: stuckLoopRate,
    },
    {
      name: "mirrorbuddy_session_turns_avg",
      type: "gauge",
      help: "Average turns per session (target: 5-20)",
      labels: { period: "24h" },
      value: sessionStats.avgTurnsPerSession,
    },
    {
      name: "mirrorbuddy_session_duration_minutes_avg",
      type: "gauge",
      help: "Average session duration in minutes (target: 5-30)",
      labels: { period: "24h" },
      value: sessionStats.avgDurationMinutes,
    },
    {
      name: "mirrorbuddy_sessions_total",
      type: "counter",
      help: "Total sessions",
      labels: { period: "24h", status: "all" },
      value: sessionStats.totalSessions,
    },
    {
      name: "mirrorbuddy_sessions_total",
      type: "counter",
      help: "Total sessions",
      labels: { period: "24h", status: "success" },
      value: sessionStats.successfulSessions,
    },
    {
      name: "mirrorbuddy_sessions_total",
      type: "counter",
      help: "Total sessions",
      labels: { period: "24h", status: "dropped" },
      value: sessionStats.droppedSessions,
    },
  );

  // Safety metrics (7d window for incidents)
  const safetyStats = await getSafetyStats(weekAgo, now);

  const refusalPrecision =
    safetyStats.totalRefusals > 0
      ? safetyStats.correctRefusals / safetyStats.totalRefusals
      : 1; // 100% if no refusals
  const jailbreakBlockRate =
    safetyStats.jailbreakAttempts > 0
      ? safetyStats.jailbreakBlocked / safetyStats.jailbreakAttempts
      : 1;

  metrics.push(
    {
      name: "mirrorbuddy_refusal_precision",
      type: "gauge",
      help: "Refusal precision rate (target: >=0.95)",
      labels: { period: "7d" },
      value: refusalPrecision,
    },
    {
      name: "mirrorbuddy_jailbreak_block_rate",
      type: "gauge",
      help: "Jailbreak attempts blocked (target: 1.00)",
      labels: { period: "7d" },
      value: jailbreakBlockRate,
    },
    {
      name: "mirrorbuddy_incidents_total",
      type: "counter",
      help: "Total incidents by severity",
      labels: { period: "7d", severity: "S0" },
      value: safetyStats.incidentsS0,
    },
    {
      name: "mirrorbuddy_incidents_total",
      type: "counter",
      help: "Total incidents by severity",
      labels: { period: "7d", severity: "S1" },
      value: safetyStats.incidentsS1,
    },
    {
      name: "mirrorbuddy_incidents_total",
      type: "counter",
      help: "Total incidents by severity",
      labels: { period: "7d", severity: "S2" },
      value: safetyStats.incidentsS2,
    },
    {
      name: "mirrorbuddy_incidents_total",
      type: "counter",
      help: "Total incidents by severity (target: 0)",
      labels: { period: "7d", severity: "S3" },
      value: safetyStats.incidentsS3,
    },
  );

  // Cost metrics (from telemetry if available)
  const costStats = await getCostStats(dayAgo, now);
  metrics.push(
    {
      name: "mirrorbuddy_cost_per_session_eur",
      type: "gauge",
      help: "Average cost per session in EUR (target: <=0.05 text, <=0.15 voice)",
      labels: { period: "24h", type: "text" },
      value: costStats.avgCostText,
    },
    {
      name: "mirrorbuddy_cost_per_session_eur",
      type: "gauge",
      help: "Average cost per session in EUR",
      labels: { period: "24h", type: "voice" },
      value: costStats.avgCostVoice,
    },
    {
      name: "mirrorbuddy_cost_spikes_total",
      type: "counter",
      help: "Cost spikes (>P95*1.5) this week (target: <=1)",
      labels: { period: "7d" },
      value: costStats.spikesThisWeek,
    },
  );

  return metrics;
}

/**
 * Calculate session statistics from StudySession table
 * Uses schema fields: duration (seconds), questions (as proxy for turns), endedAt
 * F-06: Excludes test data (isTestData = false)
 */
async function getSessionStats(from: Date, to: Date): Promise<SessionStats> {
  const sessions = await prisma.studySession.findMany({
    where: { startedAt: { gte: from, lte: to }, isTestData: false },
    select: {
      id: true,
      startedAt: true,
      endedAt: true,
      duration: true,
      questions: true,
      xpEarned: true,
    },
  });

  const totalSessions = sessions.length;
  let successfulSessions = 0;
  let droppedSessions = 0;
  let stuckLoopSessions = 0;
  let totalTurns = 0;
  let totalDurationSec = 0;
  let sessionsWithDuration = 0;

  for (const session of sessions) {
    const turns = session.questions || 0;

    // Success = completed (has endedAt) with good engagement (>2 questions/turns)
    if (session.endedAt && turns > 2) {
      successfulSessions++;
    }

    // Dropped = ended early with <=2 turns OR abandoned (no endedAt, started >1h ago)
    const isAbandoned =
      !session.endedAt &&
      session.startedAt.getTime() < Date.now() - 60 * 60 * 1000;
    if (turns <= 2 || isAbandoned) {
      droppedSessions++;
    }

    totalTurns += turns;

    if (session.duration && session.duration > 0) {
      totalDurationSec += session.duration;
      sessionsWithDuration++;

      // Heuristic: >50 questions in <5 minutes = stuck loop
      if (turns > 50 && session.duration < 5 * 60) {
        stuckLoopSessions++;
      }
    }
  }

  return {
    totalSessions,
    successfulSessions,
    droppedSessions,
    stuckLoopSessions,
    avgTurnsPerSession: totalSessions > 0 ? totalTurns / totalSessions : 0,
    avgDurationMinutes:
      sessionsWithDuration > 0
        ? totalDurationSec / sessionsWithDuration / 60
        : 0,
  };
}

/**
 * Calculate safety statistics from TelemetryEvent
 * F-06: Excludes test data (isTestData = false)
 */
async function getSafetyStats(from: Date, to: Date): Promise<SafetyStats> {
  const events = await prisma.telemetryEvent.findMany({
    where: {
      timestamp: { gte: from, lte: to },
      category: { in: ["safety", "moderation", "security"] },
      isTestData: false,
    },
    select: { action: true, label: true },
  });

  let totalRefusals = 0;
  let correctRefusals = 0;
  let incidentsS0 = 0;
  let incidentsS1 = 0;
  let incidentsS2 = 0;
  let incidentsS3 = 0;
  let jailbreakAttempts = 0;
  let jailbreakBlocked = 0;

  for (const event of events) {
    if (event.action === "refusal") {
      totalRefusals++;
      // Correct refusal if labeled as such
      if (event.label !== "false_positive") {
        correctRefusals++;
      }
    }
    if (event.action === "incident") {
      if (event.label === "S0") incidentsS0++;
      if (event.label === "S1") incidentsS1++;
      if (event.label === "S2") incidentsS2++;
      if (event.label === "S3") incidentsS3++;
    }
    if (event.action === "jailbreak_attempt") {
      jailbreakAttempts++;
      if (event.label === "blocked") jailbreakBlocked++;
    }
  }

  return {
    totalRefusals,
    correctRefusals,
    incidentsS0,
    incidentsS1,
    incidentsS2,
    incidentsS3,
    jailbreakAttempts,
    jailbreakBlocked,
  };
}

/**
 * Calculate cost statistics from REAL SessionMetrics data.
 * Uses cost-tracking-service.ts which calculates costs from actual API token counts.
 */
async function getCostStats(
  _from: Date,
  _to: Date,
): Promise<{
  avgCostText: number;
  avgCostVoice: number;
  spikesThisWeek: number;
}> {
  // Import dynamically to avoid circular dependency
  const { getCostMetricsSummary } =
    await import("@/lib/metrics/cost-tracking-service");
  const summary = await getCostMetricsSummary();
  return {
    avgCostText: summary.avgCostText24h,
    avgCostVoice: summary.avgCostVoice24h,
    spikesThisWeek: summary.spikesThisWeek,
  };
}
