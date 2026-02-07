/**
 * PII Middleware Tests - Read Operations, Nested Operations, and Error Handling
 *
 * Tests for automatic PII decryption in Prisma read operations,
 * nested operations, and error scenarios.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import * as piiEncryption from "@/lib/security";
import { Prisma } from "@prisma/client";
import { createPIIMiddleware } from "../pii-middleware";

// Mock the encryption module
vi.mock("@/lib/security/pii-encryption", () => ({
  encryptPII: vi.fn((text: string) =>
    Promise.resolve(`pii:v1:encrypted_${text}`),
  ),
  decryptPII: vi.fn((text: string) =>
    Promise.resolve(
      text.startsWith("pii:v1:") ? text.replace("pii:v1:encrypted_", "") : text,
    ),
  ),
  hashPII: vi.fn((text: string) => Promise.resolve(`hash_${text}`)),
  isPIIEncryptionConfigured: vi.fn(() => true),
}));

// Mock decrypt-audit to avoid circular dependency
vi.mock("@/lib/security/decrypt-audit", () => ({
  logDecryptAccess: vi.fn(),
  logBulkDecryptAccess: vi.fn(),
}));

// Mock Prisma.defineExtension to return the config directly for testing
vi.spyOn(Prisma, "defineExtension").mockImplementation((config: any) => config);

describe("PII Decryption on Read", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("decrypts User.email on findUnique", async () => {
    const mockQuery = vi.fn(() =>
      Promise.resolve({
        id: "user1",
        email: "pii:v1:encrypted_user@example.com",
        username: "testuser",
      }),
    );

    const middleware = createPIIMiddleware() as any;
    const context = {
      model: "User",
      operation: "findUnique",
      args: { where: { id: "user1" } },
      query: mockQuery,
    };

    const result = await middleware.query.$allModels.findUnique(context);

    expect(piiEncryption.decryptPII).toHaveBeenCalledWith(
      "pii:v1:encrypted_user@example.com",
    );
    expect(result.email).toBe("user@example.com");
  });

  it("decrypts Profile.name on findFirst", async () => {
    const mockQuery = vi.fn(() =>
      Promise.resolve({
        id: "profile1",
        name: "pii:v1:encrypted_John Doe",
        userId: "user1",
      }),
    );

    const middleware = createPIIMiddleware() as any;
    const context = {
      model: "Profile",
      operation: "findFirst",
      args: { where: { userId: "user1" } },
      query: mockQuery,
    };

    const result = await middleware.query.$allModels.findFirst(context);

    expect(piiEncryption.decryptPII).toHaveBeenCalledWith(
      "pii:v1:encrypted_John Doe",
    );
    expect(result.name).toBe("John Doe");
  });

  it("decrypts GoogleAccount fields on findMany", async () => {
    const mockQuery = vi.fn(() =>
      Promise.resolve([
        {
          id: "ga1",
          email: "pii:v1:encrypted_google@example.com",
          displayName: "pii:v1:encrypted_Google User",
          googleId: "123",
        },
      ]),
    );

    const middleware = createPIIMiddleware() as any;
    const context = {
      model: "GoogleAccount",
      operation: "findMany",
      args: {},
      query: mockQuery,
    };

    const results = await middleware.query.$allModels.findMany(context);

    expect(piiEncryption.decryptPII).toHaveBeenCalledWith(
      "pii:v1:encrypted_google@example.com",
    );
    expect(piiEncryption.decryptPII).toHaveBeenCalledWith(
      "pii:v1:encrypted_Google User",
    );
    expect(results[0].email).toBe("google@example.com");
    expect(results[0].displayName).toBe("Google User");
  });

  it("handles null results from queries gracefully", async () => {
    const mockQuery = vi.fn(() => Promise.resolve(null));

    const middleware = createPIIMiddleware() as any;
    const context = {
      model: "User",
      operation: "findUnique",
      args: { where: { id: "nonexistent" } },
      query: mockQuery,
    };

    const result = await middleware.query.$allModels.findUnique(context);

    expect(result).toBeNull();
    expect(piiEncryption.decryptPII).not.toHaveBeenCalled();
  });

  it("handles empty array from findMany gracefully", async () => {
    const mockQuery = vi.fn(() => Promise.resolve([]));

    const middleware = createPIIMiddleware() as any;
    const context = {
      model: "User",
      operation: "findMany",
      args: {},
      query: mockQuery,
    };

    const results = await middleware.query.$allModels.findMany(context);

    expect(results).toEqual([]);
    expect(piiEncryption.decryptPII).not.toHaveBeenCalled();
  });
});

describe("Nested Operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("encrypts nested create data", async () => {
    const mockQuery = vi.fn((args) =>
      Promise.resolve({ id: "user1", ...args.data }),
    );

    const middleware = createPIIMiddleware() as any;
    const context = {
      model: "User",
      operation: "create",
      args: {
        data: {
          username: "testuser",
          email: "user@example.com",
          profile: {
            create: {
              name: "John Doe",
            },
          },
        },
      },
      query: mockQuery,
    };

    await middleware.query.$allModels.create(context);

    expect(piiEncryption.encryptPII).toHaveBeenCalledWith("user@example.com");
    expect(piiEncryption.encryptPII).toHaveBeenCalledWith("John Doe");
  });
});

describe("Error Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("propagates encryption errors", async () => {
    vi.mocked(piiEncryption.encryptPII).mockRejectedValueOnce(
      new Error("Encryption failed"),
    );

    const mockQuery = vi.fn();

    const middleware = createPIIMiddleware() as any;
    const context = {
      model: "User",
      operation: "create",
      args: { data: { email: "user@example.com" } },
      query: mockQuery,
    };

    await expect(middleware.query.$allModels.create(context)).rejects.toThrow(
      "Encryption failed",
    );
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("propagates decryption errors", async () => {
    vi.mocked(piiEncryption.decryptPII).mockRejectedValueOnce(
      new Error("Decryption failed"),
    );

    const mockQuery = vi.fn(() =>
      Promise.resolve({
        id: "user1",
        email: "pii:v1:encrypted_user@example.com",
      }),
    );

    const middleware = createPIIMiddleware() as any;
    const context = {
      model: "User",
      operation: "findUnique",
      args: { where: { id: "user1" } },
      query: mockQuery,
    };

    await expect(
      middleware.query.$allModels.findUnique(context),
    ).rejects.toThrow("Decryption failed");
  });
});
