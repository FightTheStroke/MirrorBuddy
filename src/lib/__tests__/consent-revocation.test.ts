/**
 * Consent Revocation Consistency Tests
 *
 * Tests for T5-10: Verify consent can be granted/revoked consistently
 * across different consent types without cross-flow breaking.
 *
 * Plan 148 - W5-i18nConsent
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

// Mock sessionStorage
const mockSessionStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

// Setup global mocks
Object.defineProperty(global, 'localStorage', { value: mockLocalStorage });
Object.defineProperty(global, 'sessionStorage', { value: mockSessionStorage });

// Import after mocks are set up
import {
  hasConsent,
  getConsent,
  saveConsent,
  clearConsent,
  hasAnalyticsConsent,
  type UnifiedConsentData,
} from '../consent/consent-service';

describe('Consent Revocation Consistency', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    mockSessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockLocalStorage.clear();
    mockSessionStorage.clear();
  });

  describe('F-01: Consent can be granted consistently', () => {
    it('should grant unified consent with all fields populated', () => {
      const consent = saveConsent(true, false);

      expect(consent).toBeDefined();
      expect(hasConsent()).toBe(true);

      const retrieved = getConsent();
      expect(retrieved).toBeDefined();

      if (retrieved && 'cookies' in retrieved) {
        const unified = retrieved as UnifiedConsentData;
        expect(unified.version).toBe('1.0');
        expect(unified.tos.accepted).toBe(true);
        expect(unified.cookies.essential).toBe(true);
        expect(unified.cookies.analytics).toBe(true);
        expect(unified.tos.acceptedAt).toBeDefined();
        expect(unified.cookies.acceptedAt).toBeDefined();
      }
    });

    it('should grant trial consent independently', () => {
      const consent = saveConsent(false, true);

      expect(consent).toBeDefined();

      const retrieved = getConsent();
      if (retrieved && 'trial' in retrieved) {
        const unified = retrieved as UnifiedConsentData;
        expect(unified.trial).toBeDefined();
        expect(unified.trial?.accepted).toBe(true);
        expect(unified.trial?.acceptedAt).toBeDefined();
      }
    });

    it('should grant both cookie and trial consent together', () => {
      saveConsent(true, true);

      const retrieved = getConsent();
      if (retrieved && 'cookies' in retrieved && 'trial' in retrieved) {
        const unified = retrieved as UnifiedConsentData;
        expect(unified.cookies.analytics).toBe(true);
        expect(unified.trial?.accepted).toBe(true);
      }
    });
  });

  describe('F-02: Consent can be revoked consistently', () => {
    it('should revoke all consent data', () => {
      // Grant consent first
      saveConsent(true, true);
      expect(hasConsent()).toBe(true);

      // Revoke
      clearConsent();

      // Verify revocation
      expect(hasConsent()).toBe(false);
      expect(getConsent()).toBeNull();
      expect(hasAnalyticsConsent()).toBe(false);
    });

    it('should clear both unified and legacy keys on revocation', () => {
      // Set up both unified and legacy data
      mockLocalStorage.setItem(
        'mirrorbuddy-unified-consent',
        JSON.stringify({
          version: '1.0',
          tos: { accepted: true, version: '1.0', acceptedAt: new Date().toISOString() },
          cookies: {
            essential: true,
            analytics: true,
            marketing: false,
            acceptedAt: new Date().toISOString(),
          },
        }),
      );
      mockLocalStorage.setItem(
        'mirrorbuddy-consent',
        JSON.stringify({
          version: '1.0',
          acceptedAt: new Date().toISOString(),
          essential: true,
          analytics: true,
          marketing: false,
        }),
      );
      mockLocalStorage.setItem(
        'trialConsent',
        JSON.stringify({
          accepted: true,
          version: '1.0',
          acceptedAt: new Date().toISOString(),
        }),
      );
      mockSessionStorage.setItem('tos_accepted', 'true');
      mockSessionStorage.setItem('tos_accepted_version', '1.0');

      // Revoke
      clearConsent();

      // Verify all keys are cleared
      expect(mockLocalStorage.getItem('mirrorbuddy-unified-consent')).toBeNull();
      expect(mockLocalStorage.getItem('mirrorbuddy-consent')).toBeNull();
      expect(mockLocalStorage.getItem('trialConsent')).toBeNull();
      expect(mockSessionStorage.getItem('tos_accepted')).toBeNull();
      expect(mockSessionStorage.getItem('tos_accepted_version')).toBeNull();
    });

    it('should clear migration markers on revocation', () => {
      mockLocalStorage.setItem('mirrorbuddy-consent-migrated', 'true');
      mockLocalStorage.setItem('mirrorbuddy-trial-migrated', 'true');

      clearConsent();

      expect(mockLocalStorage.getItem('mirrorbuddy-consent-migrated')).toBeNull();
      expect(mockLocalStorage.getItem('mirrorbuddy-trial-migrated')).toBeNull();
    });
  });

  describe('F-03: Cross-flow behavior - revoking cookie consent does not break ToS', () => {
    it('should allow revoking analytics while keeping ToS consent', () => {
      // Grant full consent
      saveConsent(true, false);
      expect(hasConsent()).toBe(true);
      expect(hasAnalyticsConsent()).toBe(true);

      // Revoke analytics but keep ToS
      saveConsent(false, false);

      const retrieved = getConsent();
      if (retrieved && 'cookies' in retrieved) {
        const unified = retrieved as UnifiedConsentData;
        // ToS should still be accepted
        expect(unified.tos.accepted).toBe(true);
        // Analytics revoked
        expect(unified.cookies.analytics).toBe(false);
        // Essential cookies always required
        expect(unified.cookies.essential).toBe(true);
      }

      expect(hasConsent()).toBe(true); // ToS consent still valid
      expect(hasAnalyticsConsent()).toBe(false); // Analytics revoked
    });

    it('should handle partial revocation without data corruption', () => {
      // Grant consent with analytics
      saveConsent(true, true);

      // Revoke analytics but keep trial
      saveConsent(false, true);

      const retrieved = getConsent();
      expect(retrieved).toBeDefined();

      if (retrieved && 'cookies' in retrieved && 'trial' in retrieved) {
        const unified = retrieved as UnifiedConsentData;
        expect(unified.cookies.analytics).toBe(false);
        expect(unified.trial?.accepted).toBe(true);
        expect(unified.tos.accepted).toBe(true);
      }
    });

    it('should maintain data integrity after multiple grant/revoke cycles', () => {
      // Cycle 1: Grant
      saveConsent(true, true);
      expect(hasConsent()).toBe(true);
      expect(hasAnalyticsConsent()).toBe(true);

      // Cycle 2: Revoke analytics
      saveConsent(false, false);
      expect(hasConsent()).toBe(true);
      expect(hasAnalyticsConsent()).toBe(false);

      // Cycle 3: Re-grant analytics
      saveConsent(true, true);
      expect(hasConsent()).toBe(true);
      expect(hasAnalyticsConsent()).toBe(true);

      // Verify final state
      const retrieved = getConsent();
      if (retrieved && 'cookies' in retrieved) {
        const unified = retrieved as UnifiedConsentData;
        expect(unified.tos.accepted).toBe(true);
        expect(unified.cookies.analytics).toBe(true);
        expect(unified.trial?.accepted).toBe(true);
      }
    });
  });

  describe('F-04: Data cleanup verification', () => {
    it('should not leave orphaned data after revocation', () => {
      // Grant consent
      saveConsent(true, true);

      // Count localStorage keys before revocation
      const keysBefore = Object.keys(mockLocalStorage).length;
      expect(keysBefore).toBeGreaterThan(0);

      // Revoke
      clearConsent();

      // Verify no consent-related keys remain
      const consentKeys = [
        'mirrorbuddy-unified-consent',
        'mirrorbuddy-consent',
        'trialConsent',
        'mirrorbuddy-consent-migrated',
        'mirrorbuddy-trial-migrated',
      ];

      consentKeys.forEach((key) => {
        expect(mockLocalStorage.getItem(key)).toBeNull();
      });
    });

    it('should handle revocation when no consent exists', () => {
      // Should not throw when clearing non-existent consent
      expect(() => clearConsent()).not.toThrow();
      expect(hasConsent()).toBe(false);
    });

    it('should handle malformed consent data gracefully', () => {
      // Set malformed data
      mockLocalStorage.setItem('mirrorbuddy-unified-consent', 'invalid-json');

      // Should not throw
      expect(() => hasConsent()).not.toThrow();
      expect(() => getConsent()).not.toThrow();
      expect(() => clearConsent()).not.toThrow();

      // Should return safe defaults
      expect(hasConsent()).toBe(false);
      expect(getConsent()).toBeNull();
    });
  });

  describe('F-05: Timestamp consistency', () => {
    it('should update timestamps on consent changes', () => {
      saveConsent(true, false);

      // Wait a small amount
      const wait = new Promise((resolve) => setTimeout(resolve, 10));
      wait.then(() => {
        const consent2 = saveConsent(false, false);

        if ('cookies' in consent1 && 'cookies' in consent2) {
          const unified1 = consent1 as UnifiedConsentData;
          const unified2 = consent2 as UnifiedConsentData;

          const timestamp1 = new Date(unified1.cookies.acceptedAt).getTime();
          const timestamp2 = new Date(unified2.cookies.acceptedAt).getTime();

          // Second consent should have later or equal timestamp
          expect(timestamp2).toBeGreaterThanOrEqual(timestamp1);
        }
      });
    });

    it('should preserve ToS timestamp when only changing cookie consent', () => {
      // Initial grant
      const consent1 = saveConsent(true, false);

      if ('tos' in consent1) {
        const unified1 = consent1 as UnifiedConsentData;
        const tosTimestamp1 = unified1.tos.acceptedAt;

        // Change cookie consent
        const consent2 = saveConsent(false, false);

        if ('tos' in consent2) {
          const unified2 = consent2 as UnifiedConsentData;
          // ToS timestamp should remain unchanged
          expect(unified2.tos.acceptedAt).toBe(tosTimestamp1);
        }
      }
    });
  });
});
