/**
 * English PII Patterns Test Suite
 */

import { describe, it, expect } from "vitest";
import { getLocalePatterns } from "../pii-patterns";

describe("PII Patterns - English (en)", () => {
  const enPatterns = getLocalePatterns("en");

  describe("Phone Numbers", () => {
    it("should match UK phone numbers with +44 prefix", () => {
      const testCases = [
        "+44 20 1234 5678",
        "+44 7700 900123",
        "+44 161 123 4567",
        "+447700900123",
        "+44 1234 567890",
      ];
      testCases.forEach((phone) => {
        expect(enPatterns.phone.some((p) => p.test(phone))).toBe(true);
      });
    });

    it("should match US/Canadian phone numbers with +1 prefix", () => {
      const testCases = [
        "+1 555 123 4567",
        "+1 212 555 1234",
        "+15551234567",
        "+1-555-123-4567",
        "+1 416 555 1234",
      ];
      testCases.forEach((phone) => {
        expect(enPatterns.phone.some((p) => p.test(phone))).toBe(true);
      });
    });

    it("should match US phone numbers in various formats", () => {
      const testCases = [
        "(555) 123-4567",
        "555-123-4567",
        "555.123.4567",
        "555 123 4567",
        "5551234567",
      ];
      testCases.forEach((phone) => {
        expect(enPatterns.phone.some((p) => p.test(phone))).toBe(true);
      });
    });

    it("should NOT match invalid phone numbers", () => {
      const invalidCases = ["+39 333 1234567", "+33 6 12 34 56 78", "123"];
      invalidCases.forEach((phone) => {
        expect(enPatterns.phone.some((p) => p.test(phone))).toBe(false);
      });
    });
  });

  describe("Fiscal IDs", () => {
    it("should match UK National Insurance Numbers", () => {
      const testCases = [
        "AB 12 34 56 C",
        "AB123456C",
        "AB-12-34-56-C",
        "ab 12 34 56 c",
      ];
      testCases.forEach((nin) => {
        expect(enPatterns.fiscalId.some((p) => p.test(nin))).toBe(true);
      });
    });

    it("should match US Social Security Numbers", () => {
      const testCases = [
        "123-45-6789",
        "123 45 6789",
        "123456789",
        "987-65-4321",
      ];
      testCases.forEach((ssn) => {
        expect(enPatterns.fiscalId.some((p) => p.test(ssn))).toBe(true);
      });
    });

    it("should NOT match invalid fiscal IDs", () => {
      const invalidCases = ["AB-12-34", "12-34-567", "RSSMRA85T10A562S"];
      invalidCases.forEach((id) => {
        expect(enPatterns.fiscalId.some((p) => p.test(id))).toBe(false);
      });
    });
  });

  describe("Addresses", () => {
    it("should match street addresses with full type names", () => {
      const testCases = [
        "123 Main Street",
        "45 Oak Street",
        "123 Oxford Road",
        "Abbey Road",
        "123 Fifth Avenue",
        "Madison Avenue",
        "123 Cherry Lane",
        "Memory Lane",
        "123 Sunset Drive",
        "Ocean Drive",
        "123 Sunset Boulevard",
        "Victory Boulevard",
        "123 Kings Way",
        "Broadway",
      ];
      testCases.forEach((address) => {
        expect(enPatterns.address.some((p) => p.test(address))).toBe(true);
      });
    });

    it("should match abbreviated street types", () => {
      const testCases = [
        "123 Main St",
        "45 Oak Rd",
        "1 Park Ave",
        "789 Sunset Blvd",
        "321 Maple Dr",
        "456 Cherry Ln",
      ];
      testCases.forEach((address) => {
        expect(enPatterns.address.some((p) => p.test(address))).toBe(true);
      });
    });

    it("should match addresses with multiple words", () => {
      const testCases = [
        "123 West Main Street",
        "45 North Park Avenue",
        "1 South Broadway",
        "Baker Street 221B",
      ];
      testCases.forEach((address) => {
        expect(enPatterns.address.some((p) => p.test(address))).toBe(true);
      });
    });

    it("should match UK postal codes", () => {
      const testCases = ["SW1A 1AA", "EC1A 1BB", "W1A 0AX"];
      testCases.forEach((postcode) => {
        expect(enPatterns.address.some((p) => p.test(postcode))).toBe(true);
      });
    });

    it("should match US ZIP codes", () => {
      const testCases = ["12345", "90210", "12345-6789"];
      testCases.forEach((zip) => {
        expect(enPatterns.address.some((p) => p.test(zip))).toBe(true);
      });
    });

    it("should NOT match non-English addresses", () => {
      const invalidCases = [
        "Via Roma",
        "Rue de la Paix",
        "Hauptstraße",
        "random text",
      ];
      invalidCases.forEach((text) => {
        expect(enPatterns.address.some((p) => p.test(text))).toBe(false);
      });
    });
  });
});
