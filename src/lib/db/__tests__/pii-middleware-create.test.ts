/**
 * PII Middleware Tests - Create Operations
 *
 * Tests for automatic PII encryption in Prisma create operations.
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

describe("PII Encryption on Create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("encrypts User.email on create", async () => {
    const mockQuery = vi.fn((args) =>
      Promise.resolve({ id: "user1", ...args.data }),
    );

    const middleware = createPIIMiddleware() as any;
    const context = {
      model: "User",
      operation: "create",
      args: { data: { email: "user@example.com", username: "testuser" } },
      query: mockQuery,
    };

    await middleware.query.$allModels.create(context);

    expect(piiEncryption.encryptPII).toHaveBeenCalledWith("user@example.com");
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "pii:v1:encrypted_user@example.com",
        }),
      }),
    );
  });

  it("encrypts Profile.name on create", async () => {
    const mockQuery = vi.fn((args) =>
      Promise.resolve({ id: "profile1", ...args.data }),
    );

    const middleware = createPIIMiddleware() as any;
    const context = {
      model: "Profile",
      operation: "create",
      args: { data: { name: "John Doe", userId: "user1" } },
      query: mockQuery,
    };

    await middleware.query.$allModels.create(context);

    expect(piiEncryption.encryptPII).toHaveBeenCalledWith("John Doe");
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "pii:v1:encrypted_John Doe",
        }),
      }),
    );
  });

  it("encrypts GoogleAccount email and displayName on create", async () => {
    const mockQuery = vi.fn((args) =>
      Promise.resolve({ id: "ga1", ...args.data }),
    );

    const middleware = createPIIMiddleware() as any;
    const context = {
      model: "GoogleAccount",
      operation: "create",
      args: {
        data: {
          email: "google@example.com",
          displayName: "Google User",
          googleId: "123",
          userId: "user1",
        },
      },
      query: mockQuery,
    };

    await middleware.query.$allModels.create(context);

    expect(piiEncryption.encryptPII).toHaveBeenCalledWith("google@example.com");
    expect(piiEncryption.encryptPII).toHaveBeenCalledWith("Google User");
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "pii:v1:encrypted_google@example.com",
          displayName: "pii:v1:encrypted_Google User",
        }),
      }),
    );
  });

  it("encrypts CoppaConsent.parentEmail on create", async () => {
    const mockQuery = vi.fn((args) =>
      Promise.resolve({ id: "coppa1", ...args.data }),
    );

    const middleware = createPIIMiddleware() as any;
    const context = {
      model: "CoppaConsent",
      operation: "create",
      args: { data: { parentEmail: "parent@example.com", userId: "user1" } },
      query: mockQuery,
    };

    await middleware.query.$allModels.create(context);

    expect(piiEncryption.encryptPII).toHaveBeenCalledWith("parent@example.com");
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          parentEmail: "pii:v1:encrypted_parent@example.com",
        }),
      }),
    );
  });

  it("does not encrypt null or undefined values", async () => {
    const mockQuery = vi.fn((args) =>
      Promise.resolve({ id: "user1", ...args.data }),
    );

    const middleware = createPIIMiddleware() as any;
    const context = {
      model: "User",
      operation: "create",
      args: { data: { email: null, username: "testuser" } },
      query: mockQuery,
    };

    await middleware.query.$allModels.create(context);

    expect(piiEncryption.encryptPII).not.toHaveBeenCalled();
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: null,
        }),
      }),
    );
  });

  it("does not modify models without PII fields", async () => {
    const mockQuery = vi.fn((args) =>
      Promise.resolve({ id: "conv1", ...args.data }),
    );

    const middleware = createPIIMiddleware() as any;
    const context = {
      model: "Conversation",
      operation: "create",
      args: { data: { userId: "user1", title: "Test" } },
      query: mockQuery,
    };

    await middleware.query.$allModels.create(context);

    expect(piiEncryption.encryptPII).not.toHaveBeenCalled();
  });

  it("computes emailHash when User.email is encrypted on create", async () => {
    const mockQuery = vi.fn((args) =>
      Promise.resolve({ id: "user1", ...args.data }),
    );

    const middleware = createPIIMiddleware() as any;
    const context = {
      model: "User",
      operation: "create",
      args: { data: { email: "user@example.com", username: "testuser" } },
      query: mockQuery,
    };

    await middleware.query.$allModels.create(context);

    expect(piiEncryption.hashPII).toHaveBeenCalledWith("user@example.com");
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          emailHash: "hash_user@example.com",
        }),
      }),
    );
  });

  it("computes emailHash when GoogleAccount.email is encrypted on create", async () => {
    const mockQuery = vi.fn((args) =>
      Promise.resolve({ id: "ga1", ...args.data }),
    );

    const middleware = createPIIMiddleware() as any;
    const context = {
      model: "GoogleAccount",
      operation: "create",
      args: {
        data: {
          email: "google@example.com",
          displayName: "Google User",
          googleId: "123",
          userId: "user1",
        },
      },
      query: mockQuery,
    };

    await middleware.query.$allModels.create(context);

    expect(piiEncryption.hashPII).toHaveBeenCalledWith("google@example.com");
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          emailHash: "hash_google@example.com",
        }),
      }),
    );
  });

  it("does not compute emailHash for Profile.name (non-email PII)", async () => {
    const mockQuery = vi.fn((args) =>
      Promise.resolve({ id: "profile1", ...args.data }),
    );

    const middleware = createPIIMiddleware() as any;
    const context = {
      model: "Profile",
      operation: "create",
      args: { data: { name: "John Doe", userId: "user1" } },
      query: mockQuery,
    };

    await middleware.query.$allModels.create(context);

    // hashPII should not be called for non-email fields
    expect(piiEncryption.hashPII).not.toHaveBeenCalled();
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({
          emailHash: expect.anything(),
        }),
      }),
    );
  });
});
