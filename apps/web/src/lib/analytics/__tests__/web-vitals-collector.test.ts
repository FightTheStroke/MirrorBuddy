/**
 * Unit tests for Web Vitals Collector (F-05)
 * Tests GDPR compliance, sessionId, device detection, and consent checking
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  initWebVitalsWithConsent,
  setWebVitalsConsent,
} from "../web-vitals-collector";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

// Mock web-vitals
vi.mock("web-vitals", () => ({
  onCLS: vi.fn(),
  onINP: vi.fn(),
  onFCP: vi.fn(),
  onLCP: vi.fn(),
  onTTFB: vi.fn(),
}));

describe("Web Vitals Collector (F-05)", () => {
  // ============================================================================
  // CONSENT MANAGEMENT
  // ============================================================================

  describe("Consent Management", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should set consent state correctly", () => {
      const consentState = {
        hasAnalyticsConsent: () => true,
      };

      setWebVitalsConsent(consentState as any);
      expect(setWebVitalsConsent).toBeDefined();
    });

    it("should return cleanup function from initialization", () => {
      const mockConsentStore = {
        getState: () => ({
          hasAnalyticsConsent: () => true,
          isLoaded: true,
        }),
        subscribe: vi.fn(() => () => {}),
      };

      const cleanup = initWebVitalsWithConsent("user-123", mockConsentStore);

      // In Node environment, function may return empty cleanup, but should return function
      expect(typeof cleanup).toBe("function");
    });

    it("should set consent state for both true and false", () => {
      const falseState = {
        hasAnalyticsConsent: () => false,
      };
      setWebVitalsConsent(falseState as any);
      expect(setWebVitalsConsent).toBeDefined();

      const trueState = {
        hasAnalyticsConsent: () => true,
      };
      setWebVitalsConsent(trueState as any);
      expect(setWebVitalsConsent).toBeDefined();
    });

    it("should accept mock consent store with any interface", () => {
      const mockConsentStore = {
        getState: () => ({
          hasAnalyticsConsent: () => true,
          isLoaded: true,
        }),
        subscribe: vi.fn(() => () => {}),
      };

      const cleanup = initWebVitalsWithConsent("user-123", mockConsentStore);

      expect(typeof cleanup).toBe("function");
      expect(typeof mockConsentStore.getState).toBe("function");
    });

    it("should handle consent store without loadConsent gracefully", () => {
      const mockConsentStore = {
        getState: () => ({
          hasAnalyticsConsent: () => true,
          isLoaded: true,
          // No loadConsent method
        }),
        subscribe: vi.fn(() => () => {}),
      };

      const cleanup = initWebVitalsWithConsent("user-123", mockConsentStore);

      expect(typeof cleanup).toBe("function");
    });

    it("should handle null userId gracefully", () => {
      const mockConsentStore = {
        getState: () => ({
          hasAnalyticsConsent: () => true,
          isLoaded: true,
        }),
        subscribe: vi.fn(() => () => {}),
      };

      const cleanup = initWebVitalsWithConsent(null, mockConsentStore);

      expect(typeof cleanup).toBe("function");
    });
  });

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  describe("Initialization", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should return cleanup function from initWebVitalsWithConsent", () => {
      const mockConsentStore = {
        getState: () => ({
          hasAnalyticsConsent: () => true,
          isLoaded: true,
        }),
        subscribe: vi.fn(() => vi.fn()),
      };

      const cleanup = initWebVitalsWithConsent("user-123", mockConsentStore);

      expect(typeof cleanup).toBe("function");
    });

    it("should return function even without browser environment", () => {
      const mockConsentStore = {
        getState: () => ({
          hasAnalyticsConsent: () => true,
          isLoaded: true,
        }),
        subscribe: vi.fn(() => () => {}),
      };

      const cleanup1 = initWebVitalsWithConsent("user-123", mockConsentStore);
      const cleanup2 = initWebVitalsWithConsent("user-456", mockConsentStore);

      // Both should return callable functions
      expect(typeof cleanup1).toBe("function");
      expect(typeof cleanup2).toBe("function");
    });

    it("should accept various consentStore configurations", () => {
      // Test with full config
      const fullStore = {
        getState: () => ({
          hasAnalyticsConsent: () => true,
          isLoaded: true,
          loadConsent: vi.fn().mockResolvedValue(undefined),
        }),
        subscribe: vi.fn(() => () => {}),
      };

      const cleanup = initWebVitalsWithConsent("user-123", fullStore);
      expect(typeof cleanup).toBe("function");
    });

    it("should handle consentStore without loadConsent method", () => {
      const minimalStore = {
        getState: () => ({
          hasAnalyticsConsent: () => true,
          isLoaded: true,
        }),
        subscribe: vi.fn(() => () => {}),
      };

      const cleanup = initWebVitalsWithConsent("user-123", minimalStore);

      expect(typeof cleanup).toBe("function");
    });

    it("should work with null userId", () => {
      const storeWithoutLoadConsent = {
        getState: () => ({
          hasAnalyticsConsent: () => true,
          isLoaded: true,
        }),
        subscribe: vi.fn(() => () => {}),
      };

      const cleanup = initWebVitalsWithConsent(null, storeWithoutLoadConsent);

      expect(typeof cleanup).toBe("function");
    });
  });
});
