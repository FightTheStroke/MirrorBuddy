/**
 * @file formality-injection.test.ts
 * @brief Tests for formality injection in safety guardrails (ADR 0064)
 *
 * Verifies that the injectSafetyGuardrails function correctly adds
 * formal/informal address sections based on character type.
 */

import { describe, it, expect } from "vitest";
import {
  injectSafetyGuardrails,
  hasSafetyGuardrails,
} from "../safety-prompts-core";
import {
  FORMAL_ADDRESS_SECTION,
  INFORMAL_ADDRESS_SECTION,
} from "../formality-templates";

describe("ADR 0064: Formality Injection in Safety Guardrails", () => {
  const testPrompt = "Sei un professore che insegna matematica.";

  describe("formal maestro (characterId)", () => {
    it("injects formal address section for Manzoni", () => {
      const result = injectSafetyGuardrails(testPrompt, {
        role: "maestro",
        characterId: "manzoni",
      });

      expect(result).toContain("REGISTRO FORMALE (Lei)");
      expect(result).toContain("esserLe");
      expect(result).not.toContain("REGISTRO INFORMALE");
    });

    it("injects formal address section for Galileo", () => {
      const result = injectSafetyGuardrails(testPrompt, {
        role: "maestro",
        characterId: "galileo-fisica",
      });

      expect(result).toContain("REGISTRO FORMALE (Lei)");
    });

    it("injects formal address section for Shakespeare", () => {
      const result = injectSafetyGuardrails(testPrompt, {
        role: "maestro",
        characterId: "shakespeare",
      });

      expect(result).toContain("REGISTRO FORMALE (Lei)");
    });
  });

  describe("informal maestro (characterId)", () => {
    it("injects informal address section for Feynman", () => {
      const result = injectSafetyGuardrails(testPrompt, {
        role: "maestro",
        characterId: "feynman",
      });

      expect(result).toContain("REGISTRO INFORMALE (Tu)");
      expect(result).not.toContain("REGISTRO FORMALE");
    });

    it("injects informal address section for Chris", () => {
      const result = injectSafetyGuardrails(testPrompt, {
        role: "maestro",
        characterId: "chris",
      });

      expect(result).toContain("REGISTRO INFORMALE (Tu)");
    });

    it("injects informal address section for Simone", () => {
      const result = injectSafetyGuardrails(testPrompt, {
        role: "maestro",
        characterId: "simone",
      });

      expect(result).toContain("REGISTRO INFORMALE (Tu)");
    });
  });

  describe("explicit formalAddress override", () => {
    it("forces formal when formalAddress=true even for informal professor", () => {
      const result = injectSafetyGuardrails(testPrompt, {
        role: "maestro",
        characterId: "feynman",
        formalAddress: true,
      });

      expect(result).toContain("REGISTRO FORMALE (Lei)");
      expect(result).not.toContain("REGISTRO INFORMALE");
    });

    it("forces informal when formalAddress=false even for formal professor", () => {
      const result = injectSafetyGuardrails(testPrompt, {
        role: "maestro",
        characterId: "manzoni",
        formalAddress: false,
      });

      expect(result).toContain("REGISTRO INFORMALE (Tu)");
      expect(result).not.toContain("REGISTRO FORMALE");
    });
  });

  describe("non-maestro roles", () => {
    it("does not inject formality section for coaches", () => {
      const result = injectSafetyGuardrails(testPrompt, {
        role: "coach",
        characterId: "melissa",
      });

      expect(result).not.toContain("REGISTRO FORMALE");
      expect(result).not.toContain("REGISTRO INFORMALE");
    });

    it("does not inject formality section for buddies", () => {
      const result = injectSafetyGuardrails(testPrompt, {
        role: "buddy",
        characterId: "mario",
      });

      expect(result).not.toContain("REGISTRO FORMALE");
      expect(result).not.toContain("REGISTRO INFORMALE");
    });
  });

  describe("safety guardrails integrity", () => {
    it("maintains safety guardrails with formal injection", () => {
      const result = injectSafetyGuardrails(testPrompt, {
        role: "maestro",
        characterId: "manzoni",
      });

      expect(hasSafetyGuardrails(result)).toBe(true);
      expect(result).toContain("REGOLE DI SICUREZZA NON NEGOZIABILI");
      expect(result).toContain("CONTENUTI PROIBITI");
      expect(result).toContain("PROTEZIONE PRIVACY");
    });

    it("maintains safety guardrails with informal injection", () => {
      const result = injectSafetyGuardrails(testPrompt, {
        role: "maestro",
        characterId: "feynman",
      });

      expect(hasSafetyGuardrails(result)).toBe(true);
    });

    it("includes original prompt after injection", () => {
      const result = injectSafetyGuardrails(testPrompt, {
        role: "maestro",
        characterId: "manzoni",
      });

      expect(result).toContain(testPrompt);
      expect(result).toContain("PROMPT DEL PERSONAGGIO");
    });
  });

  describe("formality templates content", () => {
    it("FORMAL_ADDRESS_SECTION contains Lei guidelines", () => {
      expect(FORMAL_ADDRESS_SECTION).toContain("Lei");
      expect(FORMAL_ADDRESS_SECTION).toContain("esserLe");
      expect(FORMAL_ADDRESS_SECTION).toContain("formale");
    });

    it("INFORMAL_ADDRESS_SECTION contains tu guidelines", () => {
      expect(INFORMAL_ADDRESS_SECTION).toContain("tu");
      expect(INFORMAL_ADDRESS_SECTION).toContain("aiutarti");
      expect(INFORMAL_ADDRESS_SECTION).toContain("INFORMALE");
    });
  });
});
