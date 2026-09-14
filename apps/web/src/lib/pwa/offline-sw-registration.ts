// ============================================================================
// OFFLINE SERVICE WORKER REGISTRATION
// Task T2-03: PWA offline support
// Separate from push notification registration - handles offline caching only
// ============================================================================

import { logger } from '@/lib/logger';

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
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    if (!registration) {
      logger.warn('[Offline SW] Registration unavailable');
      return false;
    }

    logger.info('[Offline SW] Registered successfully', {
      scope: registration.scope,
    });

    return true;
  } catch (error) {
    logger.error('[Offline SW] Registration failed', undefined, error);
    return false;
  }
}
