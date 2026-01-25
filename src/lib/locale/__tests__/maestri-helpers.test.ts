/**
 * Tests for locale maestri helpers
 */

import { describe, it, expect } from "vitest";
import {
  getLanguageMaestri,
  getLanguageMaestroOptions,
  isValidLanguageMaestro,
} from "../maestri-helpers";

describe("maestri-helpers", () => {
  describe("getLanguageMaestri", () => {
    it("should return only language maestri", () => {
      const languageMaestri = getLanguageMaestri();

      expect(languageMaestri.length).toBeGreaterThan(0);

      const languageSubjects = [
        "italian",
        "english",
        "french",
        "german",
        "spanish",
      ];

      languageMaestri.forEach((maestro) => {
        expect(languageSubjects).toContain(maestro.subject);
      });
    });

    it("should include Manzoni for Italian", () => {
      const languageMaestri = getLanguageMaestri();
      const manzoni = languageMaestri.find((m) => m.id === "manzoni-italiano");

      expect(manzoni).toBeDefined();
      expect(manzoni?.subject).toBe("italian");
    });

    it("should include Shakespeare for English", () => {
      const languageMaestri = getLanguageMaestri();
      const shakespeare = languageMaestri.find(
        (m) => m.id === "shakespeare-inglese",
      );

      expect(shakespeare).toBeDefined();
      expect(shakespeare?.subject).toBe("english");
    });

    it("should include Molière for French", () => {
      const languageMaestri = getLanguageMaestri();
      const moliere = languageMaestri.find((m) => m.id === "moliere-french");

      expect(moliere).toBeDefined();
      expect(moliere?.subject).toBe("french");
    });

    it("should include Goethe for German", () => {
      const languageMaestri = getLanguageMaestri();
      const goethe = languageMaestri.find((m) => m.id === "goethe-german");

      expect(goethe).toBeDefined();
      expect(goethe?.subject).toBe("german");
    });

    it("should include Spanish maestri (Cervantes and Alex Pina)", () => {
      const languageMaestri = getLanguageMaestri();
      const spanishMaestri = languageMaestri.filter(
        (m) => m.subject === "spanish",
      );

      expect(spanishMaestri.length).toBeGreaterThanOrEqual(2);

      const cervantes = spanishMaestri.find(
        (m) => m.id === "cervantes-spanish",
      );
      const alexPina = spanishMaestri.find(
        (m) => m.id === "alex-pina-spagnolo",
      );

      expect(cervantes).toBeDefined();
      expect(alexPina).toBeDefined();
    });

    it("should not include non-language maestri", () => {
      const languageMaestri = getLanguageMaestri();

      // These are non-language maestri
      const nonLanguageIds = [
        "euclide-matematica",
        "galileo",
        "curie",
        "darwin",
        "socrate",
      ];

      nonLanguageIds.forEach((id) => {
        const found = languageMaestri.find((m) => m.id === id);
        expect(found).toBeUndefined();
      });
    });
  });

  describe("getLanguageMaestroOptions", () => {
    it("should return options with required fields", () => {
      const options = getLanguageMaestroOptions();

      expect(options.length).toBeGreaterThan(0);

      options.forEach((option) => {
        expect(option).toHaveProperty("id");
        expect(option).toHaveProperty("displayName");
        expect(option).toHaveProperty("subject");
        expect(option).toHaveProperty("subjectLabel");
        expect(typeof option.id).toBe("string");
        expect(typeof option.displayName).toBe("string");
        expect(typeof option.subject).toBe("string");
        expect(typeof option.subjectLabel).toBe("string");
      });
    });

    it("should have Italian labels for subjects", () => {
      const options = getLanguageMaestroOptions();

      const expectedLabels: Record<string, string> = {
        italian: "Italiano",
        english: "Inglese",
        french: "Francese",
        german: "Tedesco",
        spanish: "Spagnolo",
      };

      options.forEach((option) => {
        expect(option.subjectLabel).toBe(expectedLabels[option.subject]);
      });
    });

    it("should include all expected language maestri", () => {
      const options = getLanguageMaestroOptions();

      const expectedIds = [
        "manzoni-italiano",
        "shakespeare-inglese",
        "moliere-french",
        "goethe-german",
        "cervantes-spanish",
        "alex-pina-spagnolo",
      ];

      expectedIds.forEach((expectedId) => {
        const found = options.find((opt) => opt.id === expectedId);
        expect(found).toBeDefined();
      });
    });
  });

  describe("isValidLanguageMaestro", () => {
    it("should return true for valid language maestri", () => {
      const validIds = [
        "manzoni-italiano",
        "shakespeare-inglese",
        "moliere-french",
        "goethe-german",
        "cervantes-spanish",
        "alex-pina-spagnolo",
      ];

      validIds.forEach((id) => {
        expect(isValidLanguageMaestro(id)).toBe(true);
      });
    });

    it("should return false for non-language maestri", () => {
      const invalidIds = [
        "euclide-matematica",
        "galileo",
        "curie",
        "darwin",
        "socrate",
        "feynman",
      ];

      invalidIds.forEach((id) => {
        expect(isValidLanguageMaestro(id)).toBe(false);
      });
    });

    it("should return false for non-existent maestri", () => {
      expect(isValidLanguageMaestro("invalid-maestro-id")).toBe(false);
      expect(isValidLanguageMaestro("")).toBe(false);
      expect(isValidLanguageMaestro("random-string")).toBe(false);
    });
  });
});
