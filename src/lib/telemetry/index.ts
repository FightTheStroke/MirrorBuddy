// ============================================================================
// TELEMETRY MODULE INDEX
// ============================================================================

export * from './types';
export { useTelemetryStore } from './telemetry-store';
export type { TelemetryState } from './telemetry-store';

// Tracking functions (from separate module to avoid circular deps)
export {
  trackPageView,
  trackFeatureUsage,
  trackMaestroInteraction,
  trackError,
  trackPerformance,
} from './telemetry-store/track-functions';

// Initialization (from separate module to avoid circular deps)
export { initializeTelemetry } from './telemetry-store/initialize';

// Utilities
export { generateSessionId, isSameDay } from './telemetry-store/utils';
