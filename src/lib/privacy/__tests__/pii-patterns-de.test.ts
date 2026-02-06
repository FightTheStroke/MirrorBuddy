/**
 * German PII Patterns Test Suite
 */

import { describe, it, expect } from "vitest";
import { getLocalePatterns } from "../pii-patterns";

describe("PII Patterns - German (de)", () => {
  const dePatterns = getLocalePatterns("de");

  describe("German Phone Numbers", () => {
    it("should match international format with +49 prefix", () => {
      const testCases = [
        "+49 30 12345678", // Berlin landline
        "+49 170 1234567", // Mobile
        "+49 89 98765432", // Munich landline
        "+4915012345678", // Mobile without spaces
        "+49 151 2345678", // Mobile with space
      ];

      testCases.forEach((phone) => {
        const matched = dePatterns.phone.some((pattern) => pattern.test(phone));
        expect(matched).toBe(true);
      });
    });

    it("should match national format starting with 0", () => {
      const testCases = [
        "030 12345678", // Berlin landline
        "0170 1234567", // Mobile
        "089 98765432", // Munich landline
        "015012345678", // Mobile without space
        "0151 2345678", // Mobile with space
      ];

      testCases.forEach((phone) => {
        const matched = dePatterns.phone.some((pattern) => pattern.test(phone));
        expect(matched).toBe(true);
      });
    });

    it("should NOT match invalid German phone numbers", () => {
      const invalidCases = [
        "+48 123456789", // Polish prefix
        "123", // Too short
        "+49", // Incomplete
      ];

      invalidCases.forEach((phone) => {
        const matched = dePatterns.phone.some((pattern) => pattern.test(phone));
        expect(matched).toBe(false);
      });
    });
  });

  describe("German Tax ID (Steuer-IdNr)", () => {
    it("should match 11-digit Steuer-IdNr", () => {
      const testCases = ["12345678901", "98765432109", "11111111111"];

      testCases.forEach((taxId) => {
        const matched = dePatterns.fiscalId.some((pattern) =>
          pattern.test(taxId),
        );
        expect(matched).toBe(true);
      });
    });

    it("should NOT match invalid Steuer-IdNr", () => {
      const invalidCases = [
        "123456789", // Too short (9 digits)
        "123456789012", // Too long (12 digits)
        "abcd1234567", // Contains letters
      ];

      invalidCases.forEach((taxId) => {
        const matched = dePatterns.fiscalId.some((pattern) =>
          pattern.test(taxId),
        );
        expect(matched).toBe(false);
      });
    });
  });

  describe("German Addresses", () => {
    it("should match German street names with Straße", () => {
      const testCases = ["Hauptstraße", "Berliner Straße", "Friedrichstraße"];

      testCases.forEach((address) => {
        const matched = dePatterns.address.some((pattern) =>
          pattern.test(address),
        );
        expect(matched).toBe(true);
      });
    });

    it("should match German street names with abbreviations", () => {
      const testCases = ["Hauptstr.", "Berliner Str.", "Friedrichstr."];

      testCases.forEach((address) => {
        const matched = dePatterns.address.some((pattern) =>
          pattern.test(address),
        );
        expect(matched).toBe(true);
      });
    });

    it("should match German street types (Platz, Weg, Allee, Gasse)", () => {
      const testCases = [
        "Alexanderplatz",
        "Unter den Linden Allee",
        "Gartenweg",
        "Kirchgasse",
      ];

      testCases.forEach((address) => {
        const matched = dePatterns.address.some((pattern) =>
          pattern.test(address),
        );
        expect(matched).toBe(true);
      });
    });

    it("should match addresses with house numbers", () => {
      const testCases = [
        "Hauptstraße 123",
        "Berliner Str. 45",
        "Alexanderplatz 1",
        "Gartenweg 7",
      ];

      testCases.forEach((address) => {
        const matched = dePatterns.address.some((pattern) =>
          pattern.test(address),
        );
        expect(matched).toBe(true);
      });
    });

    it("should NOT match non-German address formats", () => {
      const invalidCases = [
        "Main Street", // English
        "Rue de la Paix", // French
        "Via Roma", // Italian
      ];

      invalidCases.forEach((address) => {
        const matched = dePatterns.address.some((pattern) =>
          pattern.test(address),
        );
        expect(matched).toBe(false);
      });
    });
  });
});
