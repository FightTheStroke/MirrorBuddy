// ============================================================================
// TELEMETRY INITIALIZATION
// Setup and cleanup functions for telemetry
// ============================================================================

import { useTelemetryStore } from '../telemetry-store';
import { subscribeToAnalyticsConsent } from '@/lib/consent/unified-consent-storage';

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
  const unsubscribe = subscribeToAnalyticsConsent((allowed) => {
    const current = useTelemetryStore.getState();
    if (allowed && !current.sessionStartedAt) current.startSession();
  });

  // Set up auto-flush interval
  const flushInterval = setInterval(() => {
    store.flushEvents();
  }, store.config.flushIntervalMs);

  // Flush on page unload
  const handleUnload = () => {
    useTelemetryStore.getState().endSession();
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
    unsubscribe();
    clearInterval(flushInterval);
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  };
}
