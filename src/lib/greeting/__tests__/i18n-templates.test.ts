/**
 * Tests for i18n-aware greeting templates
 */

import { describe, it, expect } from "vitest";
import {
  getMaestroGreetingTemplate,
  getCoachGreetingTemplate,
  applyTemplate,
  normalizeMaestroKey,
  MAESTRI_GREETING_TEMPLATES,
} from "../i18n-templates";

describe("i18n-templates", () => {
  describe("normalizeMaestroKey", () => {
    it("should extract the maestro key from full ID", () => {
      expect(normalizeMaestroKey("euclide-matematica")).toBe("euclide");
      expect(normalizeMaestroKey("shakespeare-inglese")).toBe("shakespeare");
      expect(normalizeMaestroKey("leonardo-arte")).toBe("leonardo");
    });

    it("should handle single-word IDs", () => {
      expect(normalizeMaestroKey("mascetti")).toBe("mascetti");
    });
  });

  describe("applyTemplate", () => {
    it("should replace template variables", () => {
      const template = "Ciao! Sono {name}. Come posso aiutarti oggi?";
      const result = applyTemplate(template, { name: "Euclide" });
      expect(result).toBe("Ciao! Sono Euclide. Come posso aiutarti oggi?");
    });

    it("should handle multiple variables", () => {
      const template = "Sono {name}, insegno {subject}.";
      const result = applyTemplate(template, {
        name: "Euclide",
        subject: "matematica",
      });
      expect(result).toBe("Sono Euclide, insegno matematica.");
    });

    it("should handle templates without variables", () => {
      const template = "Ciao! Come stai?";
      const result = applyTemplate(template, { name: "Test" });
      expect(result).toBe("Ciao! Come stai?");
    });
  });

  describe("getMaestroGreetingTemplate", () => {
    it("should return generic greeting by default (usePersonalized=false)", () => {
      const greeting = getMaestroGreetingTemplate("euclide", "it", false, false);
      expect(greeting).toContain("Ciao");
      expect(greeting).toContain("{name}");
      expect(greeting).not.toContain("matematica"); // Not personalized
    });

    it("should return personalized greeting when usePersonalized=true", () => {
      const greeting = getMaestroGreetingTemplate("euclide", "it", false, true);
      expect(greeting).toContain("Euclide");
      expect(greeting).toContain("matematica");
    });

    it("should return personalized greeting for Shakespeare when enabled", () => {
      const greeting = getMaestroGreetingTemplate("shakespeare", "it", false, true);
      expect(greeting).toContain("Shakespeare");
      expect(greeting).toContain("inglese");
    });

    it("should return personalized greeting for Mascetti when enabled", () => {
      const greeting = getMaestroGreetingTemplate("mascetti", "it", false, true);
      expect(greeting).toContain("Mascetti");
      expect(greeting).toContain("antani");
    });

    it("should return formal greeting when isFormal=true", () => {
      const greeting = getMaestroGreetingTemplate("unknown", "it", true, false);
      expect(greeting).toContain("Buongiorno");
      expect(greeting).toContain("esserLe");
    });

    it("should return generic greeting when isFormal=false and maestro unknown", () => {
      const greeting = getMaestroGreetingTemplate("unknown", "it", false, false);
      expect(greeting).toContain("Ciao");
      expect(greeting).toContain("{name}");
    });

    it("should work for all supported languages (generic mode)", () => {
      const languages = ["it", "en", "es", "fr", "de"] as const;
      languages.forEach((lang) => {
        const greeting = getMaestroGreetingTemplate("euclide", lang, false, false);
        expect(greeting).toBeTruthy();
        expect(greeting.length).toBeGreaterThan(0);
        expect(greeting).toContain("{name}"); // Generic template
      });
    });

    it("should work for all supported languages (personalized mode)", () => {
      const languages = ["it", "en", "es", "fr", "de"] as const;
      languages.forEach((lang) => {
        const greeting = getMaestroGreetingTemplate("euclide", lang, false, true);
        expect(greeting).toBeTruthy();
        expect(greeting.length).toBeGreaterThan(0);
      });
    });
  });

  describe("getCoachGreetingTemplate", () => {
    it("should return coach greeting for Italian", () => {
      const greeting = getCoachGreetingTemplate("it");
      expect(greeting).toContain("imparare");
      expect(greeting).toContain("{name}");
    });

    it("should return coach greeting for English", () => {
      const greeting = getCoachGreetingTemplate("en");
      expect(greeting).toContain("learn");
      expect(greeting).toContain("{name}");
    });

    it("should work for all supported languages", () => {
      const languages = ["it", "en", "es", "fr", "de"] as const;
      languages.forEach((lang) => {
        const greeting = getCoachGreetingTemplate(lang);
        expect(greeting).toBeTruthy();
        expect(greeting).toContain("{name}");
      });
    });
  });

  describe("MAESTRI_GREETING_TEMPLATES", () => {
    it("should have all 5 supported languages", () => {
      expect(MAESTRI_GREETING_TEMPLATES).toHaveProperty("it");
      expect(MAESTRI_GREETING_TEMPLATES).toHaveProperty("en");
      expect(MAESTRI_GREETING_TEMPLATES).toHaveProperty("es");
      expect(MAESTRI_GREETING_TEMPLATES).toHaveProperty("fr");
      expect(MAESTRI_GREETING_TEMPLATES).toHaveProperty("de");
    });

    it("should have generic, formal, and coach templates for each language", () => {
      const languages = ["it", "en", "es", "fr", "de"] as const;
      languages.forEach((lang) => {
        expect(MAESTRI_GREETING_TEMPLATES[lang]).toHaveProperty("generic");
        expect(MAESTRI_GREETING_TEMPLATES[lang]).toHaveProperty("formal");
        expect(MAESTRI_GREETING_TEMPLATES[lang]).toHaveProperty("coach");
        expect(MAESTRI_GREETING_TEMPLATES[lang]).toHaveProperty("maestri");
      });
    });

    it("should have personalized greetings for all 22 maestri", () => {
      const expectedMaestri = [
        "leonardo",
        "galileo",
        "curie",
        "cicerone",
        "lovelace",
        "smith",
        "shakespeare",
        "humboldt",
        "erodoto",
        "manzoni",
        "euclide",
        "mozart",
        "socrate",
        "ippocrate",
        "feynman",
        "darwin",
        "chris",
        "omero",
        "alexPina",
        "mascetti",
        "simone",
        "cassese",
      ];

      expectedMaestri.forEach((maestro) => {
        const itTemplate = MAESTRI_GREETING_TEMPLATES.it.maestri;
        expect(itTemplate).toHaveProperty(maestro);
        expect(itTemplate[maestro as keyof typeof itTemplate]).toBeTruthy();
      });
    });
  });
});
