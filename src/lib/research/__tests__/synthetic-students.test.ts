import { describe, it, expect } from "vitest";
import {
  SYNTHETIC_PROFILES,
  buildStudentSystemPrompt,
  getProfileByName,
  getProfileByDsa,
  type MessageContext,
} from "../synthetic-students";

describe("synthetic-students", () => {
  describe("SYNTHETIC_PROFILES", () => {
    it("should have exactly 4 profiles", () => {
      expect(SYNTHETIC_PROFILES).toHaveLength(4);
    });

    it("should have unique names", () => {
      const names = SYNTHETIC_PROFILES.map((p) => p.name);
      expect(new Set(names).size).toBe(4);
    });

    it("should have unique DSA profiles", () => {
      const dsas = SYNTHETIC_PROFILES.map((p) => p.dsaProfile);
      expect(new Set(dsas).size).toBe(4);
    });

    it.each(SYNTHETIC_PROFILES)("$name should have valid fields", (profile) => {
      expect(profile.age).toBeGreaterThanOrEqual(10);
      expect(profile.age).toBeLessThanOrEqual(18);
      expect(profile.schoolYear).toBeGreaterThanOrEqual(5);
      expect(profile.challengeAreas.length).toBeGreaterThan(0);
      expect(profile.responsePatterns.attentionSpanTurns).toBeGreaterThan(0);
      expect(profile.responsePatterns.frustrationThreshold).toBeGreaterThan(0);
      expect(profile.responsePatterns.frustrationThreshold).toBeLessThanOrEqual(
        1,
      );
      expect(profile.responsePatterns.typicalBehaviors.length).toBeGreaterThan(
        0,
      );
      expect(profile.responsePatterns.frustrationCues.length).toBeGreaterThan(
        0,
      );
      expect(profile.responsePatterns.engagementSignals.length).toBeGreaterThan(
        0,
      );
    });
  });

  describe("buildStudentSystemPrompt", () => {
    const baseContext: MessageContext = {
      topic: "algebra",
      previousMessages: [],
      turnNumber: 1,
      difficulty: "medium",
    };

    it("should include profile name and age", () => {
      const profile = SYNTHETIC_PROFILES[0]; // Marco-Dyslexic-12
      const prompt = buildStudentSystemPrompt(profile, baseContext);
      expect(prompt).toContain(profile.name);
      expect(prompt).toContain(String(profile.age));
    });

    it("should include DSA profile", () => {
      const profile = SYNTHETIC_PROFILES[0];
      const prompt = buildStudentSystemPrompt(profile, baseContext);
      expect(prompt).toContain(profile.dsaProfile);
    });

    it("should include engagement signals when attentive", () => {
      const profile = SYNTHETIC_PROFILES[0]; // attentionSpan = 8
      const prompt = buildStudentSystemPrompt(profile, {
        ...baseContext,
        turnNumber: 2,
      });
      expect(prompt).toContain(profile.responsePatterns.engagementSignals[0]);
    });

    it("should include frustration cues when tired", () => {
      const profile = SYNTHETIC_PROFILES[0]; // attentionSpan = 8
      const prompt = buildStudentSystemPrompt(profile, {
        ...baseContext,
        turnNumber: 12,
      });
      expect(prompt).toContain(profile.responsePatterns.frustrationCues[0]);
      expect(prompt).toContain("TIRED");
    });

    it("should mention difficulty when hard", () => {
      const profile = SYNTHETIC_PROFILES[0];
      const prompt = buildStudentSystemPrompt(profile, {
        ...baseContext,
        difficulty: "hard",
      });
      expect(prompt).toContain("HARD");
    });

    it("should include topic", () => {
      const profile = SYNTHETIC_PROFILES[0];
      const prompt = buildStudentSystemPrompt(profile, baseContext);
      expect(prompt).toContain("algebra");
    });
  });

  describe("getProfileByName", () => {
    it("should find existing profile", () => {
      const result = getProfileByName("Marco-Dyslexic-12");
      expect(result).toBeDefined();
      expect(result?.dsaProfile).toBe("dyslexia");
    });

    it("should return undefined for unknown name", () => {
      expect(getProfileByName("Unknown-99")).toBeUndefined();
    });
  });

  describe("getProfileByDsa", () => {
    it("should find profile by DSA type", () => {
      const result = getProfileByDsa("adhd");
      expect(result).toBeDefined();
      expect(result?.name).toContain("ADHD");
    });

    it("should return undefined for unknown DSA", () => {
      expect(getProfileByDsa("unknown")).toBeUndefined();
    });
  });
});
