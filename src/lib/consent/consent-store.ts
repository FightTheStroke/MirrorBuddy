/**
 * Consent Store - External store for consent state
 *
 * Shared between CookieConsentWall and InlineConsent components.
 * Uses useSyncExternalStore pattern to avoid setState-in-effect issues.
 */

import { hasConsent } from "./consent-storage";

// External store for consent state
const consentSubscribers = new Set<() => void>();
let consentSnapshot: boolean | null = null;

/**
 * Subscribe to consent changes
 */
export function subscribeToConsent(callback: () => void) {
  consentSubscribers.add(callback);
  return () => consentSubscribers.delete(callback);
}

/**
 * Get current consent snapshot (client-side)
 */
export function getConsentSnapshot() {
  // Initialize snapshot on first call (lazy)
  if (consentSnapshot === null) {
    consentSnapshot = hasConsent();
  }
  return consentSnapshot;
}

/**
 * Get consent snapshot for server-side rendering
 */
export function getServerConsentSnapshot() {
  return false; // Server-side, assume no consent
}

/**
 * Update consent state and notify all subscribers
 */
export function updateConsentSnapshot(consented: boolean) {
  consentSnapshot = consented;
  consentSubscribers.forEach((cb) => cb());
}
