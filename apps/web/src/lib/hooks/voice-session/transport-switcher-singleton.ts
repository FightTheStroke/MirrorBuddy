// ============================================================================
// Transport Switcher Singleton
// Module-level singleton instance management
// ============================================================================

'use client';

import { TransportSwitcher } from './transport-switcher';

let switcherInstance: TransportSwitcher | null = null;

/**
 * Get the singleton TransportSwitcher instance
 */
export function getTransportSwitcher(): TransportSwitcher {
  if (!switcherInstance) {
    switcherInstance = new TransportSwitcher();
  }
  return switcherInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetTransportSwitcher(): void {
  if (switcherInstance) {
    switcherInstance.destroy();
    switcherInstance = null;
  }
}
