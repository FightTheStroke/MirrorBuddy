/**
 * @file formality-rules.test.ts
 * @brief Core tests for formality rules module
 *
 * Verifies character classification, constants, and core utility functions.
 * Additional tests: formality-languages.test.ts, formality-edge-cases.test.ts
 */

import { describe, it, expect } from "vitest";
import {
  FORMAL_PROFESSORS,
  INFORMAL_PROFESSORS,
  ALWAYS_INFORMAL_TYPES,
  isFormalCharacter,
  getFormalitySection,
  getFormalityTerms,
  getExamplePhrases,
  FORMALITY_TERMS,
  FORMAL_ADDRESS_SECTIONS,
  INFORMAL_ADDRESS_SECTIONS,
} from "../formality-rules";
import type { SupportedLanguage } from "@/app/api/chat/types";

describe("Formality Rules Module - Core Tests", () => {
  describe("Character Classification", () => {
    describe("FORMAL_PROFESSORS", () => {
      it("contains historical figures (pre-1900)", () => {
        const expected = [
          "manzoni",
          "shakespeare",
          "galileo",
          "darwin",
          "curie",
          "leonardo",
          "euclide",
          "socrate",
          "cicerone",
          "erodoto",
          "mozart",
          "smith",
          "humboldt",
          "ippocrate",
          "lovelace",
          "cassese",
          "omero",
        ];

        for (const prof of expected) {
          expect(FORMAL_PROFESSORS).toContain(prof);
        }
      });

      it("does not contain modern professors", () => {
        expect(FORMAL_PROFESSORS).not.toContain("feynman");
        expect(FORMAL_PROFESSORS).not.toContain("chris");
        expect(FORMAL_PROFESSORS).not.toContain("simone");
        expect(FORMAL_PROFESSORS).not.toContain("alex-pina");
      });
    });

    describe("INFORMAL_PROFESSORS", () => {
      it("contains modern/contemporary figures", () => {
        expect(INFORMAL_PROFESSORS).toContain("feynman");
        expect(INFORMAL_PROFESSORS).toContain("chris");
        expect(INFORMAL_PROFESSORS).toContain("simone");
        expect(INFORMAL_PROFESSORS).toContain("alex-pina");
      });
    });

    describe("isFormalCharacter", () => {
      it("identifies formal professors correctly", () => {
        expect(isFormalCharacter("manzoni", "maestro")).toBe(true);
        expect(isFormalCharacter("galileo", "maestro")).toBe(true);
        expect(isFormalCharacter("shakespeare", "maestro")).toBe(true);
        expect(isFormalCharacter("darwin", "maestro")).toBe(true);
      });

      it("identifies informal professors correctly", () => {
        expect(isFormalCharacter("feynman", "maestro")).toBe(false);
        expect(isFormalCharacter("chris", "maestro")).toBe(false);
        expect(isFormalCharacter("simone", "maestro")).toBe(false);
      });

      it("handles character IDs with suffixes", () => {
        expect(isFormalCharacter("manzoni-italiano", "maestro")).toBe(true);
        expect(isFormalCharacter("galileo-fisica", "maestro")).toBe(true);
        expect(isFormalCharacter("feynman-physics", "maestro")).toBe(false);
      });

      it("coaches always use informal", () => {
        expect(isFormalCharacter("manzoni", "coach")).toBe(false);
        expect(isFormalCharacter("galileo", "coach")).toBe(false);
        expect(isFormalCharacter("any-coach", "coach")).toBe(false);
      });

      it("buddies always use informal", () => {
        expect(isFormalCharacter("manzoni", "buddy")).toBe(false);
        expect(isFormalCharacter("galileo", "buddy")).toBe(false);
        expect(isFormalCharacter("any-buddy", "buddy")).toBe(false);
      });

      it("handles case insensitivity", () => {
        expect(isFormalCharacter("MANZONI", "maestro")).toBe(true);
        expect(isFormalCharacter("Galileo", "maestro")).toBe(true);
        expect(isFormalCharacter("FEYNMAN", "maestro")).toBe(false);
      });
    });
  });

  describe("ALWAYS_INFORMAL_TYPES Constant", () => {
    it("contains coach and buddy types", () => {
      expect(ALWAYS_INFORMAL_TYPES).toContain("coach");
      expect(ALWAYS_INFORMAL_TYPES).toContain("buddy");
    });

    it("ensures coaches and buddies never use formal address", () => {
      const formalProfs = ["manzoni", "galileo", "shakespeare"];
      const charTypes = ["coach", "buddy"] as const;

      for (const charType of charTypes) {
        for (const prof of formalProfs) {
          const isFormal = isFormalCharacter(prof, charType);
          expect(isFormal).toBe(false);
        }
      }
    });
  });

  describe("Utility Functions", () => {
    describe("getFormalitySection", () => {
      it("returns formal section for historical maestri", () => {
        const section = getFormalitySection("manzoni", "maestro", "it");
        expect(section).toBe(FORMAL_ADDRESS_SECTIONS.it);
        expect(section).toContain("Lei");
      });

      it("returns informal section for modern maestri", () => {
        const section = getFormalitySection("feynman", "maestro", "it");
        expect(section).toBe(INFORMAL_ADDRESS_SECTIONS.it);
        expect(section).toContain("tu");
      });

      it("returns informal section for coaches", () => {
        const section = getFormalitySection("any-coach", "coach", "it");
        expect(section).toBe(INFORMAL_ADDRESS_SECTIONS.it);
      });

      it("returns informal section for buddies", () => {
        const section = getFormalitySection("any-buddy", "buddy", "it");
        expect(section).toBe(INFORMAL_ADDRESS_SECTIONS.it);
      });
    });

    describe("getFormalityTerms", () => {
      it("returns terms for each language", () => {
        expect(getFormalityTerms("it").formal.pronoun).toBe("Lei");
        expect(getFormalityTerms("fr").formal.pronoun).toBe("Vous");
        expect(getFormalityTerms("de").formal.pronoun).toBe("Sie");
        expect(getFormalityTerms("es").formal.pronoun).toBe("Usted");
      });
    });

    describe("getExamplePhrases", () => {
      it("returns formal examples when isFormal=true", () => {
        const examples = getExamplePhrases("it", true);
        expect(examples).toEqual(FORMALITY_TERMS.it.formal.examples);
        expect(examples.some((ex) => ex.includes("Lei"))).toBe(true);
      });

      it("returns informal examples when isFormal=false", () => {
        const examples = getExamplePhrases("it", false);
        expect(examples).toEqual(FORMALITY_TERMS.it.informal.examples);
        expect(examples.some((ex) => ex.includes("ti"))).toBe(true);
      });
    });
  });
});
