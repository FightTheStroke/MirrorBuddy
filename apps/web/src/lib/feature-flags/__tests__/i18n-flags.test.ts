/**
 * Unit tests for i18n feature flag
 *
 * F-63: i18n can be enabled/disabled per environment
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isI18nEnabled } from "../i18n-flags";

describe("i18n Feature Flag", () => {
  const originalEnv = process.env.FEATURE_I18N_ENABLED;

  beforeEach(() => {
    // Reset to original state before each test
    if (originalEnv !== undefined) {
      process.env.FEATURE_I18N_ENABLED = originalEnv;
    } else {
      delete process.env.FEATURE_I18N_ENABLED;
    }
  });

  afterEach(() => {
    // Restore original env
    if (originalEnv !== undefined) {
      process.env.FEATURE_I18N_ENABLED = originalEnv;
    } else {
      delete process.env.FEATURE_I18N_ENABLED;
    }
  });

  describe("isI18nEnabled()", () => {
    it("should return true when FEATURE_I18N_ENABLED is not set (default behavior)", () => {
      delete process.env.FEATURE_I18N_ENABLED;
      expect(isI18nEnabled()).toBe(true);
    });

    it("should return true when FEATURE_I18N_ENABLED=true", () => {
      process.env.FEATURE_I18N_ENABLED = "true";
      expect(isI18nEnabled()).toBe(true);
    });

    it("should return true when FEATURE_I18N_ENABLED=True", () => {
      process.env.FEATURE_I18N_ENABLED = "True";
      expect(isI18nEnabled()).toBe(true);
    });

    it("should return true when FEATURE_I18N_ENABLED=TRUE", () => {
      process.env.FEATURE_I18N_ENABLED = "TRUE";
      expect(isI18nEnabled()).toBe(true);
    });

    it("should return true when FEATURE_I18N_ENABLED=1", () => {
      process.env.FEATURE_I18N_ENABLED = "1";
      expect(isI18nEnabled()).toBe(true);
    });

    it("should return false when FEATURE_I18N_ENABLED=false", () => {
      process.env.FEATURE_I18N_ENABLED = "false";
      expect(isI18nEnabled()).toBe(false);
    });

    it("should return false when FEATURE_I18N_ENABLED=False", () => {
      process.env.FEATURE_I18N_ENABLED = "False";
      expect(isI18nEnabled()).toBe(false);
    });

    it("should return false when FEATURE_I18N_ENABLED=FALSE", () => {
      process.env.FEATURE_I18N_ENABLED = "FALSE";
      expect(isI18nEnabled()).toBe(false);
    });

    it("should return false when FEATURE_I18N_ENABLED=0", () => {
      process.env.FEATURE_I18N_ENABLED = "0";
      expect(isI18nEnabled()).toBe(false);
    });

    it("should return false when FEATURE_I18N_ENABLED=no", () => {
      process.env.FEATURE_I18N_ENABLED = "no";
      expect(isI18nEnabled()).toBe(false);
    });

    it("should return false when FEATURE_I18N_ENABLED is empty string", () => {
      process.env.FEATURE_I18N_ENABLED = "";
      expect(isI18nEnabled()).toBe(false);
    });
  });
});
