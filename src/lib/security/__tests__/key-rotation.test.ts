/**
 * Key Rotation Service Tests
 *
 * Tests for rotating encryption keys for tokens, PII, and sessions
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock Prisma client BEFORE imports
vi.mock("@/lib/db", () => ({
  prisma: {
    googleAccount: {
      count: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    user: {
      count: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

// Now import after mocks are set up
import {
  rotateTokenEncryptionKey,
  rotatePIIEncryptionKey,
  rotateSessionKey,
} from "../key-rotation";
import {
  encryptTokenWithKey,
  encryptPIIWithKey,
} from "../key-rotation-helpers";
import { prisma } from "@/lib/db";

// Get reference to mocked prisma
const mockPrisma = vi.mocked(prisma);

describe("Key Rotation Service", () => {
  const oldTokenKey =
    "old-token-key-must-be-at-least-32-chars-long-for-security";
  const newTokenKey =
    "new-token-key-must-be-at-least-32-chars-long-for-security";
  const oldPIIKey = "old-pii-key-must-be-at-least-32-chars-long-for-security";
  const newPIIKey = "new-pii-key-must-be-at-least-32-chars-long-for-security";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rotateTokenEncryptionKey", () => {
    it("should rotate GoogleIntegration tokens successfully", async () => {
      const mockAccessToken = await encryptTokenWithKey(
        "access123",
        oldTokenKey,
      );
      const mockRefreshToken = await encryptTokenWithKey(
        "refresh456",
        oldTokenKey,
      );

      mockPrisma.googleAccount.count.mockResolvedValue(2);
      mockPrisma.googleAccount.findMany.mockResolvedValue([
        {
          id: "int1",
          accessToken: mockAccessToken,
          refreshToken: mockRefreshToken,
        },
        { id: "int2", accessToken: mockAccessToken, refreshToken: null },
      ]);
      mockPrisma.googleAccount.update.mockResolvedValue({});

      const result = await rotateTokenEncryptionKey(oldTokenKey, newTokenKey);

      expect(result.total).toBe(2);
      expect(result.processed).toBe(2);
      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.phase).toBe("complete");
      expect(mockPrisma.googleAccount.update).toHaveBeenCalledTimes(2);
    });

    it("should handle empty database", async () => {
      mockPrisma.googleAccount.count.mockResolvedValue(0);

      const result = await rotateTokenEncryptionKey(oldTokenKey, newTokenKey);

      expect(result.total).toBe(0);
      expect(result.processed).toBe(0);
      expect(result.phase).toBe("complete");
      expect(mockPrisma.googleAccount.findMany).not.toHaveBeenCalled();
    });

    it("should call progress callback with updates", async () => {
      const mockToken = await encryptTokenWithKey("token123", oldTokenKey);

      mockPrisma.googleAccount.count.mockResolvedValue(1);
      mockPrisma.googleAccount.findMany.mockResolvedValue([
        { id: "int1", accessToken: mockToken, refreshToken: null },
      ]);
      mockPrisma.googleAccount.update.mockResolvedValue({});

      const progressCallback = vi.fn();

      await rotateTokenEncryptionKey(oldTokenKey, newTokenKey, {
        onProgress: progressCallback,
      });

      expect(progressCallback).toHaveBeenCalled();
      const calls = progressCallback.mock.calls;
      // Progress callback should be called at least once
      expect(calls.length).toBeGreaterThanOrEqual(1);
      // Last call should be complete
      expect(calls[calls.length - 1][0].phase).toBe("complete");
    });

    it("should support dry-run mode without writing to database", async () => {
      const mockToken = await encryptTokenWithKey("token123", oldTokenKey);

      mockPrisma.googleAccount.count.mockResolvedValue(1);
      mockPrisma.googleAccount.findMany.mockResolvedValue([
        { id: "int1", accessToken: mockToken, refreshToken: null },
      ]);

      const result = await rotateTokenEncryptionKey(oldTokenKey, newTokenKey, {
        dryRun: true,
      });

      expect(result.succeeded).toBe(1);
      expect(mockPrisma.googleAccount.update).not.toHaveBeenCalled();
    });

    it("should handle decryption failures gracefully", async () => {
      mockPrisma.googleAccount.count.mockResolvedValue(2);
      mockPrisma.googleAccount.findMany.mockResolvedValue([
        {
          id: "int1",
          // Note: unencrypted data (no "enc:v1:" prefix) is passed through as-is for backward compatibility
          accessToken: "plain-text-token",
          refreshToken: null,
        },
        {
          id: "int2",
          accessToken: await encryptTokenWithKey("valid", oldTokenKey),
          refreshToken: null,
        },
      ]);
      mockPrisma.googleAccount.update.mockResolvedValue({});

      const result = await rotateTokenEncryptionKey(oldTokenKey, newTokenKey);

      expect(result.total).toBe(2);
      expect(result.processed).toBe(2);
      // Both succeed: first is passed through, second is decrypted and re-encrypted
      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(0);
    });

    it("should batch process records", async () => {
      const mockToken = await encryptTokenWithKey("token123", oldTokenKey);

      mockPrisma.googleAccount.count.mockResolvedValue(250);
      mockPrisma.googleAccount.findMany
        .mockResolvedValueOnce(
          Array(100).fill({
            id: "int1",
            accessToken: mockToken,
            refreshToken: null,
          }),
        )
        .mockResolvedValueOnce(
          Array(100).fill({
            id: "int2",
            accessToken: mockToken,
            refreshToken: null,
          }),
        )
        .mockResolvedValueOnce(
          Array(50).fill({
            id: "int3",
            accessToken: mockToken,
            refreshToken: null,
          }),
        );
      mockPrisma.googleAccount.update.mockResolvedValue({});

      const result = await rotateTokenEncryptionKey(oldTokenKey, newTokenKey, {
        batchSize: 100,
      });

      expect(result.total).toBe(250);
      expect(result.processed).toBe(250);
      expect(mockPrisma.googleAccount.findMany).toHaveBeenCalledTimes(3);
    }, 15000); // 15 second timeout for crypto operations on 250 records
  });

  describe("rotatePIIEncryptionKey", () => {
    it("should rotate User PII successfully", async () => {
      const mockEmail = await encryptPIIWithKey("user@example.com", oldPIIKey);

      mockPrisma.user.count.mockResolvedValue(2);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: "user1", email: mockEmail },
        { id: "user2", email: mockEmail },
      ]);
      mockPrisma.user.update.mockResolvedValue({});

      const result = await rotatePIIEncryptionKey(oldPIIKey, newPIIKey);

      expect(result.total).toBe(2);
      expect(result.processed).toBe(2);
      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.phase).toBe("complete");
      expect(mockPrisma.user.update).toHaveBeenCalledTimes(2);
    });

    it("should update emailHash when rotating PII", async () => {
      const mockEmail = await encryptPIIWithKey("test@example.com", oldPIIKey);

      mockPrisma.user.count.mockResolvedValue(1);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: "user1", email: mockEmail },
      ]);
      mockPrisma.user.update.mockResolvedValue({});

      await rotatePIIEncryptionKey(oldPIIKey, newPIIKey);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user1" },
        data: expect.objectContaining({
          email: expect.stringMatching(/^pii:v1:/),
          emailHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      });
    });

    it("should skip users with null email", async () => {
      mockPrisma.user.count.mockResolvedValue(1);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: "user1", email: null },
      ]);

      const result = await rotatePIIEncryptionKey(oldPIIKey, newPIIKey);

      expect(result.processed).toBe(1);
      expect(result.succeeded).toBe(0);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it("should support dry-run mode", async () => {
      const mockEmail = await encryptPIIWithKey("user@example.com", oldPIIKey);

      mockPrisma.user.count.mockResolvedValue(1);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: "user1", email: mockEmail },
      ]);

      const result = await rotatePIIEncryptionKey(oldPIIKey, newPIIKey, {
        dryRun: true,
      });

      expect(result.succeeded).toBe(1);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it("should call progress callback", async () => {
      const mockEmail = await encryptPIIWithKey("user@example.com", oldPIIKey);

      mockPrisma.user.count.mockResolvedValue(1);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: "user1", email: mockEmail },
      ]);
      mockPrisma.user.update.mockResolvedValue({});

      const progressCallback = vi.fn();

      await rotatePIIEncryptionKey(oldPIIKey, newPIIKey, {
        onProgress: progressCallback,
      });

      expect(progressCallback).toHaveBeenCalled();
      const lastCall =
        progressCallback.mock.calls[progressCallback.mock.calls.length - 1];
      expect(lastCall[0].phase).toBe("complete");
    });
  });

  describe("rotateSessionKey", () => {
    it("should complete session rotation successfully", async () => {
      const oldKey = "old-session-secret-must-be-at-least-32-chars-long";
      const newKey = "new-session-secret-must-be-at-least-32-chars-long";

      const result = await rotateSessionKey(oldKey, newKey);

      expect(result.total).toBe(1);
      expect(result.processed).toBe(1);
      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.phase).toBe("complete");
    });

    it("should support dry-run mode", async () => {
      const oldKey = "old-session-secret-must-be-at-least-32-chars-long";
      const newKey = "new-session-secret-must-be-at-least-32-chars-long";

      const result = await rotateSessionKey(oldKey, newKey, { dryRun: true });

      expect(result.succeeded).toBe(1);
    });

    it("should call progress callback", async () => {
      const oldKey = "old-session-secret-must-be-at-least-32-chars-long";
      const newKey = "new-session-secret-must-be-at-least-32-chars-long";

      const progressCallback = vi.fn();

      await rotateSessionKey(oldKey, newKey, { onProgress: progressCallback });

      expect(progressCallback).toHaveBeenCalled();
    });
  });
});
