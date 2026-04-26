/**
 * Tests for Telemetry Stats Helpers
 */

import { describe, it, expect } from "vitest";
import {
  buildDailyActivityChart,
  buildFeatureUsageChart,
  buildMaestroPreferencesChart,
  calculateTrend,
  calculateEngagementScore,
} from "../helpers";

describe("telemetry-stats-helpers", () => {
  describe("buildDailyActivityChart", () => {
    const now = new Date("2024-01-15T10:00:00");

    it("returns two chart datasets", () => {
      const result = buildDailyActivityChart([], now);
      expect(result.length).toBe(2);
      expect(result[0].label).toBe("Minuti di studio");
      expect(result[1].label).toBe("Sessioni");
    });

    it("returns 7 days of data", () => {
      const result = buildDailyActivityChart([], now);
      expect(result[0].data.length).toBe(7);
      expect(result[1].data.length).toBe(7);
    });

    it("calculates minutes for each day", () => {
      const sessions = [
        { startedAt: new Date("2024-01-15T08:00:00"), duration: 30 },
        { startedAt: new Date("2024-01-15T12:00:00"), duration: 20 },
      ];
      const result = buildDailyActivityChart(sessions, now);
      // Last day (index 6) should have 50 minutes
      expect(result[0].data[6].value).toBe(50);
    });

    it("counts sessions for each day", () => {
      const sessions = [
        { startedAt: new Date("2024-01-15T08:00:00"), duration: 30 },
        { startedAt: new Date("2024-01-15T12:00:00"), duration: 20 },
      ];
      const result = buildDailyActivityChart(sessions, now);
      expect(result[1].data[6].value).toBe(2);
    });

    it("handles null durations", () => {
      const sessions = [
        { startedAt: new Date("2024-01-15T08:00:00"), duration: null },
      ];
      const result = buildDailyActivityChart(sessions, now);
      expect(result[0].data[6].value).toBe(0);
      expect(result[1].data[6].value).toBe(1);
    });

    it("distributes sessions across correct days", () => {
      const sessions = [
        { startedAt: new Date("2024-01-14T10:00:00"), duration: 10 }, // Yesterday
        { startedAt: new Date("2024-01-13T10:00:00"), duration: 20 }, // 2 days ago
      ];
      const result = buildDailyActivityChart(sessions, now);
      expect(result[0].data[5].value).toBe(10); // Yesterday
      expect(result[0].data[4].value).toBe(20); // 2 days ago
    });
  });

  describe("buildFeatureUsageChart", () => {
    it("returns empty array for no matching events", () => {
      const events = [{ category: "other", action: "something" }];
      const result = buildFeatureUsageChart(events);
      expect(result).toEqual([]);
    });

    it("counts quiz events", () => {
      const events = [
        { category: "education", action: "quiz_started" },
        { category: "education", action: "quiz_completed" },
      ];
      const result = buildFeatureUsageChart(events);
      const quizData = result.find((d) => d.label === "Quiz");
      expect(quizData?.data[0].value).toBe(2);
    });

    it("counts flashcard events", () => {
      const events = [{ category: "education", action: "flashcard_reviewed" }];
      const result = buildFeatureUsageChart(events);
      const flashcardData = result.find((d) => d.label === "Flashcards");
      expect(flashcardData?.data[0].value).toBe(1);
    });

    it("counts mindmap events", () => {
      const events = [{ category: "education", action: "mindmap_created" }];
      const result = buildFeatureUsageChart(events);
      const mindmapData = result.find((d) => d.label === "Mappe");
      expect(mindmapData?.data[0].value).toBe(1);
    });

    it("counts voice conversation events", () => {
      const events = [{ category: "conversation", action: "voice_started" }];
      const result = buildFeatureUsageChart(events);
      const voiceData = result.find((d) => d.label === "Voce");
      expect(voiceData?.data[0].value).toBe(1);
    });

    it("counts chat conversation events", () => {
      const events = [{ category: "conversation", action: "message_sent" }];
      const result = buildFeatureUsageChart(events);
      const chatData = result.find((d) => d.label === "Chat");
      expect(chatData?.data[0].value).toBe(1);
    });

    it("filters out features with zero count", () => {
      const events = [{ category: "education", action: "quiz_started" }];
      const result = buildFeatureUsageChart(events);
      expect(result.length).toBe(1);
      expect(result[0].label).toBe("Quiz");
    });
  });

  describe("buildMaestroPreferencesChart", () => {
    it("returns empty array for no sessions", () => {
      const result = buildMaestroPreferencesChart([]);
      expect(result).toEqual([]);
    });

    it("counts maestro usage", () => {
      const sessions = [
        { maestroId: "euclide" },
        { maestroId: "euclide" },
        { maestroId: "galileo" },
      ];
      const result = buildMaestroPreferencesChart(sessions);
      expect(result[0].label).toBe("euclide");
      expect(result[0].data[0].value).toBe(2);
      expect(result[1].label).toBe("galileo");
      expect(result[1].data[0].value).toBe(1);
    });

    it("returns top 5 maestros only", () => {
      const sessions = [
        { maestroId: "m1" },
        { maestroId: "m1" },
        { maestroId: "m1" },
        { maestroId: "m1" },
        { maestroId: "m1" },
        { maestroId: "m2" },
        { maestroId: "m2" },
        { maestroId: "m2" },
        { maestroId: "m2" },
        { maestroId: "m3" },
        { maestroId: "m3" },
        { maestroId: "m3" },
        { maestroId: "m4" },
        { maestroId: "m4" },
        { maestroId: "m5" },
        { maestroId: "m6" },
      ];
      const result = buildMaestroPreferencesChart(sessions);
      expect(result.length).toBe(5);
      expect(result[0].label).toBe("m1");
    });

    it("ignores sessions without maestroId", () => {
      const sessions = [
        { maestroId: "euclide" },
        { maestroId: "" },
        { maestroId: null as unknown as string },
      ];
      const result = buildMaestroPreferencesChart(sessions);
      expect(result.length).toBe(1);
    });
  });

  describe("calculateTrend", () => {
    const now = new Date("2024-01-15T10:00:00");

    it("returns stable for no sessions", () => {
      expect(calculateTrend([], now)).toBe("stable");
    });

    it("returns increasing when recent activity is higher", () => {
      const sessions = [
        { startedAt: new Date("2024-01-14T10:00:00"), duration: 100 }, // Recent
        { startedAt: new Date("2024-01-13T10:00:00"), duration: 100 }, // Recent
        { startedAt: new Date("2024-01-10T10:00:00"), duration: 10 }, // Previous
      ];
      expect(calculateTrend(sessions, now)).toBe("increasing");
    });

    it("returns decreasing when recent activity is lower", () => {
      const sessions = [
        { startedAt: new Date("2024-01-14T10:00:00"), duration: 10 }, // Recent
        { startedAt: new Date("2024-01-10T10:00:00"), duration: 100 }, // Previous
        { startedAt: new Date("2024-01-11T10:00:00"), duration: 100 }, // Previous
      ];
      expect(calculateTrend(sessions, now)).toBe("decreasing");
    });

    it("returns stable when activity is similar", () => {
      const sessions = [
        { startedAt: new Date("2024-01-14T10:00:00"), duration: 50 }, // Recent
        { startedAt: new Date("2024-01-10T10:00:00"), duration: 50 }, // Previous
      ];
      expect(calculateTrend(sessions, now)).toBe("stable");
    });
  });

  describe("calculateEngagementScore", () => {
    it("returns 0 for no activity", () => {
      const metrics = {
        sessionsThisWeek: 0,
        studyMinutesThisWeek: 0,
        questionsThisWeek: 0,
        maestrosUsedThisWeek: 0,
      };
      expect(calculateEngagementScore(metrics)).toBe(0);
    });

    it("returns 100 for maximum activity", () => {
      const metrics = {
        sessionsThisWeek: 7,
        studyMinutesThisWeek: 120,
        questionsThisWeek: 20,
        maestrosUsedThisWeek: 3,
      };
      expect(calculateEngagementScore(metrics)).toBe(100);
    });

    it("caps scores at maximum", () => {
      const metrics = {
        sessionsThisWeek: 100, // Exceeds 7
        studyMinutesThisWeek: 1000, // Exceeds 120
        questionsThisWeek: 100, // Exceeds 20
        maestrosUsedThisWeek: 10, // Exceeds 3
      };
      expect(calculateEngagementScore(metrics)).toBe(100);
    });

    it("calculates partial score correctly", () => {
      const metrics = {
        sessionsThisWeek: 3, // 3/7 * 30 = ~12.86
        studyMinutesThisWeek: 60, // 60/120 * 30 = 15
        questionsThisWeek: 10, // 10/20 * 25 = 12.5
        maestrosUsedThisWeek: 1, // 1/3 * 15 = 5
      };
      // Total ~45
      const score = calculateEngagementScore(metrics);
      expect(score).toBeGreaterThan(40);
      expect(score).toBeLessThan(50);
    });
  });
});
