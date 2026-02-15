/**
 * MIRRORBUDDY - Unified Consent Service
 *
 * Consolidates all consent types (TOS, cookies, trial) under single domain contract.
 * Feature flag: consent_unified_model
 *
 * ADR TBD: Consent Service Unification
 * F-02: GDPR/COPPA compliance with single source of truth
 *
 * Migration Strategy:
 * 1. Legacy keys (mirrorbuddy-consent, mirrorbuddy-trial-consent) read during migration
 * 2. Unified storage (mirrorbuddy-unified-consent) becomes source of truth
 * 3. Legacy keys marked as migrated after successful read
 * 4. All new writes go to unified storage only
 */

import { TOS_VERSION } from '@/lib/tos/constants';
import { isFeatureEnabled } from '@/lib/feature-flags/feature-flags-service';

// =============================================================================
// CONSTANTS
// =============================================================================

const UNIFIED_CONSENT_KEY = 'mirrorbuddy-unified-consent';
const LEGACY_CONSENT_KEY = 'mirrorbuddy-consent';
const LEGACY_TRIAL_CONSENT_KEY = 'trialConsent';
const CONSENT_VERSION = '1.0';
const CONSENT_LOADED_KEY = 'mirrorbuddy-consent-loaded';

// Migration tracking
const LEGACY_CONSENT_MIGRATED_KEY = 'mirrorbuddy-consent-migrated';
const LEGACY_TRIAL_MIGRATED_KEY = 'mirrorbuddy-trial-migrated';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Unified consent data structure
 * Replaces separate TOS, cookie, and trial consent tracking
 */
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
    marketing: boolean;
    acceptedAt: string;
  };

  /** Trial consent (for anonymous users) */
  trial?: {
    accepted: boolean;
    acceptedAt: string;
  };
}

/**
 * Legacy consent data (from consent-storage.ts)
 */
interface LegacyConsentData {
  version: string;
  acceptedAt: string;
  essential: true;
  analytics: boolean;
  marketing: boolean;
}

/**
 * Legacy trial consent data (from trial-consent.ts)
 */
interface LegacyTrialConsentData {
  accepted: boolean;
  version: string;
  acceptedAt: string;
}

// =============================================================================
// CONSENT SERVICE (UNIFIED MODEL)
// =============================================================================

/**
 * Check if unified consent model is enabled
 */
function isUnifiedModelEnabled(): boolean {
  const result = isFeatureEnabled('consent_unified_model');
  return result.enabled;
}

/**
 * Check if user has given all required consents
 * Uses unified model if enabled, otherwise falls back to legacy
 */
export function hasConsent(): boolean {
  if (typeof window === 'undefined') return false;

  if (isUnifiedModelEnabled()) {
    return hasUnifiedConsent();
  }

  // Legacy fallback
  return hasLegacyConsent();
}

/**
 * Get current consent data
 * Uses unified model if enabled, otherwise falls back to legacy
 */
export function getConsent(): UnifiedConsentData | LegacyConsentData | null {
  if (typeof window === 'undefined') return null;

  if (isUnifiedModelEnabled()) {
    return getUnifiedConsent();
  }

  // Legacy fallback
  return getLegacyConsent();
}

/**
 * Save consent
 * Uses unified model if enabled, otherwise falls back to legacy
 */
export function saveConsent(
  analytics: boolean = true,
  trial: boolean = false,
): UnifiedConsentData | LegacyConsentData {
  if (isUnifiedModelEnabled()) {
    return saveUnifiedConsent(analytics, trial);
  }

  // Legacy fallback
  return saveLegacyConsent(analytics);
}

/**
 * Clear all consent data
 */
export function clearConsent(): void {
  if (typeof window === 'undefined') return;

  // Clear unified storage
  localStorage.removeItem(UNIFIED_CONSENT_KEY);

  // Clear legacy storage
  localStorage.removeItem(LEGACY_CONSENT_KEY);
  localStorage.removeItem(LEGACY_TRIAL_CONSENT_KEY);
  sessionStorage.removeItem('tos_accepted');
  sessionStorage.removeItem('tos_accepted_version');

  // Clear migration markers
  localStorage.removeItem(LEGACY_CONSENT_MIGRATED_KEY);
  localStorage.removeItem(LEGACY_TRIAL_MIGRATED_KEY);
  sessionStorage.removeItem(CONSENT_LOADED_KEY);
}

/**
 * Check if analytics is enabled
 */
export function hasAnalyticsConsent(): boolean {
  const consent = getConsent();
  if (!consent) return false;

  if ('cookies' in consent && typeof consent.cookies === 'object') {
    // Unified model
    return (consent as UnifiedConsentData).cookies.analytics;
  }

  // Legacy model
  return (consent as LegacyConsentData).analytics ?? false;
}

// =============================================================================
// UNIFIED MODEL IMPLEMENTATION
// =============================================================================

/**
 * Check if user has given unified consent
 */
function hasUnifiedConsent(): boolean {
  try {
    const stored = localStorage.getItem(UNIFIED_CONSENT_KEY);
    if (!stored) {
      // Try migrating from legacy
      const migrated = migrateFromLegacy();
      if (migrated) {
        return hasUnifiedConsent(); // Retry after migration
      }
      return false;
    }

    const consent: UnifiedConsentData = JSON.parse(stored);

    // Require re-consent if:
    // - Structure version changed
    // - TOS version changed
    // - Essential cookies not accepted
    return (
      consent.version === CONSENT_VERSION &&
      consent.tos.accepted === true &&
      consent.tos.version === TOS_VERSION &&
      consent.cookies.essential === true
    );
  } catch {
    return false;
  }
}

/**
 * Get unified consent data
 */
function getUnifiedConsent(): UnifiedConsentData | null {
  try {
    const stored = localStorage.getItem(UNIFIED_CONSENT_KEY);
    if (!stored) {
      // Try migrating from legacy
      const migrated = migrateFromLegacy();
      return migrated;
    }

    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Save unified consent
 */
function saveUnifiedConsent(analytics: boolean = true, trial: boolean = false): UnifiedConsentData {
  const now = new Date().toISOString();
  const consent: UnifiedConsentData = {
    version: CONSENT_VERSION,
    tos: {
      accepted: true,
      version: TOS_VERSION,
      acceptedAt: now,
    },
    cookies: {
      essential: true,
      analytics,
      marketing: false,
      acceptedAt: now,
    },
  };

  // Add trial consent if requested
  if (trial) {
    consent.trial = {
      accepted: true,
      acceptedAt: now,
    };
  }

  localStorage.setItem(UNIFIED_CONSENT_KEY, JSON.stringify(consent));

  // Mark legacy data as migrated
  markLegacyMigrated();

  return consent;
}

// =============================================================================
// LEGACY MODEL IMPLEMENTATION (FALLBACK)
// =============================================================================

/**
 * Check if user has legacy consent
 */
function hasLegacyConsent(): boolean {
  try {
    const stored = localStorage.getItem(LEGACY_CONSENT_KEY);
    if (!stored) return false;

    const consent: LegacyConsentData = JSON.parse(stored);
    return consent.essential === true;
  } catch {
    return false;
  }
}

/**
 * Get legacy consent data
 */
function getLegacyConsent(): LegacyConsentData | null {
  try {
    const stored = localStorage.getItem(LEGACY_CONSENT_KEY);
    if (!stored) return null;

    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Save legacy consent
 */
function saveLegacyConsent(analytics: boolean = true): LegacyConsentData {
  const consent: LegacyConsentData = {
    version: CONSENT_VERSION,
    acceptedAt: new Date().toISOString(),
    essential: true,
    analytics,
    marketing: false,
  };

  localStorage.setItem(LEGACY_CONSENT_KEY, JSON.stringify(consent));
  return consent;
}

// =============================================================================
// MIGRATION UTILITIES
// =============================================================================

/**
 * Migrate from legacy consent keys to unified model
 * Returns migrated data if successful, null otherwise
 */
function migrateFromLegacy(): UnifiedConsentData | null {
  try {
    // Check if already migrated
    const alreadyMigrated = localStorage.getItem(LEGACY_CONSENT_MIGRATED_KEY);
    if (alreadyMigrated === 'true') {
      return null; // Already migrated, no legacy data available
    }

    // Read legacy consent
    const legacyConsentStr = localStorage.getItem(LEGACY_CONSENT_KEY);
    const legacyTrialStr = localStorage.getItem(LEGACY_TRIAL_CONSENT_KEY);

    if (!legacyConsentStr && !legacyTrialStr) {
      // No legacy data to migrate
      return null;
    }

    const now = new Date().toISOString();
    const unified: UnifiedConsentData = {
      version: CONSENT_VERSION,
      tos: {
        accepted: false,
        version: TOS_VERSION,
        acceptedAt: now,
      },
      cookies: {
        essential: true,
        analytics: false,
        marketing: false,
        acceptedAt: now,
      },
    };

    // Migrate cookie consent
    if (legacyConsentStr) {
      try {
        const legacyConsent: LegacyConsentData = JSON.parse(legacyConsentStr);
        unified.cookies.analytics = legacyConsent.analytics ?? false;
        unified.cookies.marketing = legacyConsent.marketing ?? false;
        unified.cookies.acceptedAt = legacyConsent.acceptedAt || now;
      } catch {
        // Invalid legacy consent, skip
      }
    }

    // Migrate trial consent
    if (legacyTrialStr) {
      try {
        const legacyTrial: LegacyTrialConsentData = JSON.parse(legacyTrialStr);
        if (legacyTrial.accepted) {
          unified.trial = {
            accepted: true,
            acceptedAt: legacyTrial.acceptedAt || now,
          };
          // Trial users implicitly accepted TOS
          unified.tos.accepted = true;
          unified.tos.acceptedAt = legacyTrial.acceptedAt || now;
        }
      } catch {
        // Invalid legacy trial consent, skip
      }
    }

    // Check sessionStorage for TOS acceptance
    const tosAccepted = sessionStorage.getItem('tos_accepted');
    if (tosAccepted === 'true') {
      unified.tos.accepted = true;
      const tosVersion = sessionStorage.getItem('tos_accepted_version');
      if (tosVersion) {
        unified.tos.version = tosVersion;
      }
    }

    // Save migrated data
    localStorage.setItem(UNIFIED_CONSENT_KEY, JSON.stringify(unified));

    // Mark migration complete
    markLegacyMigrated();

    return unified;
  } catch {
    // Migration failed, return null
    return null;
  }
}

/**
 * Mark legacy consent as migrated
 */
function markLegacyMigrated(): void {
  localStorage.setItem(LEGACY_CONSENT_MIGRATED_KEY, 'true');
  localStorage.setItem(LEGACY_TRIAL_MIGRATED_KEY, 'true');
  sessionStorage.setItem('tos_migrated', 'true');
}

/**
 * Check if legacy consent has been migrated
 */
export function isLegacyMigrated(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(LEGACY_CONSENT_MIGRATED_KEY) === 'true';
}

// =============================================================================
// SERVER SYNC
// =============================================================================

/**
 * Sync consent to server (for audit trail)
 * Uses csrfFetch for CSRF protection
 */
export async function syncConsentToServer(
  consent: UnifiedConsentData | LegacyConsentData,
): Promise<void> {
  try {
    // Dynamic import to avoid SSR issues
    const { csrfFetch } = await import('@/lib/auth');

    // Sync TOS acceptance (if unified model)
    if ('tos' in consent && typeof consent.tos === 'object') {
      const unified = consent as UnifiedConsentData;
      await csrfFetch('/api/tos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: unified.tos.version,
        }),
      });
    }

    // Sync cookie consent
    const cookieData =
      'cookies' in consent && typeof consent.cookies === 'object'
        ? (consent as UnifiedConsentData).cookies
        : (consent as LegacyConsentData);

    await csrfFetch('/api/user/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version: (consent as UnifiedConsentData).version || CONSENT_VERSION,
        acceptedAt: cookieData.acceptedAt,
        essential: cookieData.essential,
        analytics: cookieData.analytics,
        marketing: cookieData.marketing ?? false,
      }),
    });
  } catch {
    // Silent fail - localStorage is primary, server is backup
  }
}

/**
 * Load consent from database (for authenticated users)
 */
export async function loadConsentFromDB(): Promise<UnifiedConsentData | null> {
  try {
    // Check if already loaded this session
    if (sessionStorage.getItem(CONSENT_LOADED_KEY) === 'true') {
      return getUnifiedConsent();
    }

    // Load TOS acceptance
    const tosResponse = await fetch('/api/tos', {
      method: 'GET',
      credentials: 'include',
    });

    if (tosResponse.status === 401) {
      // Not authenticated
      return null;
    }

    if (!tosResponse.ok) {
      throw new Error(`Failed to load TOS: ${tosResponse.status}`);
    }

    const tosData = await tosResponse.json();

    // Load cookie consent
    const cookieResponse = await fetch('/api/user/consent', {
      method: 'GET',
      credentials: 'include',
    });

    if (!cookieResponse.ok) {
      throw new Error(`Failed to load cookie consent: ${cookieResponse.status}`);
    }

    const cookieData = await cookieResponse.json();

    // Construct unified consent from DB data
    const consent: UnifiedConsentData = {
      version: CONSENT_VERSION,
      tos: {
        accepted: tosData.accepted === true,
        version: tosData.version || TOS_VERSION,
        acceptedAt: tosData.acceptedAt || new Date().toISOString(),
      },
      cookies: {
        essential: true,
        analytics: cookieData.analytics || false,
        marketing: cookieData.marketing || false,
        acceptedAt: cookieData.acceptedAt || new Date().toISOString(),
      },
    };

    // Cache in localStorage
    localStorage.setItem(UNIFIED_CONSENT_KEY, JSON.stringify(consent));
    sessionStorage.setItem(CONSENT_LOADED_KEY, 'true');

    return consent;
  } catch {
    // Failed to load from DB, fallback to localStorage
    return getUnifiedConsent();
  }
}

/**
 * Initialize consent on app load (DB-first for authenticated users)
 */
export async function initializeConsent(): Promise<boolean> {
  // Check if already loaded this session
  if (sessionStorage.getItem(CONSENT_LOADED_KEY) === 'true') {
    return hasConsent();
  }

  // Try to load from DB (for authenticated users)
  const dbConsent = await loadConsentFromDB();

  if (dbConsent) {
    return (
      dbConsent.tos.accepted &&
      dbConsent.tos.version === TOS_VERSION &&
      dbConsent.cookies.essential === true
    );
  }

  // No DB consent, check localStorage
  return hasConsent();
}
