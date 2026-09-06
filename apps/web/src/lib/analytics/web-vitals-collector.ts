import { onCLS, onINP, onFCP, onLCP, onTTFB, type Metric } from 'web-vitals';
import { logger } from '@/lib/logger';
import { subscribeToAnalyticsConsent } from '@/lib/consent/unified-consent-storage';
import {
  hasAnalyticsConsent,
  getAnalyticsGeneration,
  sendOptionalAnalytics,
} from '@/lib/telemetry/optional-analytics-client';
import { getDeviceType, getConnectionType, type DeviceType } from './web-vitals-helpers';

export type MetricName = 'LCP' | 'CLS' | 'INP' | 'TTFB' | 'FCP';
export type MetricRating = 'good' | 'needs-improvement' | 'poor';
export interface WebVitalsEvent {
  name: MetricName;
  value: number;
  rating: MetricRating;
  sessionId: string;
  route: string;
  navigationType: string;
  deviceType: DeviceType;
  connectionType: string;
  timestamp: number;
}

/** Compatibility only: profile creation/viewing permission never authorizes analytics. */
export function setWebVitalsConsent(_profilePermission: unknown): void {
  logger.warn('Web Vitals ignores profile permission; canonical analytics consent is required');
}

let isInitialized = false;

export function initWebVitalsWithConsent(
  _userId: string | null,
  _legacyProfileStore?: unknown,
): () => void {
  if (isInitialized || typeof window === 'undefined') return () => {};
  isInitialized = true;
  let active = true;
  let registeredGeneration: number | null = null;

  const register = (allowed = hasAnalyticsConsent()) => {
    if (!active || !allowed || !hasAnalyticsConsent()) return;
    const generation = getAnalyticsGeneration();
    if (registeredGeneration === generation) return;
    registeredGeneration = generation;
    const sessionId = crypto.randomUUID();

    const handleMetric = (metric: Metric) => {
      // Old observer callbacks remain inert across a refusal/reacceptance boundary.
      if (!active || !hasAnalyticsConsent() || generation !== getAnalyticsGeneration()) return;
      const navigation = performance.getEntriesByType('navigation')[0];
      const event: WebVitalsEvent = {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        sessionId,
        route: window.location.pathname,
        navigationType: navigation && 'type' in navigation ? String(navigation.type) : 'navigate',
        deviceType: getDeviceType(),
        connectionType: getConnectionType(),
        timestamp: Date.now(),
      };
      void sendOptionalAnalytics('/api/metrics/web-vitals', { metrics: [event] }).catch(
        (error: unknown) => {
          logger.warn('Optional Web Vitals request failed', { error: String(error) });
        },
      );
    };
    onCLS(handleMetric);
    onINP(handleMetric);
    onFCP(handleMetric);
    onLCP(handleMetric);
    onTTFB(handleMetric);
  };

  const unsubscribe = subscribeToAnalyticsConsent(register);
  register();
  return () => {
    active = false;
    unsubscribe();
    isInitialized = false;
  };
}

export function initWebVitals(userId: string | null): void {
  initWebVitalsWithConsent(userId);
}

export { onCLS, onINP, onFCP, onLCP, onTTFB };
