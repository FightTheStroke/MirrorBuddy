/**
 * PII Middleware Tests - Configuration
 *
 * Tests for PII middleware configuration and field mappings.
 */

import { describe, it, expect, vi } from "vitest";
import { createPIIMiddleware, PII_FIELD_MAP } from "../pii-middleware";

// Mock the encryption module
vi.mock("@/lib/security", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/security")>();
  return {
    ...actual,
    encryptPII: vi.fn((text: string) =>
      Promise.resolve(`pii:v1:encrypted_${text}`),
    ),
    decryptPII: vi.fn((text: string) =>
      Promise.resolve(
        text.startsWith("pii:v1:")
          ? text.replace("pii:v1:encrypted_", "")
          : text,
      ),
    ),
    hashPII: vi.fn((text: string) => Promise.resolve(`hash_${text}`)),
    isPIIEncryptionConfigured: vi.fn(() => true),
  };
});

describe("PII Middleware Configuration", () => {
  it("exports createPIIMiddleware function", () => {
    expect(createPIIMiddleware).toBeDefined();
    expect(typeof createPIIMiddleware).toBe("function");
  });

  it("defines PII field mapping for all required models", () => {
    expect(PII_FIELD_MAP).toBeDefined();
    expect(PII_FIELD_MAP.User).toContain("email");
    expect(PII_FIELD_MAP.Profile).toContain("name");
    expect(PII_FIELD_MAP.GoogleAccount).toContain("email");
    expect(PII_FIELD_MAP.GoogleAccount).toContain("displayName");
    expect(PII_FIELD_MAP.CoppaConsent).toContain("parentEmail");
  });
});
