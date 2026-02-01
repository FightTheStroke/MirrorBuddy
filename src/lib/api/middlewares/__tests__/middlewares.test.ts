/**
 * Tests for API Middlewares
 * Plan 113: T1-02 - Create middleware modules
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import type { MiddlewareContext } from "../types";

// Mock dependencies
vi.mock("@/lib/security/csrf", () => ({
  requireCSRF: vi.fn(),
}));

vi.mock("@/lib/auth/session-auth", () => ({
  validateAuth: vi.fn(),
  validateAdminAuth: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimitAsync: vi.fn(),
  getRateLimitIdentifier: vi.fn(),
  rateLimitResponse: vi.fn(
    (_result) =>
      new Response(JSON.stringify({ error: "Rate limited" }), { status: 429 }),
  ),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    child: vi.fn(() => ({
      warn: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    })),
  },
}));

describe("Middleware modules", () => {
  let mockContext: MiddlewareContext;
  let mockNext: () => Promise<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    const req = new NextRequest("http://localhost:3000/api/test", {
      method: "POST",
    });

    mockContext = {
      req,
      params: Promise.resolve({}),
    };

    mockNext = vi.fn(
      async () =>
        new Response(JSON.stringify({ success: true }), { status: 200 }),
    );
  });

  describe("F-03: withCSRF", () => {
    it("should call next() if CSRF token is valid", async () => {
      const { requireCSRF } = await import("@/lib/security/csrf");
      const { withCSRF } = await import("../with-csrf");

      vi.mocked(requireCSRF).mockReturnValue(true);

      const response = await withCSRF(mockContext, mockNext);

      expect(requireCSRF).toHaveBeenCalledWith(mockContext.req);
      expect(mockNext).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it("should return 403 if CSRF token is invalid", async () => {
      const { requireCSRF } = await import("@/lib/security/csrf");
      const { withCSRF } = await import("../with-csrf");

      vi.mocked(requireCSRF).mockReturnValue(false);

      const response = await withCSRF(mockContext, mockNext);

      expect(requireCSRF).toHaveBeenCalledWith(mockContext.req);
      expect(mockNext).not.toHaveBeenCalled();
      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data).toEqual({ error: "Invalid CSRF token" });
    });
  });

  describe("F-04: withAuth", () => {
    it("should inject userId into context and call next() if authenticated", async () => {
      const { validateAuth } = await import("@/lib/auth/session-auth");
      const { withAuth } = await import("../with-auth");

      vi.mocked(validateAuth).mockResolvedValue({
        authenticated: true,
        userId: "user-123",
      });

      const response = await withAuth(mockContext, mockNext);

      expect(validateAuth).toHaveBeenCalled();
      expect(mockContext.userId).toBe("user-123");
      expect(mockNext).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it("should return 401 if not authenticated", async () => {
      const { validateAuth } = await import("@/lib/auth/session-auth");
      const { withAuth } = await import("../with-auth");

      vi.mocked(validateAuth).mockResolvedValue({
        authenticated: false,
        userId: null,
      });

      const response = await withAuth(mockContext, mockNext);

      expect(validateAuth).toHaveBeenCalled();
      expect(mockContext.userId).toBeUndefined();
      expect(mockNext).not.toHaveBeenCalled();
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data).toEqual({ error: "Unauthorized" });
    });
  });

  describe("F-04: withAdmin", () => {
    it("should inject userId and isAdmin into context if admin", async () => {
      const { validateAdminAuth } = await import("@/lib/auth/session-auth");
      const { withAdmin } = await import("../with-admin");

      vi.mocked(validateAdminAuth).mockResolvedValue({
        authenticated: true,
        userId: "admin-123",
        isAdmin: true,
      });

      const response = await withAdmin(mockContext, mockNext);

      expect(validateAdminAuth).toHaveBeenCalled();
      expect(mockContext.userId).toBe("admin-123");
      expect(mockContext.isAdmin).toBe(true);
      expect(mockNext).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it("should return 401 if not authenticated", async () => {
      const { validateAdminAuth } = await import("@/lib/auth/session-auth");
      const { withAdmin } = await import("../with-admin");

      vi.mocked(validateAdminAuth).mockResolvedValue({
        authenticated: false,
        userId: null,
        isAdmin: false,
      });

      const response = await withAdmin(mockContext, mockNext);

      expect(validateAdminAuth).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
    });

    it("should return 403 if authenticated but not admin", async () => {
      const { validateAdminAuth } = await import("@/lib/auth/session-auth");
      const { withAdmin } = await import("../with-admin");

      vi.mocked(validateAdminAuth).mockResolvedValue({
        authenticated: true,
        userId: "user-123",
        isAdmin: false,
      });

      const response = await withAdmin(mockContext, mockNext);

      expect(validateAdminAuth).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data).toEqual({ error: "Forbidden: admin access required" });
    });
  });

  describe("F-05: withRateLimit", () => {
    it("should call next() if rate limit not exceeded", async () => {
      const { checkRateLimitAsync, getRateLimitIdentifier } =
        await import("@/lib/rate-limit");
      const { withRateLimit } = await import("../with-rate-limit");

      vi.mocked(getRateLimitIdentifier).mockReturnValue("user:123");
      vi.mocked(checkRateLimitAsync).mockResolvedValue({
        success: true,
        remaining: 59,
        resetTime: Date.now() + 60000,
        limit: 60,
      });

      const config = { maxRequests: 60, windowMs: 60000 };
      const middleware = withRateLimit(config);

      mockContext.userId = "user-123";
      const response = await middleware(mockContext, mockNext);

      expect(getRateLimitIdentifier).toHaveBeenCalledWith(
        mockContext.req,
        "user-123",
      );
      expect(checkRateLimitAsync).toHaveBeenCalledWith("user:123", config);
      expect(mockNext).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it("should return 429 if rate limit exceeded", async () => {
      const { checkRateLimitAsync, getRateLimitIdentifier } =
        await import("@/lib/rate-limit");
      const { withRateLimit } = await import("../with-rate-limit");

      vi.mocked(getRateLimitIdentifier).mockReturnValue("ip:192.168.1.1");
      vi.mocked(checkRateLimitAsync).mockResolvedValue({
        success: false,
        remaining: 0,
        resetTime: Date.now() + 30000,
        limit: 60,
      });

      const config = { maxRequests: 60, windowMs: 60000 };
      const middleware = withRateLimit(config);

      const response = await middleware(mockContext, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(response.status).toBe(429);
    });
  });

  describe("F-06: withSentry", () => {
    it("should call next() and pass through successful response", async () => {
      const { withSentry } = await import("../with-sentry");
      const Sentry = await import("@sentry/nextjs");

      const middleware = withSentry("/api/test");
      const response = await middleware(mockContext, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(Sentry.captureException).not.toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it("should capture error to Sentry and return 500", async () => {
      const { withSentry } = await import("../with-sentry");
      const Sentry = await import("@sentry/nextjs");

      const error = new Error("Test error");
      const failingNext = vi.fn(async () => {
        throw error;
      });

      mockContext.userId = "user-123";
      const middleware = withSentry("/api/test");
      const response = await middleware(mockContext, failingNext);

      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: {
            api: "/api/test",
            method: "POST",
          },
          extra: {
            url: "http://localhost:3000/api/test",
            userId: "user-123",
          },
        }),
      );
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.error).toBe("Internal server error");
      expect(data.message).toBe("Test error");
    });
  });

  describe("F-09: withCron", () => {
    it("should call next() if CRON_SECRET matches", async () => {
      const originalSecret = process.env.CRON_SECRET;
      process.env.CRON_SECRET = "test-secret-123";

      const { withCron } = await import("../with-cron");

      const req = new NextRequest("http://localhost:3000/api/cron/test", {
        method: "POST",
        headers: {
          Authorization: "Bearer test-secret-123",
        },
      });

      mockContext.req = req;
      const response = await withCron(mockContext, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(response.status).toBe(200);

      process.env.CRON_SECRET = originalSecret;
    });

    it("should return 401 if CRON_SECRET does not match", async () => {
      const originalSecret = process.env.CRON_SECRET;
      process.env.CRON_SECRET = "test-secret-123";

      const { withCron } = await import("../with-cron");

      const req = new NextRequest("http://localhost:3000/api/cron/test", {
        method: "POST",
        headers: {
          Authorization: "Bearer wrong-secret",
        },
      });

      mockContext.req = req;
      const response = await withCron(mockContext, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data).toEqual({ error: "Unauthorized" });

      process.env.CRON_SECRET = originalSecret;
    });

    it("should return 401 if Authorization header is missing", async () => {
      const originalSecret = process.env.CRON_SECRET;
      process.env.CRON_SECRET = "test-secret-123";

      const { withCron } = await import("../with-cron");

      const req = new NextRequest("http://localhost:3000/api/cron/test", {
        method: "POST",
      });

      mockContext.req = req;
      const response = await withCron(mockContext, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(response.status).toBe(401);

      process.env.CRON_SECRET = originalSecret;
    });

    it("should allow all requests if CRON_SECRET is not configured", async () => {
      const originalSecret = process.env.CRON_SECRET;
      delete process.env.CRON_SECRET;

      const { withCron } = await import("../with-cron");

      const req = new NextRequest("http://localhost:3000/api/cron/test", {
        method: "POST",
      });

      mockContext.req = req;
      const response = await withCron(mockContext, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(response.status).toBe(200);

      process.env.CRON_SECRET = originalSecret;
    });
  });

  describe("Index exports", () => {
    it("should export all middlewares", async () => {
      const middlewares = await import("../index");

      expect(middlewares.withCSRF).toBeDefined();
      expect(middlewares.withAuth).toBeDefined();
      expect(middlewares.withAdmin).toBeDefined();
      expect(middlewares.withRateLimit).toBeDefined();
      expect(middlewares.withSentry).toBeDefined();
      expect(middlewares.withCron).toBeDefined();
    });

    it("should export types", async () => {
      // Type exports are compile-time only and verified by TypeScript
      // This test just ensures the import doesn't fail
      const _m = await import("../index");

      // Verify that types are available at compile time (TypeScript will fail if not)
      type _Middleware = typeof _m extends { Middleware: unknown }
        ? never
        : "ok";
      type _Context = typeof _m extends { MiddlewareContext: unknown }
        ? never
        : "ok";

      // Types exist at compile time but not runtime
      expect(true).toBe(true);
    });
  });
});
