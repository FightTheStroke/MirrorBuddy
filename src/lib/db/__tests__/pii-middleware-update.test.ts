/**
 * PII Middleware Tests - Update Operations
 *
 * Tests for automatic PII encryption in Prisma update operations.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import * as piiEncryption from "@/lib/security/pii-encryption";
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

describe("PII Encryption on Update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("encrypts User.email on update", async () => {
    const mockQuery = vi.fn((args) =>
      Promise.resolve({ id: "user1", ...args.data }),
    );

    const middleware = createPIIMiddleware() as any;
    const context = {
      model: "User",
      operation: "update",
      args: { where: { id: "user1" }, data: { email: "newemail@example.com" } },
      query: mockQuery,
    };

    await middleware.query.$allModels.update(context);

    expect(piiEncryption.encryptPII).toHaveBeenCalledWith(
      "newemail@example.com",
    );
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "pii:v1:encrypted_newemail@example.com",
        }),
      }),
    );
  });

  it("encrypts Profile.name on updateMany", async () => {
    const mockQuery = vi.fn(() => Promise.resolve({ count: 1 }));

    const middleware = createPIIMiddleware() as any;
    const context = {
      model: "Profile",
      operation: "updateMany",
      args: { where: { userId: "user1" }, data: { name: "Jane Doe" } },
      query: mockQuery,
    };

    await middleware.query.$allModels.updateMany(context);

    expect(piiEncryption.encryptPII).toHaveBeenCalledWith("Jane Doe");
  });

  it("computes emailHash when User.email is updated", async () => {
    const mockQuery = vi.fn((args) =>
      Promise.resolve({ id: "user1", ...args.data }),
    );

    const middleware = createPIIMiddleware() as any;
    const context = {
      model: "User",
      operation: "update",
      args: { where: { id: "user1" }, data: { email: "newemail@example.com" } },
      query: mockQuery,
    };

    await middleware.query.$allModels.update(context);

    expect(piiEncryption.hashPII).toHaveBeenCalledWith("newemail@example.com");
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          emailHash: "hash_newemail@example.com",
        }),
      }),
    );
  });

  it("does not compute emailHash when email is null on update", async () => {
    const mockQuery = vi.fn((args) =>
      Promise.resolve({ id: "user1", ...args.data }),
    );

    const middleware = createPIIMiddleware() as any;
    const context = {
      model: "User",
      operation: "update",
      args: { where: { id: "user1" }, data: { email: null } },
      query: mockQuery,
    };

    await middleware.query.$allModels.update(context);

    expect(piiEncryption.hashPII).not.toHaveBeenCalled();
  });
});
