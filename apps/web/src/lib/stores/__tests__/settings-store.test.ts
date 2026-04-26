/**
 * Unit tests for settings store
 * Tests Zustand store state management for user preferences
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useSettingsStore } from "../settings-store";

describe("Settings Store", () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    const state = useSettingsStore.getState();
    state.updateStudentProfile({
      name: "",
      age: 14,
      schoolYear: 1,
      schoolLevel: "superiore",
      gradeLevel: "",
      learningGoals: [],
      teachingStyle: "balanced",
      fontSize: "medium",
      highContrast: false,
      dyslexiaFont: false,
      voiceEnabled: true,
      simplifiedLanguage: false,
      adhdMode: false,
      learningDifferences: [],
      preferredCoach: undefined,
      preferredBuddy: undefined,
      crossMaestroEnabled: true,
    });
    useSettingsStore.setState({ pendingSync: false });
  });

  describe("Cross-Maestro Memory Setting", () => {
    it("has crossMaestroEnabled enabled by default", () => {
      const state = useSettingsStore.getState();
      expect(state.studentProfile.crossMaestroEnabled).toBe(true);
    });

    it("can disable cross-maestro memory", () => {
      useSettingsStore.getState().updateStudentProfile({
        crossMaestroEnabled: false,
      });
      expect(
        useSettingsStore.getState().studentProfile.crossMaestroEnabled,
      ).toBe(false);
    });

    it("can re-enable cross-maestro memory", () => {
      useSettingsStore.getState().updateStudentProfile({
        crossMaestroEnabled: false,
      });
      useSettingsStore.getState().updateStudentProfile({
        crossMaestroEnabled: true,
      });
      expect(
        useSettingsStore.getState().studentProfile.crossMaestroEnabled,
      ).toBe(true);
    });

    it("sets pendingSync flag when toggling cross-maestro setting", () => {
      useSettingsStore.setState({ pendingSync: false });
      useSettingsStore.getState().updateStudentProfile({
        crossMaestroEnabled: false,
      });
      expect(useSettingsStore.getState().pendingSync).toBe(true);
    });

    it("toggles cross-maestro setting without affecting other profile settings", () => {
      const initialProfile = useSettingsStore.getState().studentProfile;
      useSettingsStore.getState().updateStudentProfile({
        crossMaestroEnabled: false,
      });
      const updatedProfile = useSettingsStore.getState().studentProfile;

      // Check that only crossMaestroEnabled changed
      expect(updatedProfile.name).toBe(initialProfile.name);
      expect(updatedProfile.age).toBe(initialProfile.age);
      expect(updatedProfile.crossMaestroEnabled).toBe(false);
    });
  });

  describe("Student Profile Updates", () => {
    it("updates student profile partially", () => {
      useSettingsStore.getState().updateStudentProfile({ name: "John" });
      expect(useSettingsStore.getState().studentProfile.name).toBe("John");
    });

    it("marks pending sync on profile update", () => {
      useSettingsStore.setState({ pendingSync: false });
      useSettingsStore.getState().updateStudentProfile({ name: "Jane" });
      expect(useSettingsStore.getState().pendingSync).toBe(true);
    });
  });
});
