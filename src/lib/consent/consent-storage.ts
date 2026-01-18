/**
 * MIRRORBUDDY - Consent Storage
 *
 * Manages cookie/privacy consent in localStorage with API sync.
 * GDPR/COPPA compliant consent tracking.
 *
 * Plan 052: Trial mode consent system
 */

const CONSENT_KEY = "mirrorbuddy-consent";
const CONSENT_VERSION = "1.0";

export interface ConsentData {
  /** Version of consent form accepted */
  version: string;
  /** ISO timestamp when consent was given */
  acceptedAt: string;
  /** Essential cookies (always required) */
  essential: true;
  /** Analytics/telemetry consent */
  analytics: boolean;
  /** Marketing consent (future use) */
  marketing: boolean;
}

/**
 * Check if user has given consent
 */
export function hasConsent(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) return false;

    const consent: ConsentData = JSON.parse(stored);
    // Require re-consent if version changed
    return consent.version === CONSENT_VERSION && consent.essential === true;
  } catch {
    return false;
  }
}

/**
 * Get current consent data
 */
export function getConsent(): ConsentData | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) return null;

    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Save consent to localStorage
 */
export function saveConsent(analytics: boolean = true): ConsentData {
  const consent: ConsentData = {
    version: CONSENT_VERSION,
    acceptedAt: new Date().toISOString(),
    essential: true,
    analytics,
    marketing: false,
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
  }

  return consent;
}

/**
 * Sync consent to server
 */
export async function syncConsentToServer(consent: ConsentData): Promise<void> {
  try {
    await fetch("/api/user/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(consent),
    });
  } catch {
    // Silent fail - localStorage is primary, server is backup
  }
}

/**
 * Clear consent (for testing or user request)
 */
export function clearConsent(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(CONSENT_KEY);
  }
}

/**
 * Check if analytics is enabled
 */
export function hasAnalyticsConsent(): boolean {
  const consent = getConsent();
  return consent?.analytics ?? false;
}
