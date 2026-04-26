/**
 * Pattern Analyzer
 * Reference: Amodei "The Adolescence of Technology" (2026)
 */

import {
  DEPENDENCY_THRESHOLDS,
  PatternAnalysisResult,
  DependencyAlertInput,
} from "./types";
import { getUsageHistory, getUsageMetrics } from "./usage-tracker";

function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function calculateStdDev(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
  return Math.sqrt(variance);
}

function calculateSigma(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

type SeverityResult = {
  severity: "warning" | "concern" | "critical";
  threshold: number;
} | null;

function checkMinutesThreshold(minutes: number): SeverityResult {
  if (minutes >= DEPENDENCY_THRESHOLDS.MINUTES_CRITICAL) {
    return {
      severity: "critical",
      threshold: DEPENDENCY_THRESHOLDS.MINUTES_CRITICAL,
    };
  }
  if (minutes >= DEPENDENCY_THRESHOLDS.MINUTES_CONCERN) {
    return {
      severity: "concern",
      threshold: DEPENDENCY_THRESHOLDS.MINUTES_CONCERN,
    };
  }
  if (minutes >= DEPENDENCY_THRESHOLDS.MINUTES_WARNING) {
    return {
      severity: "warning",
      threshold: DEPENDENCY_THRESHOLDS.MINUTES_WARNING,
    };
  }
  return null;
}

function checkSessionsThreshold(sessions: number): SeverityResult {
  if (sessions >= DEPENDENCY_THRESHOLDS.SESSIONS_CRITICAL) {
    return {
      severity: "critical",
      threshold: DEPENDENCY_THRESHOLDS.SESSIONS_CRITICAL,
    };
  }
  if (sessions >= DEPENDENCY_THRESHOLDS.SESSIONS_CONCERN) {
    return {
      severity: "concern",
      threshold: DEPENDENCY_THRESHOLDS.SESSIONS_CONCERN,
    };
  }
  if (sessions >= DEPENDENCY_THRESHOLDS.SESSIONS_WARNING) {
    return {
      severity: "warning",
      threshold: DEPENDENCY_THRESHOLDS.SESSIONS_WARNING,
    };
  }
  return null;
}

function checkNightPercentThreshold(percent: number): SeverityResult {
  if (percent >= DEPENDENCY_THRESHOLDS.NIGHT_PERCENT_CRITICAL) {
    return {
      severity: "critical",
      threshold: DEPENDENCY_THRESHOLDS.NIGHT_PERCENT_CRITICAL,
    };
  }
  if (percent >= DEPENDENCY_THRESHOLDS.NIGHT_PERCENT_CONCERN) {
    return {
      severity: "concern",
      threshold: DEPENDENCY_THRESHOLDS.NIGHT_PERCENT_CONCERN,
    };
  }
  if (percent >= DEPENDENCY_THRESHOLDS.NIGHT_PERCENT_WARNING) {
    return {
      severity: "warning",
      threshold: DEPENDENCY_THRESHOLDS.NIGHT_PERCENT_WARNING,
    };
  }
  return null;
}

export async function analyzeUserPatterns(
  userId: string,
): Promise<PatternAnalysisResult> {
  const history = await getUsageHistory(userId, 7);
  const today = await getUsageMetrics(userId);
  const alerts: DependencyAlertInput[] = [];

  const minutesHistory = history.map((h) => h.totalMinutes);
  const weekdayAverage = calculateMean(minutesHistory);
  const stdDeviation = calculateStdDev(minutesHistory, weekdayAverage);

  if (today) {
    const minutesResult = checkMinutesThreshold(today.totalMinutes);
    if (minutesResult) {
      alerts.push({
        userId,
        alertType: "excessive_usage",
        severity: minutesResult.severity,
        triggerValue: today.totalMinutes,
        threshold: minutesResult.threshold,
        description: `User spent ${today.totalMinutes} minutes today`,
      });
    }

    const sessionsResult = checkSessionsThreshold(today.sessionCount);
    if (sessionsResult) {
      alerts.push({
        userId,
        alertType: "excessive_usage",
        severity: sessionsResult.severity,
        triggerValue: today.sessionCount,
        threshold: sessionsResult.threshold,
        description: `User had ${today.sessionCount} sessions today`,
      });
    }

    if (today.totalMinutes > 0) {
      const nightPercent = (today.nightMinutes / today.totalMinutes) * 100;
      const nightResult = checkNightPercentThreshold(nightPercent);
      if (nightResult) {
        alerts.push({
          userId,
          alertType: "night_usage",
          severity: nightResult.severity,
          triggerValue: Math.round(nightPercent),
          threshold: nightResult.threshold,
          description: `${Math.round(nightPercent)}% of usage is at night`,
        });
      }
    }
  }

  const todayMinutes = today?.totalMinutes ?? 0;
  const sigmaDeviation = calculateSigma(
    todayMinutes,
    weekdayAverage,
    stdDeviation,
  );
  const isAnomaly =
    Math.abs(sigmaDeviation) >= DEPENDENCY_THRESHOLDS.SIGMA_WARNING;

  if (isAnomaly && sigmaDeviation > 0) {
    alerts.push({
      userId,
      alertType: "excessive_usage",
      severity: "warning",
      sigmaDeviation,
      triggerValue: todayMinutes,
      description: `Usage is ${sigmaDeviation.toFixed(1)} standard deviations above normal`,
    });
  }

  return {
    userId,
    weekdayAverage,
    stdDeviation,
    isAnomaly,
    sigmaDeviation,
    alerts,
  };
}

export async function analyzeWeeklyEmotionalPatterns(
  userId: string,
): Promise<DependencyAlertInput[]> {
  const history = await getUsageHistory(userId, 7);
  const alerts: DependencyAlertInput[] = [];

  const weeklyEmotionalVents = history.reduce(
    (sum, h) => sum + h.emotionalVentCount,
    0,
  );
  const weeklyAIPreferences = history.reduce(
    (sum, h) => sum + h.aiPreferenceCount,
    0,
  );

  if (weeklyEmotionalVents >= DEPENDENCY_THRESHOLDS.EMOTIONAL_VENTS_CRITICAL) {
    alerts.push({
      userId,
      alertType: "emotional_venting",
      severity: "critical",
      triggerValue: weeklyEmotionalVents,
      threshold: DEPENDENCY_THRESHOLDS.EMOTIONAL_VENTS_CRITICAL,
    });
  } else if (
    weeklyEmotionalVents >= DEPENDENCY_THRESHOLDS.EMOTIONAL_VENTS_WARNING
  ) {
    alerts.push({
      userId,
      alertType: "emotional_venting",
      severity: "warning",
      triggerValue: weeklyEmotionalVents,
      threshold: DEPENDENCY_THRESHOLDS.EMOTIONAL_VENTS_WARNING,
    });
  }

  if (weeklyAIPreferences >= DEPENDENCY_THRESHOLDS.AI_PREFERENCE_CRITICAL) {
    alerts.push({
      userId,
      alertType: "ai_preference",
      severity: "critical",
      triggerValue: weeklyAIPreferences,
      threshold: DEPENDENCY_THRESHOLDS.AI_PREFERENCE_CRITICAL,
    });
  } else if (
    weeklyAIPreferences >= DEPENDENCY_THRESHOLDS.AI_PREFERENCE_WARNING
  ) {
    alerts.push({
      userId,
      alertType: "ai_preference",
      severity: "warning",
      triggerValue: weeklyAIPreferences,
      threshold: DEPENDENCY_THRESHOLDS.AI_PREFERENCE_WARNING,
    });
  }

  return alerts;
}
