/**
 * Tests for useTranslations hook wrapper
 *
 * These tests verify the type-safe translation hooks work correctly
 * with namespace support and fallback handling.
 */

import { describe, it, expect } from "vitest";
import { formatMessage } from "../useTranslations";

describe("useTranslations hook utilities", () => {
  describe("formatMessage", () => {
    it("should return message as-is when no variables provided", () => {
      const result = formatMessage("Hello world");
      expect(result).toBe("Hello world");
    });

    it("should replace single variable", () => {
      const result = formatMessage("Hello {name}", { name: "John" });
      expect(result).toBe("Hello John");
    });

    it("should replace multiple variables", () => {
      const result = formatMessage(
        "Must be at least {min} and at most {max} characters",
        {
          min: 8,
          max: 100,
        },
      );
      expect(result).toBe("Must be at least 8 and at most 100 characters");
    });

    it("should handle numeric variables", () => {
      const result = formatMessage("You have {count} messages", { count: 42 });
      expect(result).toBe("You have 42 messages");
    });

    it("should handle multiple occurrences of the same variable", () => {
      const result = formatMessage("{name} said hello to {name}", {
        name: "Alice",
      });
      expect(result).toBe("Alice said hello to Alice");
    });

    it("should return original message when variable not found", () => {
      const result = formatMessage("Hello {name}", { other: "value" });
      expect(result).toBe("Hello {name}");
    });

    it("should handle empty variables object", () => {
      const result = formatMessage("Hello {name}", {});
      expect(result).toBe("Hello {name}");
    });

    it("should convert all variable values to strings", () => {
      const result = formatMessage("Value: {value}", { value: 123 });
      expect(result).toBe("Value: 123");
    });
  });
});
