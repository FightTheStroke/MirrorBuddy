/**
 * Key Rotation Service Tests
 *
 * Tests for rotating encryption keys for tokens, PII, and sessions
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Define mock functions via vi.hoisted to avoid Prisma deep-typing issues
const {
  mockGoogleCount,
  mockGoogleFindMany,
  mockGoogleUpdate,
  mockUserCount,
  mockUserFindMany,
  mockUserUpdate,
} = vi.hoisted(() => ({
  mockGoogleCount: vi.fn(),
  mockGoogleFindMany: vi.fn(),
  mockGoogleUpdate: vi.fn(),
  mockUserCount: vi.fn(),
  mockUserFindMany: vi.fn(),
  mockUserUpdate: vi.fn(),
}));

// Mock Prisma client BEFORE imports
vi.mock("@/lib/db", () => ({
  prisma: {
    googleAccount: {
      count: mockGoogleCount,
      findMany: mockGoogleFindMany,
      update: mockGoogleUpdate,
    },
    user: {
      count: mockUserCount,
      findMany: mockUserFindMany,
      update: mockUserUpdate,
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

      mockGoogleCount.mockResolvedValue(2);
      mockGoogleFindMany.mockResolvedValue([
        {
          id: "int1",
          accessToken: mockAccessToken,
          refreshToken: mockRefreshToken,
        },
        { id: "int2", accessToken: mockAccessToken, refreshToken: null },
      ]);
      mockGoogleUpdate.mockResolvedValue({});

      const result = await rotateTokenEncryptionKey(oldTokenKey, newTokenKey);

      expect(result.total).toBe(2);
      expect(result.processed).toBe(2);
      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.phase).toBe("complete");
      expect(mockGoogleUpdate).toHaveBeenCalledTimes(2);
    });

    it("should handle empty database", async () => {
      mockGoogleCount.mockResolvedValue(0);

      const result = await rotateTokenEncryptionKey(oldTokenKey, newTokenKey);

      expect(result.total).toBe(0);
      expect(result.processed).toBe(0);
      expect(result.phase).toBe("complete");
      expect(mockGoogleFindMany).not.toHaveBeenCalled();
    });

    it("should call progress callback with updates", async () => {
      const mockToken = await encryptTokenWithKey("token123", oldTokenKey);

      mockGoogleCount.mockResolvedValue(1);
      mockGoogleFindMany.mockResolvedValue([
        { id: "int1", accessToken: mockToken, refreshToken: null },
      ]);
      mockGoogleUpdate.mockResolvedValue({});

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

      mockGoogleCount.mockResolvedValue(1);
      mockGoogleFindMany.mockResolvedValue([
        { id: "int1", accessToken: mockToken, refreshToken: null },
      ]);

      const result = await rotateTokenEncryptionKey(oldTokenKey, newTokenKey, {
        dryRun: true,
      });

      expect(result.succeeded).toBe(1);
      expect(mockGoogleUpdate).not.toHaveBeenCalled();
    });

    it("should handle decryption failures gracefully", async () => {
      mockGoogleCount.mockResolvedValue(2);
      mockGoogleFindMany.mockResolvedValue([
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
      mockGoogleUpdate.mockResolvedValue({});

      const result = await rotateTokenEncryptionKey(oldTokenKey, newTokenKey);

      expect(result.total).toBe(2);
      expect(result.processed).toBe(2);
      // Both succeed: first is passed through, second is decrypted and re-encrypted
      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(0);
    });

    it("should batch process records", async () => {
      const mockToken = await encryptTokenWithKey("token123", oldTokenKey);

      mockGoogleCount.mockResolvedValue(250);
      mockGoogleFindMany
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
      mockGoogleUpdate.mockResolvedValue({});

      const result = await rotateTokenEncryptionKey(oldTokenKey, newTokenKey, {
        batchSize: 100,
      });

      expect(result.total).toBe(250);
      expect(result.processed).toBe(250);
      expect(mockGoogleFindMany).toHaveBeenCalledTimes(3);
    }, 30000); // 30 second timeout for crypto operations on 250 records (CI runners are slower)
  });

  describe("rotatePIIEncryptionKey", () => {
    it("should rotate User PII successfully", async () => {
      const mockEmail = await encryptPIIWithKey("user@example.com", oldPIIKey);

      mockUserCount.mockResolvedValue(2);
      mockUserFindMany.mockResolvedValue([
        { id: "user1", email: mockEmail },
        { id: "user2", email: mockEmail },
      ]);
      mockUserUpdate.mockResolvedValue({});

      const result = await rotatePIIEncryptionKey(oldPIIKey, newPIIKey);

      expect(result.total).toBe(2);
      expect(result.processed).toBe(2);
      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.phase).toBe("complete");
      expect(mockUserUpdate).toHaveBeenCalledTimes(2);
    });

    it("should update emailHash when rotating PII", async () => {
      const mockEmail = await encryptPIIWithKey("test@example.com", oldPIIKey);

      mockUserCount.mockResolvedValue(1);
      mockUserFindMany.mockResolvedValue([{ id: "user1", email: mockEmail }]);
      mockUserUpdate.mockResolvedValue({});

      await rotatePIIEncryptionKey(oldPIIKey, newPIIKey);

      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: { id: "user1" },
        data: expect.objectContaining({
          email: expect.stringMatching(/^pii:v1:/),
          emailHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      });
    });

    it("should skip users with null email", async () => {
      mockUserCount.mockResolvedValue(1);
      mockUserFindMany.mockResolvedValue([{ id: "user1", email: null }]);

      const result = await rotatePIIEncryptionKey(oldPIIKey, newPIIKey);

      expect(result.processed).toBe(1);
      expect(result.succeeded).toBe(0);
      expect(mockUserUpdate).not.toHaveBeenCalled();
    });

    it("should support dry-run mode", async () => {
      const mockEmail = await encryptPIIWithKey("user@example.com", oldPIIKey);

      mockUserCount.mockResolvedValue(1);
      mockUserFindMany.mockResolvedValue([{ id: "user1", email: mockEmail }]);

      const result = await rotatePIIEncryptionKey(oldPIIKey, newPIIKey, {
        dryRun: true,
      });

      expect(result.succeeded).toBe(1);
      expect(mockUserUpdate).not.toHaveBeenCalled();
    });

    it("should call progress callback", async () => {
      const mockEmail = await encryptPIIWithKey("user@example.com", oldPIIKey);

      mockUserCount.mockResolvedValue(1);
      mockUserFindMany.mockResolvedValue([{ id: "user1", email: mockEmail }]);
      mockUserUpdate.mockResolvedValue({});

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
