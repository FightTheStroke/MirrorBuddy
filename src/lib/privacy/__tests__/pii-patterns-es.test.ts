/**
 * Spanish PII Patterns Test Suite
 */

import { describe, it, expect } from "vitest";
import { getLocalePatterns } from "../pii-patterns";

describe("PII Patterns - Spanish (es)", () => {
  const esPatterns = getLocalePatterns("es");

  describe("Phone Numbers", () => {
    it("should match Spanish mobile numbers starting with 6", () => {
      const testCases = [
        "612345678",
        "623456789",
        "634567890",
        "645678901",
        "656789012",
        "667890123",
        "678901234",
        "689012345",
      ];

      testCases.forEach((phoneNumber) => {
        const matched = esPatterns.phone.some((pattern) =>
          pattern.test(phoneNumber),
        );
        expect(matched).toBe(true);
      });
    });

    it("should match Spanish mobile numbers starting with 7", () => {
      const testCases = ["712345678", "723456789", "734567890"];

      testCases.forEach((phoneNumber) => {
        const matched = esPatterns.phone.some((pattern) =>
          pattern.test(phoneNumber),
        );
        expect(matched).toBe(true);
      });
    });

    it("should match Spanish landline numbers", () => {
      const testCases = [
        "912345678", // Madrid
        "934567890", // Barcelona
        "954321098", // Sevilla
      ];

      testCases.forEach((phoneNumber) => {
        const matched = esPatterns.phone.some((pattern) =>
          pattern.test(phoneNumber),
        );
        expect(matched).toBe(true);
      });
    });

    it("should match Spanish phone numbers with +34 prefix", () => {
      const testCases = ["+34612345678", "+34912345678", "+34 612 345 678"];

      testCases.forEach((phoneNumber) => {
        const matched = esPatterns.phone.some((pattern) =>
          pattern.test(phoneNumber),
        );
        expect(matched).toBe(true);
      });
    });

    it("should NOT match invalid Spanish phone numbers", () => {
      const invalidCases = [
        "12345678", // Too short
        "4123456789", // Wrong prefix
        "512345678", // Invalid mobile prefix
        "abc123456", // Contains letters
      ];

      invalidCases.forEach((phoneNumber) => {
        const matched = esPatterns.phone.some((pattern) =>
          pattern.test(phoneNumber),
        );
        expect(matched).toBe(false);
      });
    });
  });

  describe("Fiscal IDs", () => {
    it("should match valid DNI numbers", () => {
      const testCases = ["12345678Z", "87654321X", "11111111H", "99999999R"];

      testCases.forEach((dni) => {
        const matched = esPatterns.fiscalId.some((pattern) =>
          pattern.test(dni),
        );
        expect(matched).toBe(true);
      });
    });

    it("should match valid NIE numbers", () => {
      const testCases = ["X1234567L", "Y7654321Z", "Z1111111A", "X9999999R"];

      testCases.forEach((nie) => {
        const matched = esPatterns.fiscalId.some((pattern) =>
          pattern.test(nie),
        );
        expect(matched).toBe(true);
      });
    });

    it("should match DNI with hyphens or spaces", () => {
      const testCases = ["12345678-Z", "12345678 Z"];

      testCases.forEach((dni) => {
        const matched = esPatterns.fiscalId.some((pattern) =>
          pattern.test(dni),
        );
        expect(matched).toBe(true);
      });
    });

    it("should NOT match invalid fiscal IDs", () => {
      const invalidCases = [
        "1234567Z", // Too short
        "123456789Z", // Too long
        "A1234567Z", // DNI starting with wrong letter
        "12345678", // Missing letter
        "ABCDEFGH", // All letters
      ];

      invalidCases.forEach((id) => {
        const matched = esPatterns.fiscalId.some((pattern) => pattern.test(id));
        expect(matched).toBe(false);
      });
    });
  });

  describe("Addresses", () => {
    it("should match Spanish street types", () => {
      const testCases = [
        "Calle Mayor 123",
        "Avenida de la Constitución 45",
        "Paseo de la Castellana 67",
        "Plaza de España 8",
        "Camino Real 234",
        "Carretera Nacional 100",
      ];

      testCases.forEach((address) => {
        const matched = esPatterns.address.some((pattern) =>
          pattern.test(address),
        );
        expect(matched).toBe(true);
      });
    });

    it("should match abbreviated street types", () => {
      const testCases = [
        "C/ Mayor 123",
        "Avda. Constitución 45",
        "Pza. España 8",
      ];

      testCases.forEach((address) => {
        const matched = esPatterns.address.some((pattern) =>
          pattern.test(address),
        );
        expect(matched).toBe(true);
      });
    });

    it("should match street names with articles", () => {
      const testCases = [
        "Calle de la Rosa",
        "Avenida del Mar",
        "Paseo de los Olivos",
      ];

      testCases.forEach((address) => {
        const matched = esPatterns.address.some((pattern) =>
          pattern.test(address),
        );
        expect(matched).toBe(true);
      });
    });

    it("should match mixed case street names", () => {
      const testCases = [
        "calle mayor 123",
        "AVENIDA CONSTITUCION 45",
        "Paseo De La Castellana 67",
      ];

      testCases.forEach((address) => {
        const matched = esPatterns.address.some((pattern) =>
          pattern.test(address),
        );
        expect(matched).toBe(true);
      });
    });

    it("should NOT match non-Spanish address patterns", () => {
      const invalidCases = [
        "Random text without address",
        "123 Main Street", // English format
        "Rue de la Paix", // French format
      ];

      invalidCases.forEach((text) => {
        const matched = esPatterns.address.some((pattern) =>
          pattern.test(text),
        );
        expect(matched).toBe(false);
      });
    });
  });
});
