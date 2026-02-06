/**
 * French PII Patterns Test Suite
 */

import { describe, it, expect } from "vitest";
import { getLocalePatterns } from "../pii-patterns";

describe("PII Patterns - French (fr)", () => {
  const frPatterns = getLocalePatterns("fr");

  describe("Phone Numbers", () => {
    it("should match French mobile numbers starting with 06", () => {
      const text = "Contact: 06 12 34 56 78";
      const matched = frPatterns.phone.some((pattern) => pattern.test(text));
      expect(matched).toBe(true);
    });

    it("should match French mobile numbers starting with 07", () => {
      const text = "Call me at 07 98 76 54 32";
      const matched = frPatterns.phone.some((pattern) => pattern.test(text));
      expect(matched).toBe(true);
    });

    it("should match French landline numbers (01-05)", () => {
      const testCases = [
        "01 23 45 67 89",
        "02 34 56 78 90",
        "03 45 67 89 01",
        "04 56 78 90 12",
        "05 67 89 01 23",
      ];
      testCases.forEach((phone) => {
        const matched = frPatterns.phone.some((pattern) => pattern.test(phone));
        expect(matched).toBe(true);
      });
    });

    it("should match international format +33", () => {
      const testCases = [
        "+33 1 23 45 67 89",
        "+33 6 12 34 56 78",
        "+33612345678",
      ];
      testCases.forEach((phone) => {
        const matched = frPatterns.phone.some((pattern) => pattern.test(phone));
        expect(matched).toBe(true);
      });
    });

    it("should match phone numbers without spaces", () => {
      const testCases = ["0612345678", "0123456789"];
      testCases.forEach((phone) => {
        const matched = frPatterns.phone.some((pattern) => pattern.test(phone));
        expect(matched).toBe(true);
      });
    });

    it("should NOT match invalid French phone numbers", () => {
      const invalidCases = [
        "08 12 34 56 78", // 08 is not standard mobile/landline
        "123", // Too short
        "+1 555 1234567", // Wrong country code
      ];
      invalidCases.forEach((phone) => {
        const matched = frPatterns.phone.some((pattern) => pattern.test(phone));
        expect(matched).toBe(false);
      });
    });
  });

  describe("NIR (Numéro de Sécurité Sociale)", () => {
    it("should match NIR with spaces (standard format)", () => {
      const text = "NIR: 1 85 05 78 006 084 36";
      const matched = frPatterns.fiscalId.some((pattern) => pattern.test(text));
      expect(matched).toBe(true);
    });

    it("should match NIR without spaces", () => {
      const text = "Social: 185057800608436";
      const matched = frPatterns.fiscalId.some((pattern) => pattern.test(text));
      expect(matched).toBe(true);
    });

    it("should match NIR for female (starting with 2)", () => {
      const text = "2 92 03 75 123 456 78";
      const matched = frPatterns.fiscalId.some((pattern) => pattern.test(text));
      expect(matched).toBe(true);
    });

    it("should match NIR for male (starting with 1)", () => {
      const text = "1 90 12 06 234 567 89";
      const matched = frPatterns.fiscalId.some((pattern) => pattern.test(text));
      expect(matched).toBe(true);
    });

    it("should match NIR with various spacing formats", () => {
      const testCases = [
        "1 85 05 78 006 084 36",
        "185057800608436",
        "1850578006084 36",
      ];
      testCases.forEach((nir) => {
        const matched = frPatterns.fiscalId.some((pattern) =>
          pattern.test(nir),
        );
        expect(matched).toBe(true);
      });
    });

    it("should NOT match invalid NIR format", () => {
      const invalidCases = [
        "123456789", // Too short
        "5 85 05 78 006 084 36", // Invalid sex code (must be 1-4)
        "ABCDEFGHIJKLMNO", // Letters not valid
      ];
      invalidCases.forEach((nir) => {
        const matched = frPatterns.fiscalId.some((pattern) =>
          pattern.test(nir),
        );
        expect(matched).toBe(false);
      });
    });
  });

  describe("Address Patterns", () => {
    it("should match rue (street)", () => {
      const testCases = [
        "15 rue de la République",
        "42 Rue Victor Hugo",
        "rue Nationale",
      ];
      testCases.forEach((address) => {
        const matched = frPatterns.address.some((pattern) =>
          pattern.test(address),
        );
        expect(matched).toBe(true);
      });
    });

    it("should match avenue", () => {
      const testCases = [
        "42 avenue des Champs-Élysées",
        "Avenue de la Liberté",
        "10 avenue Foch",
      ];
      testCases.forEach((address) => {
        const matched = frPatterns.address.some((pattern) =>
          pattern.test(address),
        );
        expect(matched).toBe(true);
      });
    });

    it("should match boulevard", () => {
      const testCases = [
        "7 boulevard Saint-Germain",
        "Boulevard Haussmann",
        "22 Blvd Voltaire",
      ];
      testCases.forEach((address) => {
        const matched = frPatterns.address.some((pattern) =>
          pattern.test(address),
        );
        expect(matched).toBe(true);
      });
    });

    it("should match place", () => {
      const testCases = [
        "3 place de la Concorde",
        "Place des Vosges",
        "1 Place Vendôme",
      ];
      testCases.forEach((address) => {
        const matched = frPatterns.address.some((pattern) =>
          pattern.test(address),
        );
        expect(matched).toBe(true);
      });
    });

    it("should match chemin", () => {
      const testCases = [
        "10 chemin des Vignes",
        "Chemin du Moulin",
        "5 chemin Vert",
      ];
      testCases.forEach((address) => {
        const matched = frPatterns.address.some((pattern) =>
          pattern.test(address),
        );
        expect(matched).toBe(true);
      });
    });

    it("should match allée", () => {
      const testCases = [
        "5 allée du Parc",
        "Allée des Roses",
        "12 allée Marcel Proust",
      ];
      testCases.forEach((address) => {
        const matched = frPatterns.address.some((pattern) =>
          pattern.test(address),
        );
        expect(matched).toBe(true);
      });
    });

    it("should match impasse", () => {
      const testCases = [
        "2 impasse des Fleurs",
        "Impasse du Moulin",
        "8 impasse Saint-Pierre",
      ];
      testCases.forEach((address) => {
        const matched = frPatterns.address.some((pattern) =>
          pattern.test(address),
        );
        expect(matched).toBe(true);
      });
    });

    it("should match French postal codes", () => {
      const testCases = ["Paris 75001", "Lyon 69001", "Marseille 13001"];
      testCases.forEach((address) => {
        const matched = frPatterns.address.some((pattern) =>
          pattern.test(address),
        );
        expect(matched).toBe(true);
      });
    });

    it("should match addresses with articles and prepositions", () => {
      const testCases = [
        "10 rue de la Paix",
        "Avenue du Général de Gaulle",
        "Place de l'Étoile",
      ];
      testCases.forEach((address) => {
        const matched = frPatterns.address.some((pattern) =>
          pattern.test(address),
        );
        expect(matched).toBe(true);
      });
    });
  });
});
