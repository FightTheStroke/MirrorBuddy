/**
 * @file formality-languages.test.ts
 * @brief Tests for language-specific formality terminology and system prompts
 *
 * Verifies formal/informal address terminology across all 5 languages
 * and validates system prompt sections.
 */

import { describe, it, expect } from "vitest";
import {
  getFormalityTerms,
  getExamplePhrases,
  FORMALITY_TERMS,
  FORMAL_ADDRESS_SECTIONS,
  INFORMAL_ADDRESS_SECTIONS,
} from "../formality-rules";
import type { SupportedLanguage } from "@/app/api/chat/types";

describe("Language-Specific Formality Tests", () => {
  const languages: SupportedLanguage[] = ["it", "fr", "de", "es", "en"];

  describe("FORMALITY_TERMS Structure", () => {
    it("has entries for all 5 languages", () => {
      for (const lang of languages) {
        expect(FORMALITY_TERMS[lang]).toBeDefined();
        expect(FORMALITY_TERMS[lang].formal).toBeDefined();
        expect(FORMALITY_TERMS[lang].informal).toBeDefined();
      }
    });

    it("has pronouns defined correctly per language", () => {
      expect(FORMALITY_TERMS.it.formal.pronoun).toBe("Lei");
      expect(FORMALITY_TERMS.fr.formal.pronoun).toBe("Vous");
      expect(FORMALITY_TERMS.de.formal.pronoun).toBe("Sie");
      expect(FORMALITY_TERMS.es.formal.pronoun).toBe("Usted");
      expect(FORMALITY_TERMS.en.formal.pronoun).toContain("formal");
    });

    it("has at least 4 example phrases per language/formality", () => {
      for (const lang of languages) {
        expect(
          FORMALITY_TERMS[lang].formal.examples.length,
        ).toBeGreaterThanOrEqual(4);
        expect(
          FORMALITY_TERMS[lang].informal.examples.length,
        ).toBeGreaterThanOrEqual(4);
      }
    });

    it("maintains consistent structure across all languages", () => {
      for (const lang of languages) {
        expect(FORMALITY_TERMS[lang]).toHaveProperty("formal");
        expect(FORMALITY_TERMS[lang]).toHaveProperty("informal");
        expect(FORMALITY_TERMS[lang].formal).toHaveProperty("pronoun");
        expect(FORMALITY_TERMS[lang].formal).toHaveProperty("examples");
        expect(FORMALITY_TERMS[lang].informal).toHaveProperty("pronoun");
        expect(FORMALITY_TERMS[lang].informal).toHaveProperty("examples");
      }
    });

    it("example counts are consistent (4 per formality)", () => {
      for (const lang of languages) {
        expect(FORMALITY_TERMS[lang].formal.examples.length).toBe(4);
        expect(FORMALITY_TERMS[lang].informal.examples.length).toBe(4);
      }
    });
  });

  describe("System Prompt Sections Quality", () => {
    it("FORMAL_ADDRESS_SECTIONS complete for all languages", () => {
      for (const lang of languages) {
        const section = FORMAL_ADDRESS_SECTIONS[lang];
        expect(section).toBeDefined();
        expect(section.length).toBeGreaterThan(200);
        expect(section).toContain("ADR 0064");
        const hasFormalityMarker =
          section.includes("FORMAL") ||
          section.includes("FORMALE") ||
          section.includes("FORMEL");
        expect(hasFormalityMarker).toBe(true);
      }
    });

    it("INFORMAL_ADDRESS_SECTIONS complete for all languages", () => {
      for (const lang of languages) {
        const section = INFORMAL_ADDRESS_SECTIONS[lang];
        expect(section).toBeDefined();
        expect(section.length).toBeGreaterThan(100);
        const hasMarker =
          section.includes("##") ||
          section.includes("INFORMAL") ||
          section.includes("informale");
        expect(hasMarker).toBe(true);
      }
    });

    it("sections include examples and guidelines", () => {
      for (const lang of languages) {
        const formal = FORMAL_ADDRESS_SECTIONS[lang];
        const informal = INFORMAL_ADDRESS_SECTIONS[lang];
        const hasExamples =
          formal.includes("Esempio") ||
          formal.includes("Esempi") ||
          formal.includes("Exemple") ||
          formal.includes("Beispiel") ||
          formal.includes("Ejemplos") ||
          formal.includes("Ejemplo") ||
          formal.includes("Examples") ||
          formal.includes("Example");
        expect(hasExamples).toBe(true);
        expect(formal).toMatch(/\*\*/);
        expect(informal).toMatch(/[-•*]/);
      }
    });

    it("formal sections contain formal pronouns", () => {
      expect(FORMAL_ADDRESS_SECTIONS.it).toContain("Lei");
      expect(FORMAL_ADDRESS_SECTIONS.fr).toContain("Vous");
      expect(FORMAL_ADDRESS_SECTIONS.de).toContain("Sie");
      expect(FORMAL_ADDRESS_SECTIONS.es).toContain("Usted");
    });

    it("informal sections contain informal pronouns", () => {
      expect(INFORMAL_ADDRESS_SECTIONS.it).toContain("tu");
      expect(INFORMAL_ADDRESS_SECTIONS.fr).toContain("tu");
      expect(INFORMAL_ADDRESS_SECTIONS.de).toContain("du");
      expect(INFORMAL_ADDRESS_SECTIONS.es).toContain("tú");
    });
  });

  describe("Language-Specific Pronoun Usage", () => {
    it("Italian: Lei (formal) vs tu (informal)", () => {
      expect(FORMALITY_TERMS.it.formal.pronoun).toBe("Lei");
      expect(FORMALITY_TERMS.it.informal.pronoun).toBe("tu");
      const formalExamples = getExamplePhrases("it", true);
      const informalExamples = getExamplePhrases("it", false);
      expect(formalExamples.some((ex) => ex.includes("Lei"))).toBe(true);
      expect(informalExamples.some((ex) => ex.includes("Lei"))).toBe(false);
    });

    it("French: Vous (formal) vs tu (informal)", () => {
      expect(FORMALITY_TERMS.fr.formal.pronoun).toBe("Vous");
      expect(FORMALITY_TERMS.fr.informal.pronoun).toBe("tu");
      const formalExamples = getExamplePhrases("fr", true);
      expect(formalExamples.some((ex) => ex.includes("vous"))).toBe(true);
    });

    it("German: Sie (formal) vs du (informal)", () => {
      expect(FORMALITY_TERMS.de.formal.pronoun).toBe("Sie");
      expect(FORMALITY_TERMS.de.informal.pronoun).toBe("du");
      const formalExamples = getExamplePhrases("de", true);
      const informalExamples = getExamplePhrases("de", false);
      expect(formalExamples.some((ex) => ex.includes("Sie"))).toBe(true);
      expect(informalExamples.some((ex) => ex.includes("Sie"))).toBe(false);
    });

    it("Spanish: Usted (formal) vs tú (informal)", () => {
      expect(FORMALITY_TERMS.es.formal.pronoun).toBe("Usted");
      expect(FORMALITY_TERMS.es.informal.pronoun).toBe("tú");
      const formalExamples = getExamplePhrases("es", true);
      const hasUsted =
        formalExamples.some((ex) => ex.includes("usted")) ||
        formalExamples.some((ex) => ex.includes("Usted"));
      expect(hasUsted).toBe(true);
    });
  });

  describe("Example Phrase Functions", () => {
    it("getExamplePhrases returns correct format", () => {
      const formal = getExamplePhrases("it", true);
      const informal = getExamplePhrases("it", false);
      expect(Array.isArray(formal)).toBe(true);
      expect(Array.isArray(informal)).toBe(true);
      expect(formal.length).toBeGreaterThan(0);
      expect(informal.length).toBeGreaterThan(0);
    });

    it("getFormalityTerms returns correct structure", () => {
      for (const lang of languages) {
        const terms = getFormalityTerms(lang);
        expect(terms.formal.pronoun).toBeTruthy();
        expect(terms.informal.pronoun).toBeTruthy();
        expect(terms.formal.examples).toBeDefined();
        expect(terms.informal.examples).toBeDefined();
      }
    });
  });
});
