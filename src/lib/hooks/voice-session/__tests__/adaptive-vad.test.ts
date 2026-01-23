/**
 * @fileoverview Unit tests for Adaptive VAD configuration
 * ADR-0065: Adaptive VAD for Accessibility Profiles
 */

import { describe, it, expect } from "vitest";
import {
  getAdaptiveVadConfig,
  formatVadConfigForLogging,
  isValidVadConfig,
  DEFAULT_VAD_CONFIG,
  VAD_PROFILES,
  type VadConfig,
} from "../adaptive-vad";
import type { A11yProfileId } from "@/lib/accessibility";

describe("Adaptive VAD Configuration", () => {
  describe("DEFAULT_VAD_CONFIG", () => {
    it("should have valid default values", () => {
      expect(DEFAULT_VAD_CONFIG.threshold).toBe(0.6);
      expect(DEFAULT_VAD_CONFIG.silence_duration_ms).toBe(700);
      expect(DEFAULT_VAD_CONFIG.prefix_padding_ms).toBe(300);
      expect(DEFAULT_VAD_CONFIG.noise_reduction).toBe("near_field");
    });

    it("should pass validation", () => {
      expect(isValidVadConfig(DEFAULT_VAD_CONFIG)).toBe(true);
    });
  });

  describe("VAD_PROFILES", () => {
    const profileIds: NonNullable<A11yProfileId>[] = [
      "dyslexia",
      "adhd",
      "autism",
      "motor",
      "visual",
      "auditory",
      "cerebral",
    ];

    it.each(profileIds)(
      "should have valid config for %s profile",
      (profile) => {
        const config = VAD_PROFILES[profile];
        expect(config).toBeDefined();
        expect(isValidVadConfig(config)).toBe(true);
      },
    );

    it("should have longer silence duration for dyslexia than default", () => {
      expect(VAD_PROFILES.dyslexia.silence_duration_ms).toBeGreaterThan(
        DEFAULT_VAD_CONFIG.silence_duration_ms,
      );
    });

    it("should have longest silence duration for cerebral palsy", () => {
      const allDurations = Object.values(VAD_PROFILES).map(
        (c) => c.silence_duration_ms,
      );
      expect(VAD_PROFILES.cerebral.silence_duration_ms).toBe(
        Math.max(...allDurations),
      );
    });

    it("should have lowest threshold for cerebral palsy (most sensitive)", () => {
      const allThresholds = Object.values(VAD_PROFILES).map((c) => c.threshold);
      expect(VAD_PROFILES.cerebral.threshold).toBe(Math.min(...allThresholds));
    });

    it("should use far_field noise reduction for motor impairment", () => {
      expect(VAD_PROFILES.motor.noise_reduction).toBe("far_field");
    });

    it("should use far_field noise reduction for ADHD (fidgety movement)", () => {
      expect(VAD_PROFILES.adhd.noise_reduction).toBe("far_field");
    });
  });

  describe("getAdaptiveVadConfig", () => {
    it("should return default config when profile is null", () => {
      const config = getAdaptiveVadConfig(null, true);
      expect(config).toEqual(DEFAULT_VAD_CONFIG);
    });

    it("should return default config when adaptive VAD is disabled", () => {
      const config = getAdaptiveVadConfig("dyslexia", false);
      expect(config).toEqual(DEFAULT_VAD_CONFIG);
    });

    it("should return profile config when adaptive VAD is enabled", () => {
      const config = getAdaptiveVadConfig("dyslexia", true);
      expect(config).toEqual(VAD_PROFILES.dyslexia);
    });

    it("should default to enabled when adaptiveEnabled is not provided", () => {
      const config = getAdaptiveVadConfig("adhd");
      expect(config).toEqual(VAD_PROFILES.adhd);
    });

    it.each([
      ["dyslexia", VAD_PROFILES.dyslexia],
      ["adhd", VAD_PROFILES.adhd],
      ["autism", VAD_PROFILES.autism],
      ["motor", VAD_PROFILES.motor],
      ["visual", VAD_PROFILES.visual],
      ["auditory", VAD_PROFILES.auditory],
      ["cerebral", VAD_PROFILES.cerebral],
    ] as const)(
      "should return correct config for %s profile",
      (profileId, expectedConfig) => {
        const config = getAdaptiveVadConfig(profileId, true);
        expect(config).toEqual(expectedConfig);
      },
    );
  });

  describe("formatVadConfigForLogging", () => {
    it("should format default profile correctly", () => {
      const formatted = formatVadConfigForLogging(DEFAULT_VAD_CONFIG, null);
      expect(formatted).toBe(
        "VAD[default]: threshold=0.6, silence=700ms, prefix=300ms",
      );
    });

    it("should format named profile correctly", () => {
      const formatted = formatVadConfigForLogging(
        VAD_PROFILES.dyslexia,
        "dyslexia",
      );
      expect(formatted).toBe(
        "VAD[dyslexia]: threshold=0.55, silence=1500ms, prefix=400ms",
      );
    });
  });

  describe("isValidVadConfig", () => {
    it("should accept valid config", () => {
      const valid: VadConfig = {
        threshold: 0.5,
        silence_duration_ms: 1000,
        prefix_padding_ms: 400,
        noise_reduction: "near_field",
      };
      expect(isValidVadConfig(valid)).toBe(true);
    });

    it("should reject threshold below 0.1", () => {
      const invalid: VadConfig = {
        ...DEFAULT_VAD_CONFIG,
        threshold: 0.05,
      };
      expect(isValidVadConfig(invalid)).toBe(false);
    });

    it("should reject threshold above 1.0", () => {
      const invalid: VadConfig = {
        ...DEFAULT_VAD_CONFIG,
        threshold: 1.5,
      };
      expect(isValidVadConfig(invalid)).toBe(false);
    });

    it("should reject silence_duration_ms below 200", () => {
      const invalid: VadConfig = {
        ...DEFAULT_VAD_CONFIG,
        silence_duration_ms: 100,
      };
      expect(isValidVadConfig(invalid)).toBe(false);
    });

    it("should reject silence_duration_ms above 5000", () => {
      const invalid: VadConfig = {
        ...DEFAULT_VAD_CONFIG,
        silence_duration_ms: 6000,
      };
      expect(isValidVadConfig(invalid)).toBe(false);
    });

    it("should reject prefix_padding_ms below 100", () => {
      const invalid: VadConfig = {
        ...DEFAULT_VAD_CONFIG,
        prefix_padding_ms: 50,
      };
      expect(isValidVadConfig(invalid)).toBe(false);
    });

    it("should reject prefix_padding_ms above 1000", () => {
      const invalid: VadConfig = {
        ...DEFAULT_VAD_CONFIG,
        prefix_padding_ms: 1500,
      };
      expect(isValidVadConfig(invalid)).toBe(false);
    });

    it("should reject invalid noise_reduction value", () => {
      const invalid = {
        ...DEFAULT_VAD_CONFIG,
        noise_reduction: "invalid" as "near_field",
      };
      expect(isValidVadConfig(invalid)).toBe(false);
    });
  });
});
