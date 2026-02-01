/**
 * Session Auth Tests
 * Unit tests for validateAuth, validateAdminAuth, validateSessionOwnership
 *
 * These are critical functions used by ALL protected API endpoints.
 * Regression tests to prevent auth-related bugs after merges.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock next/headers before importing session-auth
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    conversation: {
      findFirst: vi.fn(),
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

// Mock cookie-signing
vi.mock("@/lib/auth/cookie-signing", () => ({
  isSignedCookie: vi.fn(),
  verifyCookieValue: vi.fn(),
}));

import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { isSignedCookie, verifyCookieValue } from "@/lib/auth/cookie-signing";
import {
  validateAuth,
  validateAdminAuth,
  validateSessionOwnership,
  requireAuthenticatedUser,
} from "../session-auth";

describe("Session Auth", () => {
  const mockCookieStore = {
    get: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cookies).mockResolvedValue(mockCookieStore as never);
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
  });

  describe("validateAuth", () => {
    it("should return unauthenticated when no cookie exists", async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const result = await validateAuth();

      expect(result.authenticated).toBe(false);
      expect(result.userId).toBeNull();
      expect(result.error).toBe("No authentication cookie");
    });

    it("should reject unsigned cookies", async () => {
      mockCookieStore.get.mockReturnValue({ value: "plain-user-id" });
      vi.mocked(isSignedCookie).mockReturnValue(false);

      const result = await validateAuth();

      expect(result.authenticated).toBe(false);
      expect(result.userId).toBeNull();
      expect(result.error).toBe("Invalid cookie format");
    });

    it("should reject cookies with invalid signatures", async () => {
      mockCookieStore.get.mockReturnValue({ value: "user-id.invalidsig" });
      vi.mocked(isSignedCookie).mockReturnValue(true);
      vi.mocked(verifyCookieValue).mockReturnValue({
        valid: false,
        error: "Signature verification failed",
      });

      const result = await validateAuth();

      expect(result.authenticated).toBe(false);
      expect(result.userId).toBeNull();
      expect(result.error).toBe("Invalid cookie signature");
    });

    it("should authenticate valid signed cookie with existing user", async () => {
      const userId = "user-123";
      mockCookieStore.get.mockReturnValue({ value: `${userId}.validsig` });
      vi.mocked(isSignedCookie).mockReturnValue(true);
      vi.mocked(verifyCookieValue).mockReturnValue({
        valid: true,
        value: userId,
      });
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: userId,
      } as never);

      const result = await validateAuth();

      expect(result.authenticated).toBe(true);
      expect(result.userId).toBe(userId);
      expect(result.error).toBeUndefined();
    });

    it("should return unauthenticated when user not found in production", async () => {
      vi.stubEnv("NODE_ENV", "production");

      const userId = "nonexistent-user";
      mockCookieStore.get.mockReturnValue({ value: `${userId}.validsig` });
      vi.mocked(isSignedCookie).mockReturnValue(true);
      vi.mocked(verifyCookieValue).mockReturnValue({
        valid: true,
        value: userId,
      });
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const result = await validateAuth();

      expect(result.authenticated).toBe(false);
      expect(result.userId).toBeNull();
      expect(result.error).toBe("User not found");
    });

    it("should auto-create user in development mode when not found", async () => {
      vi.stubEnv("NODE_ENV", "development");

      const userId = "new-test-user";
      mockCookieStore.get
        .mockReturnValueOnce({ value: `${userId}.validsig` }) // AUTH_COOKIE_NAME
        .mockReturnValueOnce(undefined); // ADMIN_COOKIE_NAME check

      vi.mocked(isSignedCookie).mockReturnValue(true);
      vi.mocked(verifyCookieValue).mockReturnValue({
        valid: true,
        value: userId,
      });
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({ id: userId } as never);

      const result = await validateAuth();

      expect(result.authenticated).toBe(true);
      expect(result.userId).toBe(userId);
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: userId,
            role: "USER",
          }),
        }),
      );
    });

    it("should create admin user when admin cookie present in dev", async () => {
      vi.stubEnv("NODE_ENV", "development");

      const userId = "admin-user";
      // Mock get() to return correct values based on cookie name
      mockCookieStore.get.mockImplementation((name: string) => {
        if (name === "mirrorbuddy-user-id") {
          return { value: `${userId}.validsig` };
        }
        if (name === "mirrorbuddy-admin") {
          return { value: "admin-session" };
        }
        return undefined;
      });

      vi.mocked(isSignedCookie).mockReturnValue(true);
      vi.mocked(verifyCookieValue).mockReturnValue({
        valid: true,
        value: userId,
      });
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({ id: userId } as never);

      const result = await validateAuth();

      expect(result.authenticated).toBe(true);
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: "ADMIN",
          }),
        }),
      );
    });

    it("should handle race condition on user creation (P2002)", async () => {
      vi.stubEnv("NODE_ENV", "development");

      const userId = "race-condition-user";
      mockCookieStore.get.mockReturnValue({ value: `${userId}.validsig` });
      vi.mocked(isSignedCookie).mockReturnValue(true);
      vi.mocked(verifyCookieValue).mockReturnValue({
        valid: true,
        value: userId,
      });
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(null) // First check
        .mockResolvedValueOnce({ id: userId } as never); // After race condition
      vi.mocked(prisma.user.create).mockRejectedValue({ code: "P2002" });

      const result = await validateAuth();

      expect(result.authenticated).toBe(true);
      expect(result.userId).toBe(userId);
    });

    it("should handle database errors gracefully", async () => {
      mockCookieStore.get.mockReturnValue({ value: "user.validsig" });
      vi.mocked(isSignedCookie).mockReturnValue(true);
      vi.mocked(verifyCookieValue).mockReturnValue({
        valid: true,
        value: "user",
      });
      vi.mocked(prisma.user.findUnique).mockRejectedValue(
        new Error("Database connection failed"),
      );

      const result = await validateAuth();

      expect(result.authenticated).toBe(false);
      expect(result.error).toBe("Auth validation failed");
    });

    it("should check legacy cookie when new cookie not present", async () => {
      const userId = "legacy-user";
      mockCookieStore.get
        .mockReturnValueOnce(undefined) // AUTH_COOKIE_NAME
        .mockReturnValueOnce({ value: `${userId}.validsig` }); // LEGACY_AUTH_COOKIE

      vi.mocked(isSignedCookie).mockReturnValue(true);
      vi.mocked(verifyCookieValue).mockReturnValue({
        valid: true,
        value: userId,
      });
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: userId,
      } as never);

      const result = await validateAuth();

      expect(result.authenticated).toBe(true);
      expect(result.userId).toBe(userId);
    });
  });

  describe("validateAdminAuth", () => {
    it("should return isAdmin=false when not authenticated", async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const result = await validateAdminAuth();

      expect(result.authenticated).toBe(false);
      expect(result.isAdmin).toBe(false);
    });

    it("should return isAdmin=false for regular users", async () => {
      const userId = "regular-user";
      mockCookieStore.get.mockReturnValue({ value: `${userId}.validsig` });
      vi.mocked(isSignedCookie).mockReturnValue(true);
      vi.mocked(verifyCookieValue).mockReturnValue({
        valid: true,
        value: userId,
      });
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce({ id: userId } as never) // validateAuth check
        .mockResolvedValueOnce({ role: "USER" } as never); // admin role check

      const result = await validateAdminAuth();

      expect(result.authenticated).toBe(true);
      expect(result.isAdmin).toBe(false);
    });

    it("should return isAdmin=true for admin users", async () => {
      const userId = "admin-user";
      mockCookieStore.get.mockReturnValue({ value: `${userId}.validsig` });
      vi.mocked(isSignedCookie).mockReturnValue(true);
      vi.mocked(verifyCookieValue).mockReturnValue({
        valid: true,
        value: userId,
      });
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce({ id: userId } as never) // validateAuth check
        .mockResolvedValueOnce({ role: "ADMIN" } as never); // admin role check

      const result = await validateAdminAuth();

      expect(result.authenticated).toBe(true);
      expect(result.isAdmin).toBe(true);
    });

    it("should handle database errors for admin check gracefully", async () => {
      const userId = "user-db-error";
      mockCookieStore.get.mockReturnValue({ value: `${userId}.validsig` });
      vi.mocked(isSignedCookie).mockReturnValue(true);
      vi.mocked(verifyCookieValue).mockReturnValue({
        valid: true,
        value: userId,
      });
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce({ id: userId } as never) // validateAuth check
        .mockRejectedValueOnce(new Error("DB error")); // admin role check

      const result = await validateAdminAuth();

      expect(result.authenticated).toBe(true);
      expect(result.isAdmin).toBe(false);
    });
  });

  describe("validateSessionOwnership", () => {
    it("should allow voice sessions for any authenticated user", async () => {
      const result = await validateSessionOwnership(
        "voice-maestro-123456",
        "user-123",
      );

      expect(result).toBe(true);
      expect(prisma.conversation.findFirst).not.toHaveBeenCalled();
    });

    it("should validate regular session ownership", async () => {
      vi.mocked(prisma.conversation.findFirst).mockResolvedValue({
        id: "session-123",
      } as never);

      const result = await validateSessionOwnership("session-123", "user-123");

      expect(result).toBe(true);
      expect(prisma.conversation.findFirst).toHaveBeenCalledWith({
        where: {
          id: "session-123",
          userId: "user-123",
        },
        select: { id: true },
      });
    });

    it("should reject session not owned by user", async () => {
      vi.mocked(prisma.conversation.findFirst).mockResolvedValue(null);

      const result = await validateSessionOwnership(
        "session-123",
        "wrong-user",
      );

      expect(result).toBe(false);
    });

    it("should handle database errors gracefully", async () => {
      vi.mocked(prisma.conversation.findFirst).mockRejectedValue(
        new Error("DB error"),
      );

      const result = await validateSessionOwnership("session-123", "user-123");

      expect(result).toBe(false);
    });
  });

  describe("requireAuthenticatedUser", () => {
    it("should return userId when authenticated", async () => {
      const userId = "auth-user";
      mockCookieStore.get.mockReturnValue({ value: `${userId}.validsig` });
      vi.mocked(isSignedCookie).mockReturnValue(true);
      vi.mocked(verifyCookieValue).mockReturnValue({
        valid: true,
        value: userId,
      });
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: userId,
      } as never);

      const result = await requireAuthenticatedUser();

      expect(result.userId).toBe(userId);
      expect(result.errorResponse).toBeNull();
    });

    it("should return 401 error response when not authenticated", async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const result = await requireAuthenticatedUser();

      expect(result.userId).toBeNull();
      expect(result.errorResponse).not.toBeNull();
      // Check it's a Response-like object with status 401
      expect(result.errorResponse?.status).toBe(401);
    });
  });

  describe("Security Edge Cases", () => {
    it("should not accept empty cookie value", async () => {
      mockCookieStore.get.mockReturnValue({ value: "" });

      const result = await validateAuth();

      expect(result.authenticated).toBe(false);
    });

    it("should handle malformed cookie gracefully", async () => {
      mockCookieStore.get.mockReturnValue({ value: ".".repeat(100) });
      vi.mocked(isSignedCookie).mockReturnValue(false);

      const result = await validateAuth();

      expect(result.authenticated).toBe(false);
      expect(result.error).toBe("Invalid cookie format");
    });

    it("should handle SQL injection attempts in userId", async () => {
      const maliciousId = "'; DROP TABLE users; --";
      mockCookieStore.get.mockReturnValue({ value: `${maliciousId}.validsig` });
      vi.mocked(isSignedCookie).mockReturnValue(true);
      vi.mocked(verifyCookieValue).mockReturnValue({
        valid: true,
        value: maliciousId,
      });
      // Prisma handles parameterization, but verify the query is called
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const result = await validateAuth();

      // Should query with the exact ID (Prisma parameterizes)
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: maliciousId },
        select: { id: true },
      });
      expect(result.authenticated).toBe(false);
    });
  });
});
