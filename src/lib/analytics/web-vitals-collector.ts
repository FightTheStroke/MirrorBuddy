// ============================================================================
// WEB VITALS COLLECTOR
// Collects Core Web Vitals with user, page, and device context
// GDPR Compliant: Only collects if user has given analytics consent
// ============================================================================

import { onCLS, onINP, onFCP, onLCP, onTTFB, type Metric } from 'web-vitals';
import { logger } from '@/lib/logger';
import type { ConsentState } from '@/lib/stores/consent-store';
import {
  getOrCreateSessionId,
  getDeviceType,
  getConnectionType,
  type DeviceType,
} from './web-vitals-helpers';

// ============================================================================
// TYPES
// ============================================================================

export type MetricName = 'LCP' | 'CLS' | 'INP' | 'TTFB' | 'FCP';
export type MetricRating = 'good' | 'needs-improvement' | 'poor';

export interface WebVitalsEvent {
  // Metric
  name: MetricName;
  value: number;
  rating: MetricRating;

  // User context (for debugging)
  userId: string | null;
  sessionId: string;

  // Page context
  route: string;
  navigationType: string;

  // Device context
  deviceType: DeviceType;
  connectionType: string;

  // Timestamp
  timestamp: number;
}


// ============================================================================
// METRIC SENDING
// ============================================================================

let currentConsentState: ConsentState | null = null;

/**
 * Set the current consent state for metric collection
 * Called from initWebVitalsWithConsent when consent becomes available
 */
export function setWebVitalsConsent(consent: ConsentState): void {
  currentConsentState = consent;
  logger.debug('[WebVitals] Consent state updated', {
    hasConsent: consent.hasAnalyticsConsent(),
  });
}

function sendMetric(event: WebVitalsEvent): void {
  // Check if consent has been given before sending metrics
  if (!currentConsentState || !currentConsentState.hasAnalyticsConsent()) {
    logger.debug('[WebVitals] Metric not sent - no analytics consent', {
      metric: event.name,
    });
    return;
  }

  const endpoint = '/api/metrics/web-vitals';
  // API expects { metrics: [...] } format
  const payload = { metrics: [event] };
  const data = JSON.stringify(payload);

  // Primary: Try Beacon API (most reliable during page unload)
  if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
    try {
      const blob = new Blob([data], { type: 'application/json' });
      // sendBeacon returns true if the request was queued successfully
      if (navigator.sendBeacon(endpoint, blob)) {
        return; // Successfully sent
      }
      // If sendBeacon returns false, fall through to fetch fallback
      logger.debug('[WebVitals] Beacon API queue full, falling back to fetch');
    } catch (error) {
      // Beacon API threw an error, fall back to fetch
      logger.debug('[WebVitals] Beacon API error, falling back to fetch', {
        error: String(error),
      });
    }
  }

  // Fallback: fetch with keepalive (works if Beacon unavailable or failed)
  // keepalive: true allows the request to complete even after page unload
  try {
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data,
      keepalive: true,
    }).catch(() => {
      // Silent failure - analytics should never break the main application
    });
  } catch (_error) {
    // Silently ignore errors in analytics collection
  }
}

// ============================================================================
// WEB VITALS INITIALIZATION
// ============================================================================

let isInitialized = false;

/**
 * Initialize web vitals collection with consent checking
 *
 * This is the recommended way to initialize web vitals with GDPR compliance.
 * Pass the consent store from the Zustand instance to avoid circular dependencies.
 *
 * @param userId - The user ID to load consent for
 * @param consentStore - Zustand consent store instance
 * @returns Cleanup function to stop listening to consent changes
 */
export function initWebVitalsWithConsent(
  userId: string | null,
  consentStore: any // eslint-disable-line @typescript-eslint/no-explicit-any
): () => void {
  // Prevent double initialization
  if (isInitialized) {
    logger.debug('[WebVitals] Already initialized, skipping');
    return () => {};
  }

  // Only run in browser
  if (typeof window === 'undefined') {
    return () => {};
  }

  isInitialized = true;

  // Subscribe to consent changes
  const unsubscribe = consentStore.subscribe(
    (state: ConsentState) => {
      setWebVitalsConsent(state);
    }
  );

  // Load initial consent if we have a userId
  if (userId && consentStore.getState().loadConsent) {
    consentStore.getState().loadConsent(userId).catch((error: Error) => {
      logger.error('[WebVitals] Failed to load consent', { error: String(error) });
    });
  }

  // Set initial consent state if already loaded
  const initialState = consentStore.getState();
  if (initialState.isLoaded) {
    setWebVitalsConsent(initialState);
  }

  const sessionId = getOrCreateSessionId();
  const deviceType = getDeviceType();
  const connectionType = getConnectionType();

  logger.info('[WebVitals] Initialized with consent check', {
    userId: userId || 'anonymous',
    sessionId,
    deviceType,
    connectionType,
  });

  // Handler for all metrics
  function handleMetric(metric: Metric): void {
    const route = window.location.pathname;
    const navigationType =
      (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)
        ?.type || 'navigate';

    const event: WebVitalsEvent = {
      name: metric.name as MetricName,
      value: metric.value,
      rating: metric.rating as MetricRating,
      userId,
      sessionId,
      route,
      navigationType,
      deviceType,
      connectionType,
      timestamp: Date.now(),
    };

    logger.debug('[WebVitals] Metric collected', {
      metric: event.name,
      value: event.value,
      rating: event.rating,
    });
    sendMetric(event);
  }

  // Collect all Core Web Vitals
  onCLS(handleMetric);
  onINP(handleMetric);
  onFCP(handleMetric);
  onLCP(handleMetric);
  onTTFB(handleMetric);

  // Return cleanup function
  return () => {
    unsubscribe();
    isInitialized = false;
  };
}

/**
 * Legacy initialization without consent checking (deprecated)
 * Use initWebVitalsWithConsent instead for GDPR compliance
 *
 * @deprecated Use initWebVitalsWithConsent instead
 */
export function initWebVitals(userId: string | null): void {
  logger.warn('[WebVitals] initWebVitals is deprecated - use initWebVitalsWithConsent for GDPR compliance');
  // Fallback: create a no-op consent store for backward compatibility
  const fallbackStore = {
    getState: () => ({ hasAnalyticsConsent: () => true, isLoaded: true }),
    subscribe: () => () => {},
  };
  initWebVitalsWithConsent(userId, fallbackStore);
}

// ============================================================================
// EXPORTS
// ============================================================================

export { onCLS, onINP, onFCP, onLCP, onTTFB };
// setWebVitalsConsent and initWebVitalsWithConsent are already exported as functions above
