/**
 * @fileoverview Integration tests for adaptive VAD in session configuration
 * ADR-0069: Verifies VAD config is correctly selected based on accessibility profile
 */

import { describe, it, expect } from "vitest";
import {
  getAdaptiveVadConfig,
  VAD_PROFILES,
  DEFAULT_VAD_CONFIG,
} from "../adaptive-vad";

// Note: Tests use getAdaptiveVadConfig directly, which is the integration point
// The actual session-config.ts uses useAccessibilityStore.getState() to get profile

describe("Session Config VAD Integration", () => {
  describe("VAD config selection based on accessibility state", () => {
    it("should use dyslexia VAD config when dyslexia profile is active", () => {
      const mockState = {
        activeProfile: "dyslexia" as const,
        settings: { adaptiveVadEnabled: true },
      };

      const vadConfig = getAdaptiveVadConfig(
        mockState.activeProfile,
        mockState.settings.adaptiveVadEnabled,
      );

      expect(vadConfig).toEqual(VAD_PROFILES.dyslexia);
      expect(vadConfig.silence_duration_ms).toBe(1500);
      expect(vadConfig.threshold).toBe(0.55);
    });

    it("should use cerebral VAD config with longest silence for cerebral palsy", () => {
      const mockState = {
        activeProfile: "cerebral" as const,
        settings: { adaptiveVadEnabled: true },
      };

      const vadConfig = getAdaptiveVadConfig(
        mockState.activeProfile,
        mockState.settings.adaptiveVadEnabled,
      );

      expect(vadConfig).toEqual(VAD_PROFILES.cerebral);
      expect(vadConfig.silence_duration_ms).toBe(2500);
      expect(vadConfig.threshold).toBe(0.4);
      expect(vadConfig.noise_reduction).toBe("far_field");
    });

    it("should use default VAD when adaptiveVadEnabled is false", () => {
      const mockState = {
        activeProfile: "dyslexia" as const,
        settings: { adaptiveVadEnabled: false },
      };

      const vadConfig = getAdaptiveVadConfig(
        mockState.activeProfile,
        mockState.settings.adaptiveVadEnabled,
      );

      expect(vadConfig).toEqual(DEFAULT_VAD_CONFIG);
    });

    it("should use default VAD when no profile is active", () => {
      const mockState = {
        activeProfile: null,
        settings: { adaptiveVadEnabled: true },
      };

      const vadConfig = getAdaptiveVadConfig(
        mockState.activeProfile,
        mockState.settings.adaptiveVadEnabled,
      );

      expect(vadConfig).toEqual(DEFAULT_VAD_CONFIG);
    });

    it("should use far_field noise reduction for ADHD profile", () => {
      const mockState = {
        activeProfile: "adhd" as const,
        settings: { adaptiveVadEnabled: true },
      };

      const vadConfig = getAdaptiveVadConfig(
        mockState.activeProfile,
        mockState.settings.adaptiveVadEnabled,
      );

      expect(vadConfig.noise_reduction).toBe("far_field");
    });

    it("should use near_field noise reduction for visual profile", () => {
      const mockState = {
        activeProfile: "visual" as const,
        settings: { adaptiveVadEnabled: true },
      };

      const vadConfig = getAdaptiveVadConfig(
        mockState.activeProfile,
        mockState.settings.adaptiveVadEnabled,
      );

      expect(vadConfig.noise_reduction).toBe("near_field");
    });
  });

  describe("VAD config values for turn detection", () => {
    it.each([
      ["dyslexia", 1500, 0.55, "Extended silence for word retrieval"],
      ["adhd", 1800, 0.6, "Extra time for thought organization"],
      ["autism", 1400, 0.5, "Processing time for social communication"],
      ["motor", 2000, 0.45, "Physical speech production challenges"],
      ["cerebral", 2500, 0.4, "Maximum accommodation for motor+cognitive"],
    ] as const)(
      "%s profile: silence=%dms, threshold=%s (%s)",
      (profile, expectedSilence, expectedThreshold, _description) => {
        const config = getAdaptiveVadConfig(profile, true);
        expect(config.silence_duration_ms).toBe(expectedSilence);
        expect(config.threshold).toBe(expectedThreshold);
      },
    );
  });
});
