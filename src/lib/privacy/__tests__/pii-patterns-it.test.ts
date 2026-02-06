/**
 * Italian PII Patterns Test Suite
 */

import { describe, it, expect } from "vitest";
import { getLocalePatterns } from "../pii-patterns";

describe("PII Patterns - Italian (it)", () => {
  describe("Phone Numbers", () => {
    it("should match Italian mobile numbers with +39 prefix", () => {
      const patterns = getLocalePatterns("it");
      const text = "Chiamami al +39 333 1234567";
      const matches = patterns.phone.some((pattern) => pattern.test(text));
      expect(matches).toBe(true);
    });

    it("should match Italian mobile numbers without +39 prefix", () => {
      const patterns = getLocalePatterns("it");
      const text = "Il mio numero è 333 1234567";
      const matches = patterns.phone.some((pattern) => pattern.test(text));
      expect(matches).toBe(true);
    });

    it("should match Italian landline numbers (0xx prefix)", () => {
      const patterns = getLocalePatterns("it");
      const testCases = [
        "02 12345678", // Milan
        "06 12345678", // Rome
        "051 1234567", // Bologna
        "081 1234567", // Naples
      ];
      testCases.forEach((phoneNumber) => {
        const matches = patterns.phone.some((pattern) =>
          pattern.test(phoneNumber),
        );
        expect(matches).toBe(true);
      });
    });

    it("should match Italian phone numbers with various separators", () => {
      const patterns = getLocalePatterns("it");
      const testCases = [
        "+39 333-1234567",
        "+39.333.1234567",
        "+39 333 123 4567",
        "0039 333 1234567",
      ];
      testCases.forEach((phoneNumber) => {
        const matches = patterns.phone.some((pattern) =>
          pattern.test(phoneNumber),
        );
        expect(matches).toBe(true);
      });
    });

    it("should NOT match invalid Italian phone numbers", () => {
      const patterns = getLocalePatterns("it");
      const invalidCases = [
        "123", // Too short
        "+1 555 1234567", // Wrong country code
        "999 1234567", // Invalid prefix
      ];
      invalidCases.forEach((phoneNumber) => {
        const matches = patterns.phone.some((pattern) =>
          pattern.test(phoneNumber),
        );
        expect(matches).toBe(false);
      });
    });
  });

  describe("Codice Fiscale", () => {
    it("should match valid Italian codice fiscale", () => {
      const patterns = getLocalePatterns("it");
      const testCases = [
        "RSSMRA85T10A562S",
        "VRDGNN90A01H501U",
        "BNCFNC80D50F205X",
      ];
      testCases.forEach((cf) => {
        const matches = patterns.fiscalId.some((pattern) => pattern.test(cf));
        expect(matches).toBe(true);
      });
    });

    it("should match codice fiscale in text", () => {
      const patterns = getLocalePatterns("it");
      const text = "Il mio codice fiscale è RSSMRA85T10A562S";
      const matches = patterns.fiscalId.some((pattern) => pattern.test(text));
      expect(matches).toBe(true);
    });

    it("should match codice fiscale case-insensitive", () => {
      const patterns = getLocalePatterns("it");
      const testCases = ["rssmra85t10a562s", "RsSMrA85t10A562S"];
      testCases.forEach((cf) => {
        const matches = patterns.fiscalId.some((pattern) => pattern.test(cf));
        expect(matches).toBe(true);
      });
    });

    it("should NOT match invalid codice fiscale format", () => {
      const patterns = getLocalePatterns("it");
      const invalidCases = [
        "RSSMRA85T10", // Too short
        "123456789012345", // All numbers
        "RSSMRA85T10A562", // Missing check digit
      ];
      invalidCases.forEach((cf) => {
        const matches = patterns.fiscalId.some((pattern) => pattern.test(cf));
        expect(matches).toBe(false);
      });
    });
  });

  describe("Address Patterns", () => {
    it("should match Italian street addresses with Via", () => {
      const patterns = getLocalePatterns("it");
      const testCases = ["Via Roma 123", "via Garibaldi 45", "Via del Corso 7"];
      testCases.forEach((address) => {
        const matches = patterns.address.some((pattern) =>
          pattern.test(address),
        );
        expect(matches).toBe(true);
      });
    });

    it("should match Italian street addresses with Viale", () => {
      const patterns = getLocalePatterns("it");
      const testCases = ["Viale Europa 10", "viale della Repubblica 5"];
      testCases.forEach((address) => {
        const matches = patterns.address.some((pattern) =>
          pattern.test(address),
        );
        expect(matches).toBe(true);
      });
    });

    it("should match Italian street addresses with Piazza", () => {
      const patterns = getLocalePatterns("it");
      const testCases = ["Piazza Venezia 1", "piazza del Popolo 3"];
      testCases.forEach((address) => {
        const matches = patterns.address.some((pattern) =>
          pattern.test(address),
        );
        expect(matches).toBe(true);
      });
    });

    it("should match Italian street addresses with Corso", () => {
      const patterns = getLocalePatterns("it");
      const testCases = ["Corso Italia 88", "corso Vittorio Emanuele 12"];
      testCases.forEach((address) => {
        const matches = patterns.address.some((pattern) =>
          pattern.test(address),
        );
        expect(matches).toBe(true);
      });
    });

    it("should match Italian street addresses with Largo, Vicolo, Contrada", () => {
      const patterns = getLocalePatterns("it");
      const testCases = [
        "Largo Argentina 2",
        "Vicolo Stretto 4",
        "Contrada San Michele 6",
      ];
      testCases.forEach((address) => {
        const matches = patterns.address.some((pattern) =>
          pattern.test(address),
        );
        expect(matches).toBe(true);
      });
    });

    it("should match addresses with multiple words and articles", () => {
      const patterns = getLocalePatterns("it");
      const testCases = [
        "Via della Conciliazione 8",
        "Piazza San Pietro 1",
        "Corso di Porta Romana 15",
      ];
      testCases.forEach((address) => {
        const matches = patterns.address.some((pattern) =>
          pattern.test(address),
        );
        expect(matches).toBe(true);
      });
    });

    it("should NOT match non-address text starting with common words", () => {
      const patterns = getLocalePatterns("it");
      const nonAddresses = [
        "via email", // "via" as preposition, not street
        "corso di laurea", // "corso" as course, not street (lowercase after)
      ];
      nonAddresses.forEach((text) => {
        const matches = patterns.address.some((pattern) => pattern.test(text));
        expect(matches).toBe(false);
      });
    });
  });
});
