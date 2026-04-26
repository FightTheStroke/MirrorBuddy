/**
 * Go/No-Go Alerting Service
 *
 * V1Plan FASE 2.0.7: SLO monitoring and release decision support
 * - Tracks SLO compliance
 * - Generates alerts on threshold breaches
 * - Provides go/no-go release decisions
 */

import { logger } from "@/lib/logger";
import { isGlobalKillSwitchActive, getAllFlags } from "@/lib/feature-flags";
import { getDegradationState } from "@/lib/degradation";
import type {
  Alert,
  AlertSeverity,
  GoNoGoCheck,
  GoNoGoDecision,
  GoNoGoResult,
  SLODefinition,
  SLOStatus,
} from "./types";

// SLO definitions from V1Plan
const sloDefinitions = new Map<string, SLODefinition>();

// Current SLO statuses
const sloStatuses = new Map<string, SLOStatus>();

// Active alerts
const activeAlerts = new Map<string, Alert>();

// Alert history
const alertHistory: Alert[] = [];
const MAX_ALERT_HISTORY = 500;

/**
 * Initialize default SLOs from V1Plan
 */
export function initializeSLOs(): void {
  // Voice availability SLO
  registerSLO({
    id: "voice-availability",
    name: "Voice Availability",
    description: "Voice API uptime",
    target: 99.5,
    errorBudget: 0.5,
    window: "monthly",
    metric: "voice_uptime_percent",
    threshold: { warning: 99.7, critical: 99.5 },
  });

  // Chat latency SLO (P95 < 3s)
  registerSLO({
    id: "chat-latency-p95",
    name: "Chat Latency P95",
    description: "Chat response time P95",
    target: 95,
    errorBudget: 5,
    window: "daily",
    metric: "chat_latency_p95_ms",
    threshold: { warning: 2500, critical: 3000 },
  });

  // Session success rate
  registerSLO({
    id: "session-success-rate",
    name: "Session Success Rate",
    description: "Sessions completed successfully",
    target: 85,
    errorBudget: 15,
    window: "daily",
    metric: "session_success_percent",
    threshold: { warning: 87, critical: 85 },
  });

  // Error rate
  registerSLO({
    id: "error-rate",
    name: "Error Rate",
    description: "API error rate below threshold",
    target: 99,
    errorBudget: 1,
    window: "hourly",
    metric: "error_rate_percent",
    threshold: { warning: 0.5, critical: 1 },
  });

  logger.info("SLOs initialized", { count: sloDefinitions.size });
}

/**
 * Reset all state for testing
 */
export function resetForTesting(): void {
  sloDefinitions.clear();
  sloStatuses.clear();
  activeAlerts.clear();
  alertHistory.length = 0;
}

/**
 * Register an SLO
 */
export function registerSLO(slo: SLODefinition): void {
  sloDefinitions.set(slo.id, slo);
}

/**
 * Update SLO status with current metric value
 */
export function updateSLOStatus(
  sloId: string,
  currentValue: number,
): SLOStatus | null {
  const slo = sloDefinitions.get(sloId);
  if (!slo) {
    logger.warn("Unknown SLO", { sloId });
    return null;
  }

  const previousStatus = sloStatuses.get(sloId);
  const status = evaluateSLOStatus(slo, currentValue, previousStatus);

  sloStatuses.set(sloId, status);

  // Check for alerts
  if (status.status === "warning" && previousStatus?.status !== "warning") {
    createAlert({
      severity: "warning",
      title: `SLO Warning: ${slo.name}`,
      message: `${slo.name} at ${currentValue.toFixed(2)}%, target ${slo.target}%`,
      sloId,
    });
  } else if (
    status.status === "breached" &&
    previousStatus?.status !== "breached"
  ) {
    createAlert({
      severity: "critical",
      title: `SLO Breached: ${slo.name}`,
      message: `${slo.name} dropped to ${currentValue.toFixed(2)}%, below target ${slo.target}%`,
      sloId,
    });
  }

  return status;
}

/**
 * Create an alert
 */
export function createAlert(params: {
  severity: AlertSeverity;
  title: string;
  message: string;
  sloId?: string;
  featureId?: string;
  metadata?: Record<string, unknown>;
}): Alert {
  const alert: Alert = {
    id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    status: "active",
    createdAt: new Date(),
    ...params,
  };

  activeAlerts.set(alert.id, alert);
  alertHistory.push(alert);

  // Trim history
  if (alertHistory.length > MAX_ALERT_HISTORY) {
    alertHistory.shift();
  }

  logger.warn("Alert created", {
    alertId: alert.id,
    severity: alert.severity,
    title: alert.title,
  });

  return alert;
}

/**
 * Acknowledge an alert
 */
export function acknowledgeAlert(
  alertId: string,
  acknowledgedBy: string,
): Alert | null {
  const alert = activeAlerts.get(alertId);
  if (!alert) return null;

  alert.status = "acknowledged";
  alert.acknowledgedAt = new Date();
  alert.acknowledgedBy = acknowledgedBy;

  logger.info("Alert acknowledged", { alertId, acknowledgedBy });
  return alert;
}

/**
 * Resolve an alert
 */
export function resolveAlert(
  alertId: string,
  resolvedBy: string,
): Alert | null {
  const alert = activeAlerts.get(alertId);
  if (!alert) return null;

  alert.status = "resolved";
  alert.resolvedAt = new Date();
  alert.resolvedBy = resolvedBy;

  activeAlerts.delete(alertId);
  logger.info("Alert resolved", { alertId, resolvedBy });
  return alert;
}

/**
 * Run go/no-go checks for release decision
 */
export function runGoNoGoChecks(): GoNoGoResult {
  const checks: GoNoGoCheck[] = [];
  const now = new Date();

  // Check 1: No critical SLO breaches
  const sloBreach = checkSLOBreaches();
  checks.push(sloBreach);

  // Check 2: No global kill-switch
  checks.push({
    checkId: "global-kill-switch",
    name: "Global Kill-Switch Off",
    required: true,
    status: isGlobalKillSwitchActive() ? "fail" : "pass",
    message: isGlobalKillSwitchActive()
      ? "Global kill-switch is active"
      : undefined,
    checkedAt: now,
  });

  // Check 3: System not in critical degradation
  const degradation = getDegradationState();
  checks.push({
    checkId: "degradation-level",
    name: "Degradation Level Acceptable",
    required: true,
    status: degradation.level === "critical" ? "fail" : "pass",
    message:
      degradation.level === "critical"
        ? `System in ${degradation.level} degradation`
        : undefined,
    checkedAt: now,
  });

  // Check 4: No critical alerts
  const criticalAlerts = getActiveAlerts().filter(
    (a) => a.severity === "critical",
  );
  checks.push({
    checkId: "critical-alerts",
    name: "No Critical Alerts",
    required: true,
    status: criticalAlerts.length === 0 ? "pass" : "fail",
    message:
      criticalAlerts.length > 0
        ? `${criticalAlerts.length} critical alerts active`
        : undefined,
    checkedAt: now,
  });

  // Check 5: Feature flags healthy (non-required)
  const flags = getAllFlags();
  const disabledCritical = flags.filter(
    (f) => f.killSwitch && ["voice_realtime", "rag_enabled"].includes(f.id),
  );
  checks.push({
    checkId: "feature-flags",
    name: "Critical Features Enabled",
    required: false,
    status: disabledCritical.length === 0 ? "pass" : "fail",
    message:
      disabledCritical.length > 0
        ? `${disabledCritical.length} critical features disabled`
        : undefined,
    checkedAt: now,
  });

  // Calculate result
  const passedCount = checks.filter((c) => c.status === "pass").length;
  const failedCount = checks.filter((c) => c.status === "fail").length;
  const requiredFailures = checks.filter(
    (c) => c.required && c.status === "fail",
  ).length;
  const score =
    checks.length > 0 ? Math.round((passedCount / checks.length) * 100) : 0;

  let decision: GoNoGoDecision = "go";
  if (requiredFailures > 0) {
    decision = "nogo";
  } else if (failedCount > 0) {
    decision = "degraded";
  }

  const result: GoNoGoResult = {
    decision,
    checks,
    passedCount,
    failedCount,
    requiredFailures,
    score,
    timestamp: now,
  };

  logger.info("Go/No-Go check completed", {
    decision,
    passedCount,
    failedCount,
    requiredFailures,
  });

  return result;
}

/**
 * Get active alerts
 */
export function getActiveAlerts(): Alert[] {
  return Array.from(activeAlerts.values());
}

/**
 * Get all SLO statuses
 */
export function getAllSLOStatuses(): SLOStatus[] {
  return Array.from(sloStatuses.values());
}

/**
 * Get SLO definitions
 */
export function getSLODefinitions(): SLODefinition[] {
  return Array.from(sloDefinitions.values());
}

/**
 * Get alert history
 */
export function getAlertHistory(limit = 50): Alert[] {
  return alertHistory.slice(-limit);
}

// Internal: Evaluate SLO status
function evaluateSLOStatus(
  slo: SLODefinition,
  currentValue: number,
  previous?: SLOStatus,
): SLOStatus {
  const errorBudgetRemaining = Math.max(
    0,
    slo.errorBudget - (slo.target - currentValue),
  );

  let status: SLOStatus["status"] = "healthy";
  if (currentValue < slo.threshold.critical) {
    status = "breached";
  } else if (currentValue < slo.threshold.warning) {
    status = "warning";
  }

  let trend: SLOStatus["trend"] = "stable";
  if (previous) {
    if (currentValue > previous.currentValue + 0.5) {
      trend = "improving";
    } else if (currentValue < previous.currentValue - 0.5) {
      trend = "degrading";
    }
  }

  return {
    sloId: slo.id,
    currentValue,
    target: slo.target,
    errorBudgetRemaining,
    status,
    trend,
    lastUpdated: new Date(),
  };
}

// Internal: Check for SLO breaches
function checkSLOBreaches(): GoNoGoCheck {
  const breached = Array.from(sloStatuses.values()).filter(
    (s) => s.status === "breached",
  );

  return {
    checkId: "slo-breaches",
    name: "No SLO Breaches",
    required: true,
    status: breached.length === 0 ? "pass" : "fail",
    message:
      breached.length > 0 ? `${breached.length} SLOs breached` : undefined,
    checkedAt: new Date(),
  };
}

// Auto-initialize
initializeSLOs();
