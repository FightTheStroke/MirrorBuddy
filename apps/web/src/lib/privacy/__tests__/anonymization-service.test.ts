/**
 * Anonymization Service Tests
 * Part of Ethical Design Hardening (F-02)
 */

import { describe, it, expect } from "vitest";
import {
  anonymizeContent,
  detectPII,
  generatePseudonym,
  anonymizeUserId,
  containsSensitivePII,
} from "../anonymization-service";

describe("anonymization-service", () => {
  describe("detectPII", () => {
    it("should detect Italian fiscal codes", () => {
      const text = "Il mio codice fiscale è RSSMRA85M01H501Z";
      const result = detectPII(text);
      expect(result).toContain("id");
    });

    it("should detect email addresses", () => {
      const text = "Contattami a mario.rossi@example.com";
      const result = detectPII(text);
      expect(result).toContain("email");
    });

    it("should detect phone numbers", () => {
      const text = "Il mio numero è +39 333 1234567";
      const result = detectPII(text);
      expect(result).toContain("phone");
    });

    it("should detect Italian names", () => {
      const text = "Mi chiamo Giovanni Bianchi e vivo a Milano";
      const result = detectPII(text);
      expect(result).toContain("name");
    });

    it("should return empty array for text without PII", () => {
      const text = "Oggi impariamo la matematica";
      const result = detectPII(text);
      expect(result.length).toBe(0);
    });

    // Multi-locale detection tests
    it("should detect French phone numbers", () => {
      const text = "Mon numéro est 06 12 34 56 78";
      const result = detectPII(text);
      expect(result).toContain("phone");
    });

    it("should detect UK postal codes", () => {
      const text = "My address is SW1A 1AA";
      const result = detectPII(text);
      expect(result).toContain("address");
    });

    it("should detect US Social Security Numbers", () => {
      const text = "My SSN is 123-45-6789";
      const result = detectPII(text);
      expect(result).toContain("id");
    });

    it("should detect Spanish DNI", () => {
      const text = "Mi DNI es 12345678Z";
      const result = detectPII(text);
      expect(result).toContain("id");
    });

    it("should detect German phone numbers", () => {
      const text = "Meine Nummer ist 0151 23456789";
      const result = detectPII(text);
      expect(result).toContain("phone");
    });

    it("should detect French names with diacritics", () => {
      const text = "Je m'appelle François Dubois";
      const result = detectPII(text);
      expect(result).toContain("name");
    });

    it("should detect hyphenated names", () => {
      const text = "My name is Jean-Pierre Martin";
      const result = detectPII(text);
      expect(result).toContain("name");
    });
  });

  describe("anonymizeContent", () => {
    it("should replace fiscal code with placeholder", () => {
      const text = "Codice: RSSMRA85M01H501Z";
      const result = anonymizeContent(text);
      expect(result.content).toContain("[ID]");
      expect(result.content).not.toContain("RSSMRA85M01H501Z");
    });

    it("should replace email with placeholder", () => {
      const text = "Email: test@example.com";
      const result = anonymizeContent(text);
      expect(result.content).toContain("[EMAIL]");
      expect(result.content).not.toContain("test@example.com");
    });

    it("should replace phone with placeholder", () => {
      const text = "Tel: 333 1234567";
      const result = anonymizeContent(text);
      expect(result.content).toContain("[TELEFONO]");
    });

    it("should track replacement count", () => {
      const text = "Email: a@b.com, Tel: 3331234567";
      const result = anonymizeContent(text);
      expect(result.totalReplacements).toBeGreaterThanOrEqual(2);
    });

    it("should not modify text without PII", () => {
      const text = "Ciao, come stai?";
      const result = anonymizeContent(text);
      expect(result.content).toBe(text);
      expect(result.totalReplacements).toBe(0);
    });

    it("should report PII types found", () => {
      const text = "Email: test@example.com";
      const result = anonymizeContent(text);
      expect(result.piiTypesFound).toContain("email");
    });

    // Multi-locale anonymization tests
    it("should anonymize French phone numbers", () => {
      const text = "Appelez-moi au 06 12 34 56 78";
      const result = anonymizeContent(text);
      expect(result.content).toContain("[TELEFONO]");
      expect(result.content).not.toContain("06 12 34 56 78");
    });

    it("should anonymize UK National Insurance Numbers", () => {
      const text = "My NIN is AB 12 34 56 C";
      const result = anonymizeContent(text);
      expect(result.content).toContain("[ID]");
      expect(result.content).not.toContain("AB 12 34 56 C");
    });

    it("should anonymize German addresses", () => {
      const text = "Ich wohne in der Hauptstraße 45";
      const result = anonymizeContent(text);
      expect(result.content).toContain("[INDIRIZZO]");
      expect(result.content).not.toContain("Hauptstraße 45");
    });

    it("should anonymize Spanish DNI", () => {
      const text = "Mi DNI: 12345678-Z";
      const result = anonymizeContent(text);
      expect(result.content).toContain("[ID]");
      expect(result.content).not.toContain("12345678-Z");
    });

    it("should anonymize mixed locale content", () => {
      const text =
        "Contact Mario Rossi at +39 333 1234567 or Jean Dupont at +33 6 12 34 56 78";
      const result = anonymizeContent(text);
      expect(result.content).toContain("[NOME]");
      expect(result.content).toContain("[TELEFONO]");
      expect(result.content).not.toContain("Mario Rossi");
      expect(result.content).not.toContain("Jean Dupont");
      expect(result.totalReplacements).toBeGreaterThan(0);
    });
  });

  describe("generatePseudonym", () => {
    it("should generate consistent pseudonyms for same input", () => {
      const name = "Mario Rossi";
      const pseudo1 = generatePseudonym(name);
      const pseudo2 = generatePseudonym(name);
      expect(pseudo1).toBe(pseudo2);
    });

    it("should generate different pseudonyms for different inputs", () => {
      const pseudo1 = generatePseudonym("Mario Rossi");
      const pseudo2 = generatePseudonym("Luigi Verdi");
      expect(pseudo1).not.toBe(pseudo2);
    });

    it("should generate pseudonyms with PSE_ prefix", () => {
      const pseudo = generatePseudonym("Test User");
      expect(pseudo).toMatch(/^PSE_[a-f0-9]+$/);
    });

    it("should respect custom salt", () => {
      const pseudo1 = generatePseudonym("Test", "salt1");
      const pseudo2 = generatePseudonym("Test", "salt2");
      expect(pseudo1).not.toBe(pseudo2);
    });
  });

  describe("anonymizeUserId", () => {
    it("should generate consistent anonymized IDs", () => {
      const anon1 = anonymizeUserId("user-12345");
      const anon2 = anonymizeUserId("user-12345");
      expect(anon1).toBe(anon2);
    });

    it("should generate different IDs for different users", () => {
      const anon1 = anonymizeUserId("user-12345");
      const anon2 = anonymizeUserId("user-67890");
      expect(anon1).not.toBe(anon2);
    });

    it("should handle short user IDs", () => {
      const anon = anonymizeUserId("ab");
      expect(anon).toBe("***");
    });
  });

  describe("containsSensitivePII", () => {
    it("should return true for name + email combination", () => {
      const text = "Mi chiamo Mario Rossi e la mia email è mario@example.com";
      expect(containsSensitivePII(text)).toBe(true);
    });

    it("should return true for name + phone combination", () => {
      const text = "Mi chiamo Giovanni Bianchi, tel: 333 1234567";
      expect(containsSensitivePII(text)).toBe(true);
    });

    it("should return false for just a name", () => {
      const text = "Mi chiamo Giuseppe Verdi";
      // Name alone is not considered high risk
      expect(containsSensitivePII(text)).toBe(false);
    });

    it("should return false for text without PII", () => {
      const text = "La matematica è interessante";
      expect(containsSensitivePII(text)).toBe(false);
    });

    // Multi-locale sensitive PII tests
    it("should detect sensitive PII in French text", () => {
      const text =
        "Je suis François Dubois et mon email est francois@example.com";
      expect(containsSensitivePII(text)).toBe(true);
    });

    it("should detect sensitive PII in German text", () => {
      const text = "Ich bin Karl Schmidt und meine Adresse ist Hauptstraße 10";
      expect(containsSensitivePII(text)).toBe(true);
    });
  });
});
