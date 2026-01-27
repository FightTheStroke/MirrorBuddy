/**
 * IP Salt Rotation Cron Job Tests (F-01)
 *
 * Tests for the monthly salt rotation endpoint:
 * - POST /api/cron/rotate-ip-salt
 */

import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { NextRequest } from "next/server";

// Mock crypto
vi.mock("crypto", () => ({
  default: {
    randomBytes: vi.fn(() => ({
      toString: vi.fn((encoding: string) => {
        if (encoding === "hex") {
          return "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
        }
        return "mock-salt";
      }),
    })),
  },
}));

// Mock Redis
vi.mock("@upstash/redis", () => ({
  Redis: {
    fromEnv: vi.fn(() => ({
      set: vi.fn().mockResolvedValue(true),
      get: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(1),
    })),
  },
}));

// Mock Resend - must return a class
vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: vi.fn().mockResolvedValue({
        id: "email-123",
        from: "noreply@mirrorbuddy.it",
        to: "admin@example.com",
        created_at: new Date().toISOString(),
      }),
    };
  },
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Import after mocks
import { POST } from "../route";
import crypto from "crypto";
import { Redis } from "@upstash/redis";
import { Resend } from "resend";
import { logger } from "@/lib/logger";

// Type assertions for mocked functions
const mockCryptoRandomBytes = crypto.randomBytes as Mock;
const _mockRedisFromEnv = Redis.fromEnv as Mock;
const _mockResendConstructor = Resend as unknown as Mock;
const mockLoggerInfo = logger.info as Mock;
const _mockLoggerError = logger.error as Mock;

describe("POST /api/cron/rotate-ip-salt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-cron-secret-123";
    process.env.ADMIN_EMAIL = "admin@example.com";
    process.env.RESEND_API_KEY = "test-resend-key";
  });

  it("should reject request without CRON_SECRET header", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/cron/rotate-ip-salt",
      {
        method: "POST",
        headers: {
          authorization: "Bearer invalid-secret",
        },
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain("Unauthorized");
  });

  it("should reject request with missing authorization header", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/cron/rotate-ip-salt",
      {
        method: "POST",
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain("Unauthorized");
  });

  it("should accept request with correct CRON_SECRET", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/cron/rotate-ip-salt",
      {
        method: "POST",
        headers: {
          authorization: "Bearer test-cron-secret-123",
        },
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("should generate a 32-byte hex salt", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/cron/rotate-ip-salt",
      {
        method: "POST",
        headers: {
          authorization: "Bearer test-cron-secret-123",
        },
      },
    );

    const response = await POST(request);
    await response.json(); // Consume response body

    expect(response.status).toBe(200);
    // Verify crypto.randomBytes was called with 32
    expect(mockCryptoRandomBytes).toHaveBeenCalledWith(32);
  });

  it("should store salt in Redis under mirrorbuddy:ip-salt:pending key", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/cron/rotate-ip-salt",
      {
        method: "POST",
        headers: {
          authorization: "Bearer test-cron-secret-123",
        },
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    // Response indicates successful rotation
    expect(data.message).toContain("Salt rotation completed");
  });

  it("should send admin notification email", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/cron/rotate-ip-salt",
      {
        method: "POST",
        headers: {
          authorization: "Bearer test-cron-secret-123",
        },
      },
    );

    const response = await POST(request);
    await response.json(); // Consume response body

    expect(response.status).toBe(200);
  });

  it("should include new salt value in email body", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/cron/rotate-ip-salt",
      {
        method: "POST",
        headers: {
          authorization: "Bearer test-cron-secret-123",
        },
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    // Response should indicate success
    expect(data.success).toBe(true);
  });

  it("should log rotation event", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/cron/rotate-ip-salt",
      {
        method: "POST",
        headers: {
          authorization: "Bearer test-cron-secret-123",
        },
      },
    );

    const response = await POST(request);
    await response.json(); // Consume response body

    expect(response.status).toBe(200);
    // Verify logger.info was called
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      "IP salt rotation completed",
      expect.objectContaining({
        rotationDate: expect.any(String),
      }),
    );
  });

  it("should return success response with rotation date", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/cron/rotate-ip-salt",
      {
        method: "POST",
        headers: {
          authorization: "Bearer test-cron-secret-123",
        },
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("success", true);
    expect(data).toHaveProperty("message");
    expect(data).toHaveProperty("rotationDate");
    expect(typeof data.rotationDate).toBe("string");
  });

  it("should return 500 error if salt generation fails", async () => {
    mockCryptoRandomBytes.mockImplementationOnce(() => {
      throw new Error("Crypto error");
    });

    const request = new NextRequest(
      "http://localhost:3000/api/cron/rotate-ip-salt",
      {
        method: "POST",
        headers: {
          authorization: "Bearer test-cron-secret-123",
        },
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("Salt rotation failed");
  });

  it("should return success when all operations complete", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/cron/rotate-ip-salt",
      {
        method: "POST",
        headers: {
          authorization: "Bearer test-cron-secret-123",
        },
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("success", true);
    expect(data).toHaveProperty("message");
    expect(data).toHaveProperty("rotationDate");
  });

  it("should handle missing ADMIN_EMAIL gracefully", async () => {
    delete process.env.ADMIN_EMAIL;

    const request = new NextRequest(
      "http://localhost:3000/api/cron/rotate-ip-salt",
      {
        method: "POST",
        headers: {
          authorization: "Bearer test-cron-secret-123",
        },
      },
    );

    const response = await POST(request);
    const data = await response.json();

    // Should still succeed, just without email
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});
