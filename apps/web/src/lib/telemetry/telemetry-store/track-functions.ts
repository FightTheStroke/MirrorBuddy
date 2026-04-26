// ============================================================================
// TELEMETRY TRACKING FUNCTIONS
// Standalone tracking functions for common telemetry events
// ============================================================================

import { useTelemetryStore } from '../telemetry-store';

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
