/**
 * @file formality-edge-cases.test.ts
 * @brief Tests for edge cases, integration, and advanced formality scenarios
 *
 * Verifies edge case handling, special input parsing, and system prompt section injection.
 */

import { describe, it, expect } from "vitest";
import {
  FORMAL_PROFESSORS,
  INFORMAL_PROFESSORS,
  isFormalCharacter,
  getFormalitySection,
  FORMAL_ADDRESS_SECTIONS,
  INFORMAL_ADDRESS_SECTIONS,
} from "../formality-rules";
import type { SupportedLanguage } from "@/app/api/chat/types";

describe("Formality Rules Edge Cases & Integration", () => {
  describe("Edge Cases and Special Inputs", () => {
    describe("Character ID Parsing", () => {
      it("handles hyphenated character IDs", () => {
        expect(isFormalCharacter("manzoni-italiano", "maestro")).toBe(true);
        expect(isFormalCharacter("galileo-fisica", "maestro")).toBe(true);
        expect(isFormalCharacter("feynman-physics", "maestro")).toBe(false);
      });

      it("handles multiple hyphens in character ID", () => {
        expect(isFormalCharacter("manzoni-italian-writer", "maestro")).toBe(
          true,
        );
        expect(isFormalCharacter("some-feynman-variant", "maestro")).toBe(false);
      });

      it("handles mixed case character IDs", () => {
        expect(isFormalCharacter("MANZONI", "maestro")).toBe(true);
        expect(isFormalCharacter("Galileo", "maestro")).toBe(true);
        expect(isFormalCharacter("FeyNmAn", "maestro")).toBe(false);
      });
    });

    describe("Language Parameter Validation", () => {
      it("supports all 5 required languages", () => {
        const languages: SupportedLanguage[] = ["it", "fr", "de", "es", "en"];
        for (const lang of languages) {
          const section = getFormalitySection("manzoni", "maestro", lang);
          expect(section).toBeDefined();
          expect(section.length).toBeGreaterThan(100);
        }
      });

      it("language support is complete for all 5 languages", () => {
        const languages: SupportedLanguage[] = ["it", "fr", "de", "es", "en"];
        for (const lang of languages) {
          expect(FORMAL_ADDRESS_SECTIONS[lang]).toBeDefined();
          expect(INFORMAL_ADDRESS_SECTIONS[lang]).toBeDefined();
        }
      });
    });
  });

  describe("Formality Section Injection Tests", () => {
    it("getFormalitySection returns correct section based on character", () => {
      const formalSection = getFormalitySection("manzoni", "maestro", "it");
      expect(formalSection).toBe(FORMAL_ADDRESS_SECTIONS.it);
      expect(formalSection).toContain("Lei");

      const informalSection = getFormalitySection("feynman", "maestro", "it");
      expect(informalSection).toBe(INFORMAL_ADDRESS_SECTIONS.it);
      expect(informalSection).toContain("tu");
    });

    it("getFormalitySection handles all character types correctly", () => {
      const characterTypes: Array<"maestro" | "coach" | "buddy"> = [
        "maestro",
        "coach",
        "buddy",
      ];

      for (const charType of characterTypes) {
        const section = getFormalitySection("any-id", charType, "it");
        if (charType === "coach" || charType === "buddy") {
          expect(section).toBe(INFORMAL_ADDRESS_SECTIONS.it);
        }
      }
    });

    it("getFormalitySection works across all languages", () => {
      const languages: SupportedLanguage[] = ["it", "fr", "de", "es", "en"];
      for (const lang of languages) {
        const formalSection = getFormalitySection("galileo", "maestro", lang);
        const informalSection = getFormalitySection("feynman", "maestro", lang);

        expect(formalSection).toBe(FORMAL_ADDRESS_SECTIONS[lang]);
        expect(informalSection).toBe(INFORMAL_ADDRESS_SECTIONS[lang]);
      }
    });

    it("formal sections appropriate for formal characters in all languages", () => {
      const languages: SupportedLanguage[] = ["it", "fr", "de", "es", "en"];
      const formalCharacters = ["manzoni", "galileo", "shakespeare"];

      for (const lang of languages) {
        for (const char of formalCharacters) {
          const section = getFormalitySection(char, "maestro", lang);
          expect(section).toBe(FORMAL_ADDRESS_SECTIONS[lang]);
        }
      }
    });

    it("informal sections appropriate for modern characters in all languages", () => {
      const languages: SupportedLanguage[] = ["it", "fr", "de", "es", "en"];
      const informalCharacters = ["feynman", "chris", "simone"];

      for (const lang of languages) {
        for (const char of informalCharacters) {
          const section = getFormalitySection(char, "maestro", lang);
          expect(section).toBe(INFORMAL_ADDRESS_SECTIONS[lang]);
        }
      }
    });
  });

  describe("Professor List Integrity", () => {
    it("no professor appears in both formal and informal lists", () => {
      const formalSet = new Set(FORMAL_PROFESSORS);
      const informalSet = new Set(INFORMAL_PROFESSORS);

      const overlap = FORMAL_PROFESSORS.filter((prof) =>
        informalSet.has(prof),
      );

      expect(overlap.length).toBe(0);
    });

    it("all formal professors are non-empty strings", () => {
      for (const prof of FORMAL_PROFESSORS) {
        expect(prof).toBeTruthy();
        expect(typeof prof).toBe("string");
        expect(prof.length).toBeGreaterThan(0);
      }
    });

    it("all informal professors are non-empty strings", () => {
      for (const prof of INFORMAL_PROFESSORS) {
        expect(prof).toBeTruthy();
        expect(typeof prof).toBe("string");
        expect(prof.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Professor List Completeness", () => {
    it("formal professors list contains at least 15 members", () => {
      expect(FORMAL_PROFESSORS.length).toBeGreaterThanOrEqual(15);
    });

    it("informal professors list contains at least 4 members", () => {
      expect(INFORMAL_PROFESSORS.length).toBeGreaterThanOrEqual(4);
    });

    it("all formal professors are identifiable by ID", () => {
      for (const prof of FORMAL_PROFESSORS) {
        const isFormal = isFormalCharacter(prof, "maestro");
        expect(isFormal).toBe(true);
      }
    });

    it("all informal professors are identifiable by ID", () => {
      for (const prof of INFORMAL_PROFESSORS) {
        const isFormal = isFormalCharacter(prof, "maestro");
        expect(isFormal).toBe(false);
      }
    });
  });

  describe("Character Type Enforcement", () => {
    it("coaches always return informal section", () => {
      const languages: SupportedLanguage[] = ["it", "fr", "de", "es", "en"];
      for (const lang of languages) {
        const section = getFormalitySection("any-coach", "coach", lang);
        expect(section).toBe(INFORMAL_ADDRESS_SECTIONS[lang]);
      }
    });

    it("buddies always return informal section", () => {
      const languages: SupportedLanguage[] = ["it", "fr", "de", "es", "en"];
      for (const lang of languages) {
        const section = getFormalitySection("any-buddy", "buddy", lang);
        expect(section).toBe(INFORMAL_ADDRESS_SECTIONS[lang]);
      }
    });

    it("coaches always use informal regardless of character ID", () => {
      const formalCharNames = ["manzoni", "galileo", "shakespeare"];
      for (const charName of formalCharNames) {
        expect(isFormalCharacter(charName, "coach")).toBe(false);
      }
    });

    it("buddies always use informal regardless of character ID", () => {
      const formalCharNames = ["manzoni", "galileo", "shakespeare"];
      for (const charName of formalCharNames) {
        expect(isFormalCharacter(charName, "buddy")).toBe(false);
      }
    });
  });

  describe("System Prompt Section Quality Assurance", () => {
    it("formal sections provide comprehensive guidance", () => {
      const languages: SupportedLanguage[] = ["it", "fr", "de", "es", "en"];
      for (const lang of languages) {
        const section = FORMAL_ADDRESS_SECTIONS[lang];
        // Each section should provide multiple guidelines
        const hasMultipleGuidelines = (
          section.match(/[-•*]/g) || []
        ).length >= 6;
        expect(hasMultipleGuidelines).toBe(true);
      }
    });

    it("informal sections provide clear instructions", () => {
      const languages: SupportedLanguage[] = ["it", "fr", "de", "es", "en"];
      for (const lang of languages) {
        const section = INFORMAL_ADDRESS_SECTIONS[lang];
        expect(section.length).toBeGreaterThan(100);
      }
    });

    it("sections contain markdown formatting", () => {
      const languages: SupportedLanguage[] = ["it", "fr", "de", "es", "en"];
      for (const lang of languages) {
        const formalSection = FORMAL_ADDRESS_SECTIONS[lang];
        const informalSection = INFORMAL_ADDRESS_SECTIONS[lang];
        expect(formalSection).toMatch(/\*\*/);
        expect(informalSection).toMatch(/[-•*]/);
      }
    });
  });
});
