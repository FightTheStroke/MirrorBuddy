// ============================================================================
// Transport Monitor Singleton
// Module-level singleton instance management
// ============================================================================

'use client';

import { TransportMonitor } from './transport-monitor';

let monitorInstance: TransportMonitor | null = null;

/**
 * Get the singleton TransportMonitor instance
 */
export function getTransportMonitor(): TransportMonitor {
  if (!monitorInstance) {
    monitorInstance = new TransportMonitor();
  }
  return monitorInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetTransportMonitor(): void {
  if (monitorInstance) {
    monitorInstance.destroy();
    monitorInstance = null;
  }
}
