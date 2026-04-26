/**
 * MIRRORBUDDY - Trial Consent Helpers
 *
 * Helper functions for trial-specific GDPR consent.
 * Integrates with unified consent storage system.
 *
 * F-02: GDPR consent gate blocks trial activation until explicit consent
 */

import {
  getUnifiedConsent,
  saveUnifiedConsent,
} from "./unified-consent-storage";

const TRIAL_CONSENT_KEY = "trialConsent";
const TRIAL_CONSENT_VERSION = "1.0";

export interface TrialConsentData {
  accepted: boolean;
  version: string;
  acceptedAt: string;
}

/**
 * Check if user has given trial consent
 * Uses unified consent system as source of truth
 */
export function hasTrialConsent(): boolean {
  if (typeof window === "undefined") return false;

  try {
    // First check unified consent system
    const unifiedConsent = getUnifiedConsent();
    if (unifiedConsent) {
      // Trial consent is implicit if unified consent is given
      // (unified consent = TOS + essential cookies)
      return true;
    }

    // Fallback: check trial-specific consent in localStorage
    const stored = localStorage.getItem(TRIAL_CONSENT_KEY);
    if (!stored) return false;

    const consent: TrialConsentData = JSON.parse(stored);

    // Require re-consent if version changed
    return (
      consent.accepted === true && consent.version === TRIAL_CONSENT_VERSION
    );
  } catch {
    return false;
  }
}

/**
 * Store trial consent
 * This saves to both unified consent system and trial-specific storage
 */
export function setTrialConsent(): void {
  if (typeof window === "undefined") return;

  const now = new Date().toISOString();

  // Save trial-specific consent
  const trialConsent: TrialConsentData = {
    accepted: true,
    version: TRIAL_CONSENT_VERSION,
    acceptedAt: now,
  };

  localStorage.setItem(TRIAL_CONSENT_KEY, JSON.stringify(trialConsent));

  // Also save to unified consent system
  // (this ensures we meet GDPR requirements for trial users)
  saveUnifiedConsent(false); // Analytics disabled for trial users by default
}

/**
 * Clear trial consent (for testing or revocation)
 */
export function clearTrialConsent(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TRIAL_CONSENT_KEY);
}

/**
 * Get current trial consent data
 */
export function getTrialConsent(): TrialConsentData | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(TRIAL_CONSENT_KEY);
    if (!stored) return null;

    return JSON.parse(stored);
  } catch {
    return null;
  }
}
