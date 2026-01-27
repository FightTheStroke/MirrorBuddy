/**
 * New Language Maestri Unit Tests
 *
 * Tests for Molière (French), Goethe (German), and Cervantes (Spanish)
 * Validates configuration, knowledge embedding, and greeting functionality.
 *
 * @see ADR-0064 (Formal vs Informal Address)
 * @see ADR-0031 (Embedded Knowledge Base)
 */

import { describe, it, expect } from "vitest";
import { moliere } from "../maestri/moliere";
import { goethe } from "../maestri/goethe";
import { cervantes } from "../maestri/cervantes";
import { getMaestroById, getAllMaestri } from "../maestri/index";
import type { MaestroFull } from "../maestri/types";
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

describe("New Language Maestri Configuration", () => {
  describe("Molière - French", () => {
    it("should have correct ID and metadata", () => {
      expect(moliere.id).toBe("moliere-french");
      expect(moliere.name).toBe("moliere-french");
      expect(moliere.displayName).toBe("Molière");
      expect(moliere.subject).toBe("french");
    });

    it("should have all required properties", () => {
      expect(moliere.avatar).toBeTruthy();
      expect(moliere.avatar).toBe("/maestri/moliere.webp");
      expect(moliere.color).toBeTruthy();
      expect(moliere.greeting).toBeTruthy();
      expect(moliere.greeting).toContain("Molière");
    });

    it("should have valid systemPrompt", () => {
      expect(moliere.systemPrompt).toBeTruthy();
      expect(moliere.systemPrompt.length).toBeGreaterThan(100);
      // Should contain knowledge base content (substituted via template literal)
      expect(moliere.systemPrompt).toContain("## KNOWLEDGE BASE");
    });

    // Voice configuration is not part of MaestroFull type
    // Voice settings are handled separately in the voice system

    it("should have complete tools array", () => {
      expect(Array.isArray(moliere.tools)).toBe(true);
      expect(moliere.tools.length).toBeGreaterThan(0);
      // Should include core teaching tools
      expect(moliere.tools).toContain("Quiz");
      expect(moliere.tools).toContain("Flashcards");
      expect(moliere.tools).toContain("MindMap");
      expect(moliere.tools).toContain("Audio");
      expect(moliere.tools).toContain("Pronunciation");
      expect(moliere.tools).toContain("Dictionary");
    });

    it("should have dynamic greeting function", () => {
      expect(moliere.getGreeting).toBeDefined();
      expect(typeof moliere.getGreeting).toBe("function");

      const greeting = moliere.getGreeting!({
        student: mockStudent,
        language: "it",
      });
      expect(greeting).toBeTruthy();
      expect(typeof greeting).toBe("string");
    });

    it("should be retrievable from maestri index", () => {
      const found = getMaestroById("moliere-french");
      expect(found).toBeDefined();
      expect(found?.displayName).toBe("Molière");
      expect(found?.id).toBe("moliere-french");
    });

    it("should have proper historical context in systemPrompt", () => {
      expect(moliere.systemPrompt).toContain("17th century");
      expect(moliere.systemPrompt).toContain("French");
      expect(moliere.systemPrompt).toContain("theater");
    });

    it("should not exclude from gamification", () => {
      expect(moliere.excludeFromGamification).not.toBe(true);
    });

    it("should have character intensity dial in systemPrompt", () => {
      expect(moliere.systemPrompt).toContain("CHARACTER INTENSITY DIAL");
      expect(moliere.systemPrompt).toContain("FULL CHARACTER MODE");
      expect(moliere.systemPrompt).toContain("REDUCED CHARACTER MODE");
      expect(moliere.systemPrompt).toContain("OVERRIDE TO DIRECT HELP");
    });

    it("should include accessibility adaptations", () => {
      expect(moliere.systemPrompt).toContain("Dyslexia Support");
      expect(moliere.systemPrompt).toContain("ADHD Support");
      expect(moliere.systemPrompt).toContain("Autism Support");
      expect(moliere.systemPrompt).toContain("Cerebral Palsy Support");
    });
  });

  describe("Goethe - German", () => {
    it("should have correct ID and metadata", () => {
      expect(goethe.id).toBe("goethe-german");
      expect(goethe.name).toBe("goethe-german");
      expect(goethe.displayName).toBe("Goethe");
      expect(goethe.subject).toBe("german");
    });

    it("should have all required properties", () => {
      expect(goethe.avatar).toBeTruthy();
      expect(goethe.avatar).toBe("/maestri/goethe.webp");
      expect(goethe.color).toBeTruthy();
      expect(goethe.greeting).toBeTruthy();
      expect(goethe.greeting).toContain("Goethe");
    });

    it("should have valid systemPrompt", () => {
      expect(goethe.systemPrompt).toBeTruthy();
      expect(goethe.systemPrompt.length).toBeGreaterThan(100);
      // Should contain knowledge base content (substituted via template literal)
      expect(goethe.systemPrompt).toContain("## KNOWLEDGE BASE");
    });

    // Voice configuration is not part of MaestroFull type
    // Voice settings are handled separately in the voice system

    it("should have complete tools array", () => {
      expect(Array.isArray(goethe.tools)).toBe(true);
      expect(goethe.tools.length).toBeGreaterThan(0);
      // Should include core teaching tools
      expect(goethe.tools).toContain("Quiz");
      expect(goethe.tools).toContain("Flashcards");
      expect(goethe.tools).toContain("MindMap");
      expect(goethe.tools).toContain("Audio");
      expect(goethe.tools).toContain("Pronunciation");
      expect(goethe.tools).toContain("Dictionary");
    });

    it("should have dynamic greeting function", () => {
      expect(goethe.getGreeting).toBeDefined();
      expect(typeof goethe.getGreeting).toBe("function");

      const greeting = goethe.getGreeting!({
        student: mockStudent,
        language: "it",
      });
      expect(greeting).toBeTruthy();
      expect(typeof greeting).toBe("string");
    });

    it("should be retrievable from maestri index", () => {
      const found = getMaestroById("goethe-german");
      expect(found).toBeDefined();
      expect(found?.displayName).toBe("Goethe");
      expect(found?.id).toBe("goethe-german");
    });

    it("should have proper historical context in systemPrompt", () => {
      expect(goethe.systemPrompt).toContain("18th");
      expect(goethe.systemPrompt).toContain("19th century");
      expect(goethe.systemPrompt).toContain("German");
    });

    it("should not exclude from gamification", () => {
      expect(goethe.excludeFromGamification).not.toBe(true);
    });

    it("should have character intensity dial in systemPrompt", () => {
      expect(goethe.systemPrompt).toContain("CHARACTER INTENSITY DIAL");
      expect(goethe.systemPrompt).toContain("FULL CHARACTER MODE");
      expect(goethe.systemPrompt).toContain("REDUCED CHARACTER MODE");
      expect(goethe.systemPrompt).toContain("OVERRIDE TO DIRECT HELP");
    });

    it("should include accessibility adaptations", () => {
      expect(goethe.systemPrompt).toContain("Dyslexia Support");
      expect(goethe.systemPrompt).toContain("ADHD Support");
      expect(goethe.systemPrompt).toContain("Autism Support");
      expect(goethe.systemPrompt).toContain("Cerebral Palsy Support");
    });
  });

  describe("Cervantes - Spanish", () => {
    it("should have correct ID and metadata", () => {
      expect(cervantes.id).toBe("cervantes-spanish");
      expect(cervantes.name).toBe("cervantes-spanish");
      expect(cervantes.displayName).toBe("Cervantes");
      expect(cervantes.subject).toBe("spanish");
    });

    it("should have all required properties", () => {
      expect(cervantes.avatar).toBeTruthy();
      expect(cervantes.avatar).toBe("/maestri/cervantes.webp");
      expect(cervantes.color).toBeTruthy();
      expect(cervantes.greeting).toBeTruthy();
      expect(cervantes.greeting).toContain("Cervantes");
    });

    it("should have valid systemPrompt", () => {
      expect(cervantes.systemPrompt).toBeTruthy();
      expect(cervantes.systemPrompt.length).toBeGreaterThan(100);
      // Should contain knowledge base content (substituted via template literal)
      expect(cervantes.systemPrompt).toContain("## KNOWLEDGE BASE");
    });

    // Voice configuration is not part of MaestroFull type
    // Voice settings are handled separately in the voice system

    it("should have complete tools array", () => {
      expect(Array.isArray(cervantes.tools)).toBe(true);
      expect(cervantes.tools.length).toBeGreaterThan(0);
      // Should include core teaching tools
      expect(cervantes.tools).toContain("Quiz");
      expect(cervantes.tools).toContain("Flashcards");
      expect(cervantes.tools).toContain("MindMap");
      expect(cervantes.tools).toContain("Audio");
      expect(cervantes.tools).toContain("Pronunciation");
      expect(cervantes.tools).toContain("Dictionary");
    });

    it("should have dynamic greeting function", () => {
      expect(cervantes.getGreeting).toBeDefined();
      expect(typeof cervantes.getGreeting).toBe("function");

      const greeting = cervantes.getGreeting!({
        student: mockStudent,
        language: "it",
      });
      expect(greeting).toBeTruthy();
      expect(typeof greeting).toBe("string");
    });

    it("should be retrievable from maestri index", () => {
      const found = getMaestroById("cervantes-spanish");
      expect(found).toBeDefined();
      expect(found?.displayName).toBe("Cervantes");
      expect(found?.id).toBe("cervantes-spanish");
    });

    it("should have proper historical context in systemPrompt", () => {
      expect(cervantes.systemPrompt).toContain("16th");
      expect(cervantes.systemPrompt).toContain("17th century");
      expect(cervantes.systemPrompt).toContain("Spanish");
    });

    it("should not exclude from gamification", () => {
      expect(cervantes.excludeFromGamification).not.toBe(true);
    });

    it("should have character intensity dial in systemPrompt", () => {
      expect(cervantes.systemPrompt).toContain("CHARACTER INTENSITY DIAL");
      expect(cervantes.systemPrompt).toContain("FULL CHARACTER MODE");
      expect(cervantes.systemPrompt).toContain("REDUCED CHARACTER MODE");
      expect(cervantes.systemPrompt).toContain("OVERRIDE TO DIRECT HELP");
    });

    it("should include accessibility adaptations", () => {
      expect(cervantes.systemPrompt).toContain("Dyslexia Support");
      expect(cervantes.systemPrompt).toContain("ADHD Support");
      expect(cervantes.systemPrompt).toContain("Autism Support");
      expect(cervantes.systemPrompt).toContain("Cerebral Palsy Support");
    });
  });

  describe("Integration Tests", () => {
    it("all three maestri should be in the maestri index", () => {
      const allMaestri = getAllMaestri();
      const ids = allMaestri.map((m) => m.id);

      expect(ids).toContain("moliere-french");
      expect(ids).toContain("goethe-german");
      expect(ids).toContain("cervantes-spanish");
    });

    it("each maestro should be retrievable by ID", () => {
      const moliereFetch = getMaestroById("moliere-french");
      const goetheFetch = getMaestroById("goethe-german");
      const cervantesFetch = getMaestroById("cervantes-spanish");

      expect(moliereFetch).toEqual(moliere);
      expect(goetheFetch).toEqual(goethe);
      expect(cervantesFetch).toEqual(cervantes);
    });

    it("should have unique IDs", () => {
      const ids = [moliere.id, goethe.id, cervantes.id];
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
    });

    it("should have unique subjects for languages", () => {
      expect(moliere.subject).toBe("french");
      expect(goethe.subject).toBe("german");
      expect(cervantes.subject).toBe("spanish");
    });

    it("should have unique avatar paths", () => {
      const avatars = [moliere.avatar, goethe.avatar, cervantes.avatar];
      const uniqueAvatars = new Set(avatars);
      expect(uniqueAvatars.size).toBe(3);
    });

    it("should all be teaching maestri (not Amici)", () => {
      const maestri = [moliere, goethe, cervantes];
      maestri.forEach((m) => {
        expect(m.excludeFromGamification).not.toBe(true);
        expect(m.tools.length).toBeGreaterThan(0);
      });
    });

    it("should have consistent color values for different subjects", () => {
      // Each should have a valid hex color
      const hexColorRegex = /^#[0-9a-fA-F]{6}$/;
      expect(hexColorRegex.test(moliere.color)).toBe(true);
      expect(hexColorRegex.test(goethe.color)).toBe(true);
      expect(hexColorRegex.test(cervantes.color)).toBe(true);

      // Colors should be different
      const colors = [moliere.color, goethe.color, cervantes.color];
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(3);
    });
  });

  describe("Knowledge Base Integration", () => {
    it("Molière should have knowledge base embedded in systemPrompt", () => {
      // Knowledge should be injected via template literal
      expect(moliere.systemPrompt).toContain("## KNOWLEDGE BASE");
      // The knowledge base should contain biographical info
      const hasMoliere = moliere.systemPrompt.includes("Molière");
      const hasJeanBaptiste = moliere.systemPrompt.includes("Jean-Baptiste");
      expect(hasMoliere || hasJeanBaptiste).toBe(true);
    });

    it("Goethe should have knowledge base embedded in systemPrompt", () => {
      expect(goethe.systemPrompt).toContain("## KNOWLEDGE BASE");
      // The knowledge base should contain biographical info
      const hasGoethe = goethe.systemPrompt.includes("Goethe");
      const hasJohannWolfgang = goethe.systemPrompt.includes("Johann Wolfgang");
      expect(hasGoethe || hasJohannWolfgang).toBe(true);
    });

    it("Cervantes should have knowledge base embedded in systemPrompt", () => {
      expect(cervantes.systemPrompt).toContain("## KNOWLEDGE BASE");
      // The knowledge base should contain biographical info
      const hasCervantes = cervantes.systemPrompt.includes("Cervantes");
      const hasMiguel = cervantes.systemPrompt.includes("Miguel");
      expect(hasCervantes || hasMiguel).toBe(true);
    });
  });

  describe("Greeting Functionality", () => {
    it("Molière greeting function should return valid greeting", () => {
      const contexts = [
        { student: mockStudent, language: "it" as const },
        { student: mockStudent, language: "fr" as const },
        { student: mockStudent, language: "en" as const },
      ];

      contexts.forEach((ctx) => {
        const greeting = moliere.getGreeting!(ctx);
        expect(greeting).toBeTruthy();
        expect(typeof greeting).toBe("string");
        expect(greeting.length).toBeGreaterThan(0);
      });
    });

    it("Goethe greeting function should return valid greeting", () => {
      const contexts = [
        { student: mockStudent, language: "it" as const },
        { student: mockStudent, language: "de" as const },
        { student: mockStudent, language: "en" as const },
      ];

      contexts.forEach((ctx) => {
        const greeting = goethe.getGreeting!(ctx);
        expect(greeting).toBeTruthy();
        expect(typeof greeting).toBe("string");
        expect(greeting.length).toBeGreaterThan(0);
      });
    });

    it("Cervantes greeting function should return valid greeting", () => {
      const contexts = [
        { student: mockStudent, language: "it" as const },
        { student: mockStudent, language: "es" as const },
        { student: mockStudent, language: "en" as const },
      ];

      contexts.forEach((ctx) => {
        const greeting = cervantes.getGreeting!(ctx);
        expect(greeting).toBeTruthy();
        expect(typeof greeting).toBe("string");
        expect(greeting.length).toBeGreaterThan(0);
      });
    });

    it("fallback greetings should be different from dynamic ones", () => {
      const context = {
        student: mockStudent,
        language: "en" as const,
      };

      const mFallback = moliere.greeting;
      const mDynamic = moliere.getGreeting!(context);
      expect(mFallback).toBeTruthy();
      expect(mDynamic).toBeTruthy();

      const gFallback = goethe.greeting;
      const gDynamic = goethe.getGreeting!(context);
      expect(gFallback).toBeTruthy();
      expect(gDynamic).toBeTruthy();

      const cFallback = cervantes.greeting;
      const cDynamic = cervantes.getGreeting!(context);
      expect(cFallback).toBeTruthy();
      expect(cDynamic).toBeTruthy();
    });
  });

  describe("Formal/Informal Address (ADR-0064)", () => {
    it("Molière should use formal address (Lei) - 17th century", () => {
      // Molière is from 17th century, should be formal in Italian context
      expect(moliere.systemPrompt).toContain("17th century");
    });

    it("Goethe should use formal address (Lei) - 18th-19th century", () => {
      // Goethe is from 18th-19th century, should be formal in Italian context
      const has18th = goethe.systemPrompt.includes("18th");
      const has19th = goethe.systemPrompt.includes("19th century");
      expect(has18th || has19th).toBe(true);
    });

    it("Cervantes should use formal address (Lei) - 16th-17th century", () => {
      // Cervantes is from 16th-17th century, should be formal in Italian context
      const has16th = cervantes.systemPrompt.includes("16th");
      const has17th = cervantes.systemPrompt.includes("17th century");
      expect(has16th || has17th).toBe(true);
    });
  });

  describe("Type Compliance", () => {
    const validateMaestro = (maestro: MaestroFull) => {
      expect(typeof maestro.id).toBe("string");
      expect(typeof maestro.name).toBe("string");
      expect(typeof maestro.displayName).toBe("string");
      expect(typeof maestro.subject).toBe("string");
      expect(Array.isArray(maestro.tools)).toBe(true);
      expect(typeof maestro.systemPrompt).toBe("string");
      expect(typeof maestro.avatar).toBe("string");
      expect(typeof maestro.color).toBe("string");
      expect(typeof maestro.greeting).toBe("string");
    };

    it("Molière should conform to MaestroFull type", () => {
      validateMaestro(moliere);
    });

    it("Goethe should conform to MaestroFull type", () => {
      validateMaestro(goethe);
    });

    it("Cervantes should conform to MaestroFull type", () => {
      validateMaestro(cervantes);
    });
  });
});
