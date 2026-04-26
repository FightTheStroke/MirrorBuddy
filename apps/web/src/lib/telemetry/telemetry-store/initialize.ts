// ============================================================================
// TELEMETRY INITIALIZATION
// Setup and cleanup functions for telemetry
// ============================================================================

import { useTelemetryStore } from '../telemetry-store';

/**
 * Initialize telemetry on app start.
 */
export function initializeTelemetry() {
  // Skip telemetry in test/E2E environment (navigator.webdriver is set by Playwright, Selenium, etc.)
  if (typeof navigator !== 'undefined' && navigator.webdriver) {
    return () => {}; // Return no-op cleanup function
  }

  const store = useTelemetryStore.getState();

  // Start session
  store.startSession();

  // Set up auto-flush interval
  const flushInterval = setInterval(() => {
    store.flushEvents();
  }, store.config.flushIntervalMs);

  // Flush on page unload
  const handleUnload = () => {
    const state = useTelemetryStore.getState();

    // Track session end event
    if (state.sessionStartedAt) {
      const durationSeconds = Math.round(
        (Date.now() - state.sessionStartedAt.getTime()) / 1000
      );
      state.trackEvent('navigation', 'session_ended', undefined, durationSeconds);
    }

    // Use sendBeacon for reliable delivery on unload (fetch() gets aborted)
    const events = state.eventQueue;
    if (events.length > 0) {
      navigator.sendBeacon(
        '/api/telemetry/events',
        new Blob([JSON.stringify({ events })], { type: 'application/json' })
      );
    }
  };

  // Named handler for visibilitychange to enable proper cleanup
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      store.flushEvents();
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('visibilitychange', handleVisibilityChange);
  }

  // Return cleanup function
  return () => {
    clearInterval(flushInterval);
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  };
}
