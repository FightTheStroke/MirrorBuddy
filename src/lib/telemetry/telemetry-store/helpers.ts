// ============================================================================
// TELEMETRY STORE HELPERS
// Utility functions and convenience tracking methods
// ============================================================================

import { nanoid } from 'nanoid';
import { useTelemetryStore } from '../telemetry-store';

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return `sess_${Date.now()}_${nanoid(7)}`;
}

/**
 * Check if two dates are on the same day
 */
export function isSameDay(date1: Date | string | null, date2: Date): boolean {
  if (!date1) return false;
  // Handle string dates from JSON serialization
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  if (isNaN(d1.getTime())) return false;
  return (
    d1.getFullYear() === date2.getFullYear() &&
    d1.getMonth() === date2.getMonth() &&
    d1.getDate() === date2.getDate()
  );
}

/**
 * Track a page view event.
 */
export function trackPageView(pageName: string, metadata?: Record<string, string | number | boolean>) {
  useTelemetryStore.getState().trackEvent('navigation', 'page_view', pageName, undefined, metadata);
}

/**
 * Track a feature usage event.
 */
export function trackFeatureUsage(feature: string, action: string, value?: number) {
  useTelemetryStore.getState().trackEvent('education', action, feature, value);
}

/**
 * Track a maestro interaction.
 */
export function trackMaestroInteraction(maestroId: string, action: string, durationSeconds?: number) {
  useTelemetryStore.getState().trackEvent('maestro', action, maestroId, durationSeconds);
}

/**
 * Track an error.
 */
export function trackError(errorType: string, errorMessage: string, metadata?: Record<string, string | number | boolean>) {
  useTelemetryStore.getState().trackEvent('error', errorType, errorMessage, undefined, metadata);
}

/**
 * Track performance metric.
 */
export function trackPerformance(metricName: string, valueMs: number, metadata?: Record<string, string | number | boolean>) {
  useTelemetryStore.getState().trackEvent('performance', metricName, undefined, valueMs, metadata);
}
