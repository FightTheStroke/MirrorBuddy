// ============================================================================
// Transport Network Listeners
// Browser online/offline event handling
// ============================================================================

'use client';

import { logger } from '@/lib/logger';
import { invalidateCache } from './transport-selector';

/**
 * Setup online event handler
 */
export function createOnlineHandler(
  onNetworkChange: () => void
): () => void {
  return () => {
    logger.info('[TransportMonitor] Network online detected');
    invalidateCache();
    onNetworkChange();
  };
}

/**
 * Setup offline event handler
 */
export function createOfflineHandler(): () => void {
  return () => {
    logger.info('[TransportMonitor] Network offline detected');
    // Just log, don't emit degradation (nothing we can do while offline)
  };
}

/**
 * Bind network event listeners
 */
export function bindNetworkListeners(
  onlineHandler: () => void,
  offlineHandler: () => void
): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('online', onlineHandler);
  window.addEventListener('offline', offlineHandler);
}

/**
 * Unbind network event listeners
 */
export function unbindNetworkListeners(
  onlineHandler: () => void,
  offlineHandler: () => void
): void {
  if (typeof window === 'undefined') return;

  window.removeEventListener('online', onlineHandler);
  window.removeEventListener('offline', offlineHandler);
}
