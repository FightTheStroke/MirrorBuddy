/**
 * Dependency Detection System
 * Reference: Amodei "The Adolescence of Technology" (2026)
 * Implements Professors' Constitution Article IV: Protection from Dependency
 */

export type {
  AlertType,
  AlertSeverity,
  UsageMetrics,
  DependencyAlertInput,
  PatternAnalysisResult,
  EmotionalAnalysisResult,
} from "./types";
export { DEPENDENCY_THRESHOLDS } from "./types";

export {
  recordSessionStart,
  recordMessage,
  recordUsageTime,
  getUsageMetrics,
  getUsageHistory,
} from "./usage-tracker";

export {
  detectEmotionalVenting,
  detectAIPreference,
  analyzeMessage,
  analyzeMessages,
} from "./emotional-detector";

export {
  analyzeUserPatterns,
  analyzeWeeklyEmotionalPatterns,
} from "./pattern-analyzer";

export {
  createAlert,
  getUnresolvedAlerts,
  resolveAlert,
  markParentNotified,
  getAlertsForParentNotification,
  getAlertStatistics,
} from "./alert-generator";

import {
  analyzeUserPatterns,
  analyzeWeeklyEmotionalPatterns,
} from "./pattern-analyzer";
import { createAlert } from "./alert-generator";
import type { PatternAnalysisResult, DependencyAlertInput } from "./types";

export async function runDependencyAnalysis(
  userId: string,
): Promise<PatternAnalysisResult & { weeklyAlerts: DependencyAlertInput[] }> {
  const dailyResults = await analyzeUserPatterns(userId);
  const weeklyAlerts = await analyzeWeeklyEmotionalPatterns(userId);

  for (const alert of [...dailyResults.alerts, ...weeklyAlerts]) {
    await createAlert(alert);
  }

  return { ...dailyResults, weeklyAlerts };
}
