/**
 * PII Middleware Tests - Upsert Operations
 *
 * Tests for automatic PII encryption in Prisma upsert operations.
 * Ensures both create and update branches of upsert encrypt PII fields.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import * as piiEncryption from "@/lib/security";
import { Prisma } from "@prisma/client";
import { createPIIMiddleware } from "../pii-middleware";

// Mock the encryption module (combined barrel mock)
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
    logDecryptAccess: vi.fn(),
    logBulkDecryptAccess: vi.fn(),
  };
});

// Mock Prisma.defineExtension to return the config directly for testing
vi.spyOn(Prisma, "defineExtension").mockImplementation((config: any) => config);

describe("PII Encryption on Upsert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("encrypts User.email in upsert create data", async () => {
    const mockQuery = vi.fn((args) =>
      Promise.resolve({ id: "user1", ...args.create }),
    );

    const middleware = createPIIMiddleware() as any;
    const context = {
      model: "User",
      operation: "upsert",
      args: {
        where: { id: "user1" },
        create: { email: "test@example.com", username: "testuser" },
        update: { email: "test@example.com" },
      },
      query: mockQuery,
    };

    await middleware.query.$allModels.upsert(context);

    expect(piiEncryption.encryptPII).toHaveBeenCalledWith("test@example.com");
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          email: "pii:v1:encrypted_test@example.com",
          emailHash: "hash_test@example.com",
        }),
      }),
    );
  });

  it("encrypts User.email in upsert update data", async () => {
    const mockQuery = vi.fn((args) =>
      Promise.resolve({ id: "user1", ...args.update }),
    );

    const middleware = createPIIMiddleware() as any;
    const context = {
      model: "User",
      operation: "upsert",
      args: {
        where: { id: "user1" },
        create: { email: "test@example.com" },
        update: { email: "updated@example.com" },
      },
      query: mockQuery,
    };

    await middleware.query.$allModels.upsert(context);

    // Both create and update data should be encrypted
    expect(piiEncryption.encryptPII).toHaveBeenCalledWith("test@example.com");
    expect(piiEncryption.encryptPII).toHaveBeenCalledWith(
      "updated@example.com",
    );
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          email: "pii:v1:encrypted_updated@example.com",
          emailHash: "hash_updated@example.com",
        }),
      }),
    );
  });

  it("decrypts result after upsert", async () => {
    const mockQuery = vi.fn(() =>
      Promise.resolve({
        id: "user1",
        email: "pii:v1:encrypted_test@example.com",
      }),
    );

    const middleware = createPIIMiddleware() as any;
    const context = {
      model: "User",
      operation: "upsert",
      args: {
        where: { id: "user1" },
        create: { email: "test@example.com" },
        update: { email: "test@example.com" },
      },
      query: mockQuery,
    };

    const result = await middleware.query.$allModels.upsert(context);

    expect(piiEncryption.decryptPII).toHaveBeenCalledWith(
      "pii:v1:encrypted_test@example.com",
    );
    expect(result).toEqual(
      expect.objectContaining({
        email: "test@example.com",
      }),
    );
  });

  it("skips encryption for non-PII models on upsert", async () => {
    const mockQuery = vi.fn((args) =>
      Promise.resolve({ id: "1", ...args.create }),
    );

    const middleware = createPIIMiddleware() as any;
    const context = {
      model: "Settings",
      operation: "upsert",
      args: {
        where: { id: "1" },
        create: { theme: "dark" },
        update: { theme: "dark" },
      },
      query: mockQuery,
    };

    await middleware.query.$allModels.upsert(context);

    expect(piiEncryption.encryptPII).not.toHaveBeenCalled();
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ theme: "dark" }),
      }),
    );
  });

  it("encrypts Profile.name in upsert", async () => {
    const mockQuery = vi.fn((args) =>
      Promise.resolve({ id: "p1", ...args.create }),
    );

    const middleware = createPIIMiddleware() as any;
    const context = {
      model: "Profile",
      operation: "upsert",
      args: {
        where: { userId: "user1" },
        create: { name: "Mario Rossi", userId: "user1" },
        update: { name: "Mario Rossi" },
      },
      query: mockQuery,
    };

    await middleware.query.$allModels.upsert(context);

    expect(piiEncryption.encryptPII).toHaveBeenCalledWith("Mario Rossi");
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          name: "pii:v1:encrypted_Mario Rossi",
        }),
      }),
    );
  });
});
