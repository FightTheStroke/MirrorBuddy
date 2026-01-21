/**
 * Threshold Logic for Proactive Alerts (F-07, F-18, F-25)
 *
 * Implements alert threshold logic for all service limits:
 * - Warning: 70-84%
 * - Critical: 85-94%
 * - Emergency: ≥95%
 *
 * Used by all limit services (Vercel, Supabase, Resend, Azure, Redis)
 * to determine alert status before reaching hard limits.
 *
 * ADR 0065: Threshold-based alert triggering
 */

/**
 * Alert status based on usage percentage
 */
export type AlertStatus = "ok" | "warning" | "critical" | "emergency";

/**
 * Threshold configuration (F-25)
 */
export const THRESHOLDS = {
  warning: 70, // F-25: 70%
  critical: 85, // F-25: 85%
  emergency: 95, // F-25: 95%
  proactive: 80, // F-07: Proactive alert threshold
} as const;

/**
 * Calculate alert status based on usage percentage (F-07, F-25)
 *
 * Returns appropriate alert level for monitoring and notification:
 * - ok: < 70%
 * - warning: 70-84% (proactive alert zone, F-07)
 * - critical: 85-94% (urgent intervention needed)
 * - emergency: ≥ 95% (service degradation imminent)
 *
 * @param usagePercent - Usage percentage (0-100)
 * @returns AlertStatus - Current alert status
 *
 * @example
 * ```typescript
 * const status = calculateStatus(75); // "warning"
 * const status = calculateStatus(90); // "critical"
 * const status = calculateStatus(98); // "emergency"
 * ```
 */
export function calculateStatus(usagePercent: number): AlertStatus {
  if (usagePercent >= THRESHOLDS.emergency) return "emergency";
  if (usagePercent >= THRESHOLDS.critical) return "critical";
  if (usagePercent >= THRESHOLDS.warning) return "warning";
  return "ok";
}

/**
 * Check if usage requires proactive alert (F-07)
 *
 * Proactive alerts trigger at 80% to warn before critical limits.
 * Used for early intervention and capacity planning.
 *
 * @param usagePercent - Usage percentage
 * @returns boolean - True if proactive alert should trigger
 */
export function shouldTriggerProactiveAlert(usagePercent: number): boolean {
  return usagePercent >= THRESHOLDS.proactive;
}

/**
 * Get human-readable alert message (F-18)
 *
 * @param resourceName - Name of the resource (e.g., "Bandwidth", "Database")
 * @param status - Current alert status
 * @param usagePercent - Usage percentage
 * @returns Human-readable alert message
 */
export function getAlertMessage(
  resourceName: string,
  status: AlertStatus,
  usagePercent: number,
): string {
  if (status === "emergency") {
    return `EMERGENCY: ${resourceName} at ${usagePercent}% - immediate action required`;
  }
  if (status === "critical") {
    return `CRITICAL: ${resourceName} at ${usagePercent}% - urgent intervention needed`;
  }
  if (status === "warning") {
    return `WARNING: ${resourceName} at ${usagePercent}% - approaching capacity`;
  }
  return `OK: ${resourceName} at ${usagePercent}%`;
}

/**
 * Determine if alerts should be sent for a resource (F-18)
 *
 * Sends alerts for all statuses except "ok" to ensure EVERY limit
 * is monitored and configured (not just main limits).
 *
 * @param status - Current alert status
 * @returns boolean - True if alert should be sent
 */
export function shouldSendAlert(status: AlertStatus): boolean {
  return status !== "ok";
}

/**
 * Resource metric with threshold status (F-18, F-25)
 */
export interface MetricWithStatus {
  name: string;
  usagePercent: number;
  status: AlertStatus;
  message: string;
  shouldAlert: boolean;
}

/**
 * Annotate metric with threshold status (F-18, F-25)
 *
 * Adds alert status and message to any usage percentage.
 * Used to enrich all limit responses with threshold information.
 *
 * @param name - Metric name (e.g., "Bandwidth")
 * @param usagePercent - Usage percentage (0-100)
 * @returns MetricWithStatus - Enriched metric with status
 */
export function annotateMetric(
  name: string,
  usagePercent: number,
): MetricWithStatus {
  const status = calculateStatus(usagePercent);
  return {
    name,
    usagePercent,
    status,
    message: getAlertMessage(name, status, usagePercent),
    shouldAlert: shouldSendAlert(status),
  };
}
