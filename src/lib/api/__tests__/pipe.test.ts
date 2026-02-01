/**
 * Tests for pipe() - Composable API handler pipeline
 * Plan 113: T1-01 - Create composable middleware system
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import type { Middleware } from "../pipe";

// Mock dependencies
vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

describe("pipe() - Composable API handler pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("F-02: Basic composition", () => {
    it("should execute middlewares in order", async () => {
      const { pipe } = await import("../pipe");
      const executionOrder: string[] = [];

      const middleware1: Middleware = async (ctx, next) => {
        executionOrder.push("m1-before");
        const response = await next();
        executionOrder.push("m1-after");
        return response;
      };

      const middleware2: Middleware = async (ctx, next) => {
        executionOrder.push("m2-before");
        const response = await next();
        executionOrder.push("m2-after");
        return response;
      };

      const handler = pipe(
        middleware1,
        middleware2,
      )(async (_ctx) => {
        executionOrder.push("handler");
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      const req = new NextRequest("http://localhost:3000/api/test", {
        method: "GET",
      });

      await handler(req);

      expect(executionOrder).toEqual([
        "m1-before",
        "m2-before",
        "handler",
        "m2-after",
        "m1-after",
      ]);
    });

    it("should work with no middlewares", async () => {
      const { pipe } = await import("../pipe");

      const handler = pipe()(async (_ctx) => {
        return new Response(JSON.stringify({ data: "test" }), {
          status: 200,
        });
      });

      const req = new NextRequest("http://localhost:3000/api/test", {
        method: "GET",
      });

      const response = await handler(req);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toEqual({ data: "test" });
    });
  });

  describe("F-20: Context accumulation", () => {
    it("should accumulate typed properties through middleware chain", async () => {
      const { pipe } = await import("../pipe");

      const authMiddleware: Middleware = async (ctx, next) => {
        ctx.userId = "user-123";
        ctx.isAdmin = false;
        return next();
      };

      const roleMiddleware: Middleware = async (ctx, next) => {
        ctx.role = "editor";
        return next();
      };

      const handler = pipe(
        authMiddleware,
        roleMiddleware,
      )(async (ctx) => {
        expect(ctx.userId).toBe("user-123");
        expect(ctx.isAdmin).toBe(false);
        expect(ctx.role).toBe("editor");

        return new Response(JSON.stringify({ userId: ctx.userId }), {
          status: 200,
        });
      });

      const req = new NextRequest("http://localhost:3000/api/test", {
        method: "GET",
      });

      await handler(req);
    });

    it("should pass routeContext.params through to handler", async () => {
      const { pipe } = await import("../pipe");

      const handler = pipe()(async (ctx) => {
        const params = await ctx.params;
        expect(params).toEqual({ id: "123", slug: "test-post" });

        return new Response(JSON.stringify({ params }), { status: 200 });
      });

      const req = new NextRequest("http://localhost:3000/api/posts/123", {
        method: "GET",
      });

      await handler(req, {
        params: Promise.resolve({ id: "123", slug: "test-post" }),
      });
    });

    it("should provide empty params if routeContext not provided", async () => {
      const { pipe } = await import("../pipe");

      const handler = pipe()(async (ctx) => {
        const params = await ctx.params;
        expect(params).toEqual({});

        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      });

      const req = new NextRequest("http://localhost:3000/api/test", {
        method: "GET",
      });

      await handler(req);
    });
  });

  describe("Error handling and Sentry integration", () => {
    it("should catch errors and return 500", async () => {
      const { pipe } = await import("../pipe");
      const { logger } = await import("@/lib/logger");

      const handler = pipe()(async () => {
        throw new Error("Test error");
      });

      const req = new NextRequest("http://localhost:3000/api/test", {
        method: "POST",
      });

      const response = await handler(req);

      expect(response.status).toBe(500);
      expect(logger.error).toHaveBeenCalled();
    });

    it("should capture 5xx errors to Sentry", async () => {
      const { pipe } = await import("../pipe");
      const Sentry = await import("@sentry/nextjs");

      const handler = pipe()(async () => {
        throw new Error("Server error");
      });

      const req = new NextRequest("http://localhost:3000/api/test", {
        method: "GET",
      });

      await handler(req);

      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: expect.objectContaining({
            api: "/api/test",
            method: "GET",
          }),
        }),
      );
    });

    it("should handle ApiError with custom status code", async () => {
      const { pipe, ApiError } = await import("../pipe");
      const Sentry = await import("@sentry/nextjs");

      const handler = pipe()(async () => {
        throw new ApiError("Not found", 404);
      });

      const req = new NextRequest("http://localhost:3000/api/test", {
        method: "GET",
      });

      const response = await handler(req);

      expect(response.status).toBe(404);
      // 4xx errors should not be sent to Sentry
      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it("should send ApiError with 5xx status to Sentry", async () => {
      const { pipe, ApiError } = await import("../pipe");
      const Sentry = await import("@sentry/nextjs");

      const handler = pipe()(async () => {
        throw new ApiError("Internal error", 503);
      });

      const req = new NextRequest("http://localhost:3000/api/test", {
        method: "GET",
      });

      await handler(req);

      expect(Sentry.captureException).toHaveBeenCalled();
    });
  });

  describe("Logging", () => {
    it("should log successful requests with timing", async () => {
      const { pipe } = await import("../pipe");
      const { logger } = await import("@/lib/logger");

      const handler = pipe()(async () => {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      });

      const req = new NextRequest("http://localhost:3000/api/test", {
        method: "GET",
      });

      await handler(req);

      expect(logger.debug).toHaveBeenCalledWith(
        "API request completed",
        expect.objectContaining({
          method: "GET",
          path: "/api/test",
          status: 200,
          durationMs: expect.any(Number),
        }),
      );
    });

    it("should log failed requests with timing", async () => {
      const { pipe } = await import("../pipe");
      const { logger } = await import("@/lib/logger");

      const handler = pipe()(async () => {
        throw new Error("Test failure");
      });

      const req = new NextRequest("http://localhost:3000/api/test", {
        method: "POST",
      });

      await handler(req);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("API Error"),
        expect.objectContaining({
          error: "Test failure",
        }),
      );
    });
  });

  describe("Streaming Response support", () => {
    it("should pass through streaming Response without modification", async () => {
      const { pipe } = await import("../pipe");

      const handler = pipe()(async () => {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode("data: chunk1\n\n"));
            controller.enqueue(encoder.encode("data: chunk2\n\n"));
            controller.close();
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      });

      const req = new NextRequest("http://localhost:3000/api/stream", {
        method: "GET",
      });

      const response = await handler(req);

      expect(response.headers.get("Content-Type")).toBe("text/event-stream");
      expect(response.body).toBeInstanceOf(ReadableStream);

      // Read the stream to verify content
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let result = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
      }

      expect(result).toContain("chunk1");
      expect(result).toContain("chunk2");
    });
  });

  describe("Middleware can short-circuit", () => {
    it("should allow middleware to return early without calling next()", async () => {
      const { pipe } = await import("../pipe");

      const authMiddleware: Middleware = async (_ctx, _next) => {
        // Short-circuit if not authorized
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
        });
      };

      const handler = pipe(authMiddleware)(async () => {
        // This should never be called
        throw new Error("Handler should not be called");
      });

      const req = new NextRequest("http://localhost:3000/api/test", {
        method: "GET",
      });

      const response = await handler(req);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toEqual({ error: "Unauthorized" });
    });
  });
});
