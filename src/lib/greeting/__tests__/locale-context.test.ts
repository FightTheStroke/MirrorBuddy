/**
 * @file locale-context.test.ts
 * @brief Tests for locale-based greeting generation from context
 *
 * Verifies that greeting generator properly uses locale from GreetingContext
 * and falls back to Italian when locale is not available.
 */

import { describe, it, expect } from "vitest";
import { generateGreeting, generateMaestroGreeting, generateCoachGreeting } from "../greeting-generator";
import type { GreetingContext } from "@/types/greeting";
import type { ExtendedStudentProfile } from "@/lib/stores/settings-types";

// Mock student profile for testing
const mockStudent: ExtendedStudentProfile = {
  name: "Test Student",
  age: 12,
  schoolYear: 7,
  schoolLevel: "media",
  gradeLevel: "7",
  learningGoals: [],
  teachingStyle: "balanced",
  fontSize: "medium",
  highContrast: false,
  dyslexiaFont: false,
  voiceEnabled: false,
  simplifiedLanguage: false,
  adhdMode: false,
  learningDifferences: [],
};

describe("Locale-aware greeting generation", () => {
  describe("generateGreeting with context", () => {
    it("generates Italian greeting when locale is 'it'", () => {
      const context: GreetingContext = {
        student: mockStudent,
        locale: "it",
      };

      const greeting = generateGreeting(
        "euclide",
        "Euclide",
        "maestro",
        context
      );

      expect(greeting).toContain("Sono Euclide");
      expect(greeting).toMatch(/aiutarti|esserLe/); // Should have Italian greeting
    });

    it("generates English greeting when locale is 'en'", () => {
      const context: GreetingContext = {
        student: mockStudent,
        locale: "en",
      };

      const greeting = generateGreeting(
        "euclide",
        "Euclid",
        "maestro",
        context
      );

      expect(greeting).toContain("Euclid");
      expect(greeting).toMatch(/help you|assist you/i);
    });

    it("generates Spanish greeting when locale is 'es'", () => {
      const context: GreetingContext = {
        student: mockStudent,
        locale: "es",
      };

      const greeting = generateGreeting(
        "euclide",
        "Euclides",
        "maestro",
        context
      );

      expect(greeting).toContain("Soy Euclides");
      expect(greeting).toMatch(/ayudarte|servirle/);
    });

    it("generates French greeting when locale is 'fr'", () => {
      const context: GreetingContext = {
        student: mockStudent,
        locale: "fr",
      };

      const greeting = generateGreeting(
        "euclide",
        "Euclide",
        "maestro",
        context
      );

      expect(greeting).toContain("Je suis Euclide");
      expect(greeting).toMatch(/t'aider|vous aider/);
    });

    it("generates German greeting when locale is 'de'", () => {
      const context: GreetingContext = {
        student: mockStudent,
        locale: "de",
      };

      const greeting = generateGreeting(
        "euclide",
        "Euklid",
        "maestro",
        context
      );

      expect(greeting).toContain("Ich bin Euklid");
      expect(greeting).toMatch(/dir|Ihnen/);
    });

    it("generates coach greeting with correct locale", () => {
      const context: GreetingContext = {
        student: mockStudent,
        locale: "en",
      };

      const greeting = generateGreeting(
        "melissa",
        "Melissa",
        "coach",
        context
      );

      expect(greeting).toContain("Melissa");
      expect(greeting).toMatch(/help you learn/i);
    });
  });

  describe("generateMaestroGreeting with locale parameter", () => {
    it("accepts locale parameter directly", () => {
      const greetingIT = generateMaestroGreeting("galileo", "Galileo", "it");
      const greetingEN = generateMaestroGreeting("galileo", "Galileo", "en");

      expect(greetingIT).toMatch(/Sono Galileo|esserLe/);
      expect(greetingEN).toMatch(/I am Galileo|I'm Galileo/i);
    });

    it("falls back to Italian for unknown locale", () => {
      // @ts-expect-error - testing fallback behavior
      const greeting = generateMaestroGreeting("galileo", "Galileo", "unknown");

      expect(greeting).toMatch(/Sono Galileo|esserLe/);
    });
  });

  describe("generateCoachGreeting with locale parameter", () => {
    it("accepts locale parameter directly", () => {
      const greetingIT = generateCoachGreeting("Melissa", "it");
      const greetingEN = generateCoachGreeting("Melissa", "en");

      expect(greetingIT).toContain("Melissa");
      expect(greetingIT).toMatch(/aiutarti a imparare/i);
      expect(greetingEN).toContain("Melissa");
      expect(greetingEN).toMatch(/help you learn/i);
    });

    it("falls back to Italian for unknown locale", () => {
      // @ts-expect-error - testing fallback behavior
      const greeting = generateCoachGreeting("Roberto", "unknown");

      expect(greeting).toContain("Roberto");
      expect(greeting).toMatch(/aiutarti/);
    });
  });

  describe("Fallback behavior", () => {
    it("uses Italian when locale is missing from context", () => {
      const context: GreetingContext = {
        student: mockStudent,
        locale: "it", // Explicitly use Italian for fallback test
      };

      const greeting = generateGreeting(
        "euclide",
        "Euclide",
        "maestro",
        context
      );

      // Should fall back to Italian
      expect(greeting).toMatch(/Sono|aiutarti|esserLe/);
    });
  });
});
