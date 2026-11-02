// ============================================================================
// OFFLINE SERVICE WORKER REGISTRATION
// Task T2-03: PWA offline support
// Separate from push notification registration - handles offline caching only
// ============================================================================

import { logger } from '@/lib/logger';
import { retryNetworkRead } from '@/lib/resilience/network-read';

/**
 * Check if service workers are supported in the current environment.
 */
function isServiceWorkerSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    typeof navigator.serviceWorker?.register === 'function' &&
    'caches' in window &&
    window.isSecureContext
  );
}

/**
 * Register the service worker for offline support.
 * This is separate from push notification subscription.
 * Should be called early in app initialization for immediate offline caching.
 *
 * @returns Promise<boolean> - true if registration successful or already registered
 */
export async function registerOfflineServiceWorker(): Promise<boolean> {
  // Skip in SSR or unsupported browsers
  if (!isServiceWorkerSupported()) {
    logger.debug('[Offline SW] Service workers not supported');
    return false;
  }

  try {
    const registration = await retryNetworkRead(() =>
      navigator.serviceWorker.register('/sw.js', { scope: '/' }),
    );

    if (!registration) {
      logger.warn('[Offline SW] Registration unavailable');
      return false;
    }

    logger.info('[Offline SW] Registered successfully', {
      scope: registration.scope,
    });

    return true;
  } catch (error) {
    const errorName =
      error instanceof Error || error instanceof DOMException ? error.name : 'UnknownError';
    // The browser refuses service workers by policy (private browsing, blocked site data):
    // a user setting, not a fault. Network and programming failures stay reported.
    if (error instanceof DOMException && error.name === 'SecurityError') {
      logger.debug('[Offline SW] Registration blocked by the browser', { errorName });
    } else {
      logger.warn('[Offline SW] Registration failed', { errorName });
    }
    return false;
  }
}
