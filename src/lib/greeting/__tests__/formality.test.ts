/**
 * @file formality.test.ts
 * @brief Tests for formal/informal professor address (ADR 0064)
 *
 * These tests verify that professors use appropriate register (Lei vs tu)
 * in greetings and throughout conversations.
 */

import { describe, it, expect } from "vitest";
import {
  FORMAL_PROFESSORS,
  FORMAL_GREETINGS,
  GENERIC_GREETINGS,
  isFormalProfessor,
  applyGreetingTemplate,
} from "../templates";
import { generateMaestroGreeting } from "../greeting-generator";

describe("ADR 0064: Formal/Informal Professor Address", () => {
  describe("isFormalProfessor", () => {
    it("identifies formal professors correctly", () => {
      const formalProfessors = [
        "manzoni",
        "shakespeare",
        "erodoto",
        "cicerone",
        "socrate",
        "mozart",
        "galileo",
        "darwin",
        "curie",
        "leonardo",
        "euclide",
        "smith",
        "humboldt",
        "ippocrate",
        "lovelace",
        "cassese",
        "omero",
      ];

      for (const prof of formalProfessors) {
        expect(isFormalProfessor(prof)).toBe(true);
        expect(isFormalProfessor(`${prof}-subject`)).toBe(true);
      }
    });

    it("identifies informal professors correctly", () => {
      const informalProfessors = ["feynman", "chris", "simone", "alex-pina"];

      for (const prof of informalProfessors) {
        expect(isFormalProfessor(prof)).toBe(false);
      }
    });

    it("handles case insensitivity", () => {
      expect(isFormalProfessor("MANZONI")).toBe(true);
      expect(isFormalProfessor("Galileo")).toBe(true);
      expect(isFormalProfessor("FEYNMAN")).toBe(false);
    });

    it("handles character IDs with suffixes", () => {
      expect(isFormalProfessor("manzoni-italiano")).toBe(true);
      expect(isFormalProfessor("galileo-fisica")).toBe(true);
      expect(isFormalProfessor("feynman-physics")).toBe(false);
    });
  });

  describe("FORMAL_PROFESSORS constant", () => {
    it("contains expected professors", () => {
      expect(FORMAL_PROFESSORS).toContain("manzoni");
      expect(FORMAL_PROFESSORS).toContain("shakespeare");
      expect(FORMAL_PROFESSORS).toContain("galileo");
    });

    it("does not contain informal professors", () => {
      expect(FORMAL_PROFESSORS).not.toContain("feynman");
      expect(FORMAL_PROFESSORS).not.toContain("chris");
      expect(FORMAL_PROFESSORS).not.toContain("simone");
    });
  });

  describe("FORMAL_GREETINGS", () => {
    it("uses formal address in Italian (Lei)", () => {
      expect(FORMAL_GREETINGS.it).toContain("esserLe");
    });

    it("uses formal address in German (Sie)", () => {
      expect(FORMAL_GREETINGS.de).toContain("Ihnen");
    });

    it("uses formal address in French (vous)", () => {
      expect(FORMAL_GREETINGS.fr).toContain("vous");
    });

    it("uses formal address in Spanish (usted)", () => {
      expect(FORMAL_GREETINGS.es).toContain("servirle");
    });

    it("uses formal address in English", () => {
      expect(FORMAL_GREETINGS.en).toContain("may I assist");
    });
  });

  describe("GENERIC_GREETINGS (informal)", () => {
    it("uses informal address in Italian (tu)", () => {
      expect(GENERIC_GREETINGS.it).toContain("aiutarti");
    });

    it("uses informal address in German (du)", () => {
      expect(GENERIC_GREETINGS.de).toContain("dir");
    });

    it("uses informal address in French (tu)", () => {
      expect(GENERIC_GREETINGS.fr).toContain("t'aider");
    });

    it("uses informal address in Spanish (tú)", () => {
      expect(GENERIC_GREETINGS.es).toContain("ayudarte");
    });
  });

  describe("generateMaestroGreeting", () => {
    it("generates formal greeting for Manzoni", () => {
      const greeting = generateMaestroGreeting(
        "manzoni",
        "Alessandro Manzoni",
        "it",
      );
      expect(greeting).toContain("esserLe");
    });

    it("generates informal greeting for Feynman", () => {
      const greeting = generateMaestroGreeting(
        "feynman",
        "Richard Feynman",
        "it",
      );
      expect(greeting).toContain("aiutarti");
    });

    it("generates formal greeting in German for Galileo", () => {
      const greeting = generateMaestroGreeting(
        "galileo",
        "Galileo Galilei",
        "de",
      );
      expect(greeting).toContain("Ihnen");
    });

    it("generates informal greeting in German for Chris", () => {
      const greeting = generateMaestroGreeting("chris", "Chris", "de");
      expect(greeting).toContain("dir");
    });
  });

  describe("applyGreetingTemplate", () => {
    it("replaces name placeholder", () => {
      const result = applyGreetingTemplate("Hello {name}!", { name: "Test" });
      expect(result).toBe("Hello Test!");
    });

    it("handles multiple placeholders", () => {
      const result = applyGreetingTemplate("{greeting} {name}!", {
        greeting: "Ciao",
        name: "Mario",
      });
      expect(result).toBe("Ciao Mario!");
    });

    it("is safe from regex injection", () => {
      // This tests that we use split/join instead of regex
      const result = applyGreetingTemplate("Hello {name}!", { name: "$&test" });
      expect(result).toBe("Hello $&test!");
    });
  });
});
