/**
 * Consent Store - External store for consent state (DB-first)
 *
 * Shared between UnifiedConsentWall and other consent components.
 * Uses useSyncExternalStore pattern to avoid setState-in-effect issues.
 *
 * DB-first approach:
 * 1. Initialize from DB on app mount
 * 2. Cache in localStorage for offline/fast access
 * 3. Sync changes back to DB
 */

import {
  hasUnifiedConsent,
  initializeConsent,
  isConsentLoaded,
} from "./unified-consent-storage";

// External store for consent state
const consentSubscribers = new Set<() => void>();
let consentSnapshot: boolean | null = null;
let consentInitialized = false;

/**
 * Subscribe to consent changes
 */
export function subscribeToConsent(callback: () => void) {
  consentSubscribers.add(callback);
  return () => consentSubscribers.delete(callback);
}

/**
 * Get current consent snapshot (client-side)
 * Lazy initialization from DB on first call
 */
export function getConsentSnapshot() {
  // Initialize snapshot on first call
  if (consentSnapshot === null) {
    // Check if already loaded from DB in this session
    if (isConsentLoaded()) {
      consentSnapshot = hasUnifiedConsent();
    } else {
      // Not yet loaded - trigger async initialization but return false for now
      // The UnifiedConsentWall will handle the async load
      consentSnapshot = false;

      // Trigger initialization in background
      if (!consentInitialized) {
        consentInitialized = true;
        initializeConsent().then((hasConsent) => {
          updateConsentSnapshot(hasConsent);
        });
      }
    }
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

/**
 * Reset consent state (for testing or logout)
 */
export function resetConsentSnapshot() {
  consentSnapshot = null;
  consentInitialized = false;
}
