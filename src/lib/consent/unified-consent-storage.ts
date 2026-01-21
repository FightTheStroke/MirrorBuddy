/**
 * MIRRORBUDDY - Unified Consent Storage
 *
 * DB-first consent management:
 * - Authenticated users: Database is source of truth
 * - Anonymous users: localStorage fallback
 * - Bidirectional sync: DB → localStorage on load, localStorage → DB on save
 *
 * GDPR/COPPA compliant consent tracking.
 */

import { TOS_VERSION } from "@/lib/tos/constants";

const UNIFIED_CONSENT_KEY = "mirrorbuddy-unified-consent";
const UNIFIED_CONSENT_VERSION = "1.0";
const CONSENT_LOADED_KEY = "mirrorbuddy-consent-loaded";

export interface UnifiedConsentData {
  /** Version of this consent structure */
  version: string;
  /** Terms of Service consent */
  tos: {
    accepted: boolean;
    version: string;
    acceptedAt: string;
  };
  /** Cookie consent */
  cookies: {
    essential: true; // Always required
    analytics: boolean;
    acceptedAt: string;
  };
}

/**
 * Check if user has given all required consents (TOS + essential cookies)
 */
export function hasUnifiedConsent(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const stored = localStorage.getItem(UNIFIED_CONSENT_KEY);
    if (!stored) return false;

    const consent: UnifiedConsentData = JSON.parse(stored);

    // Require re-consent if:
    // - Structure version changed
    // - TOS version changed
    // - Either TOS or essential cookies not accepted
    return (
      consent.version === UNIFIED_CONSENT_VERSION &&
      consent.tos.accepted === true &&
      consent.tos.version === TOS_VERSION &&
      consent.cookies.essential === true
    );
  } catch {
    return false;
  }
}

/**
 * Get current unified consent data
 */
export function getUnifiedConsent(): UnifiedConsentData | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(UNIFIED_CONSENT_KEY);
    if (!stored) return null;

    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Save unified consent to localStorage
 */
export function saveUnifiedConsent(
  analytics: boolean = true,
): UnifiedConsentData {
  const now = new Date().toISOString();
  const consent: UnifiedConsentData = {
    version: UNIFIED_CONSENT_VERSION,
    tos: {
      accepted: true,
      version: TOS_VERSION,
      acceptedAt: now,
    },
    cookies: {
      essential: true,
      analytics,
      acceptedAt: now,
    },
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(UNIFIED_CONSENT_KEY, JSON.stringify(consent));

    // Migrate old consent data for backward compatibility
    migrateOldConsent();
  }

  return consent;
}

/**
 * Migrate old consent data (from separate TOS + Cookie storage)
 * This ensures smooth transition without re-prompting users who already consented.
 */
function migrateOldConsent(): void {
  try {
    // Mark old consent keys as migrated
    const oldTosAccepted = sessionStorage.getItem("tos_accepted");
    const oldCookieConsent = localStorage.getItem("mirrorbuddy-consent");

    if (oldTosAccepted === "true") {
      sessionStorage.setItem("tos_migrated", "true");
    }

    if (oldCookieConsent) {
      localStorage.setItem("mirrorbuddy-consent-migrated", "true");
    }
  } catch {
    // Silent fail - migration is best effort
  }
}

/**
 * Sync consent to server (for audit trail)
 */
export async function syncUnifiedConsentToServer(
  consent: UnifiedConsentData,
): Promise<void> {
  try {
    // Sync TOS acceptance
    await fetch("/api/tos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        version: consent.tos.version,
      }),
    });

    // Sync cookie consent
    await fetch("/api/user/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        version: consent.version,
        acceptedAt: consent.cookies.acceptedAt,
        essential: consent.cookies.essential,
        analytics: consent.cookies.analytics,
        marketing: false,
      }),
    });
  } catch {
    // Silent fail - localStorage is primary, server is backup
  }
}

/**
 * Clear unified consent (for testing or user revocation)
 */
export function clearUnifiedConsent(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(UNIFIED_CONSENT_KEY);
    // Also clear old consent keys to force re-consent
    sessionStorage.removeItem("tos_accepted");
    sessionStorage.removeItem("tos_accepted_version");
    localStorage.removeItem("mirrorbuddy-consent");
  }
}

/**
 * Check if analytics is enabled
 */
export function hasAnalyticsConsent(): boolean {
  const consent = getUnifiedConsent();
  return consent?.cookies.analytics ?? false;
}

/**
 * Check if user needs to re-consent (TOS version changed)
 */
export function needsReconsent(): boolean {
  const consent = getUnifiedConsent();
  if (!consent) return false;

  // Check if TOS version changed since last acceptance
  return consent.tos.version !== TOS_VERSION;
}

/**
 * Load unified consent from database (for authenticated users)
 * Returns null if not authenticated or no consent found
 */
export async function loadUnifiedConsentFromDB(): Promise<UnifiedConsentData | null> {
  try {
    // Load TOS acceptance
    const tosResponse = await fetch("/api/tos", {
      method: "GET",
      credentials: "include",
    });

    // If 401, user is not authenticated
    if (tosResponse.status === 401) {
      return null;
    }

    if (!tosResponse.ok) {
      throw new Error(`Failed to load TOS: ${tosResponse.status}`);
    }

    const tosData = await tosResponse.json();

    // Load cookie consent
    const cookieResponse = await fetch("/api/user/consent", {
      method: "GET",
      credentials: "include",
    });

    if (!cookieResponse.ok) {
      throw new Error(
        `Failed to load cookie consent: ${cookieResponse.status}`,
      );
    }

    const cookieData = await cookieResponse.json();

    // Construct unified consent from DB data
    const consent: UnifiedConsentData = {
      version: UNIFIED_CONSENT_VERSION,
      tos: {
        accepted: tosData.accepted === true,
        version: tosData.version || TOS_VERSION,
        acceptedAt: tosData.acceptedAt || new Date().toISOString(),
      },
      cookies: {
        essential: true,
        analytics: cookieData.analytics || false,
        acceptedAt: cookieData.acceptedAt || new Date().toISOString(),
      },
    };

    // Cache in localStorage for offline access
    if (typeof window !== "undefined") {
      localStorage.setItem(UNIFIED_CONSENT_KEY, JSON.stringify(consent));
      sessionStorage.setItem(CONSENT_LOADED_KEY, "true");
    }

    return consent;
  } catch (error) {
    console.error("Failed to load consent from DB:", error);
    // Fallback to localStorage
    return getUnifiedConsent();
  }
}

/**
 * Initialize consent on app load (DB-first)
 * Call this once when the app mounts
 */
export async function initializeConsent(): Promise<boolean> {
  // Check if already loaded in this session
  if (typeof window !== "undefined") {
    const loaded = sessionStorage.getItem(CONSENT_LOADED_KEY);
    if (loaded === "true") {
      // Already loaded, use localStorage cache
      return hasUnifiedConsent();
    }
  }

  // Try to load from DB (for authenticated users)
  const dbConsent = await loadUnifiedConsentFromDB();

  if (dbConsent) {
    // DB returned consent, check if valid
    return (
      dbConsent.tos.accepted &&
      dbConsent.tos.version === TOS_VERSION &&
      dbConsent.cookies.essential === true
    );
  }

  // No DB consent (anonymous or error), check localStorage
  return hasUnifiedConsent();
}

/**
 * Mark consent as loaded from DB (to avoid redundant fetches)
 */
export function markConsentLoaded(): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(CONSENT_LOADED_KEY, "true");
  }
}

/**
 * Check if consent was loaded in this session
 */
export function isConsentLoaded(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(CONSENT_LOADED_KEY) === "true";
}
