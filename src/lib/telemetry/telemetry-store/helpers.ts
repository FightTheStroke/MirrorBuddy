// ============================================================================
// TELEMETRY STORE HELPERS
// Re-exports for backward compatibility
// ============================================================================

// Re-export pure utils
export { generateSessionId, isSameDay } from './utils';

// Re-export tracking functions
export {
  trackPageView,
  trackFeatureUsage,
  trackMaestroInteraction,
  trackError,
  trackPerformance,
} from './track-functions';
