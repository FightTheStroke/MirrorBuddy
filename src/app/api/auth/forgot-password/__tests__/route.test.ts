/**
 * Tests for forgot-password API route
 * TDD: Write tests FIRST, then implement
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "../route";
import * as email from "@/lib/email";

// Hoisted mock for Prisma
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: {
      findFirst: vi.fn(),
    },
    passwordResetToken: {
      create: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/email");
vi.mock("@/lib/security", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/security")>();
  return { ...actual, hashPII: vi.fn().mockResolvedValue("mocked-hash") };
});
vi.mock("@/lib/email/templates/password-reset-template", () => ({
  getPasswordResetEmail: vi.fn().mockReturnValue({
    subject: "password reset",
    html: "<p>Reset</p>",
  }),
}));
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

// Mock pipe middlewares to pass through
vi.mock("@/lib/api/middlewares", () => ({
  pipe:
    () =>
    (handler: (ctx: { req: Request }) => Promise<Response>) =>
    (req: Request) =>
      handler({ req }),
  withSentry: () => {},
  withRateLimit: () => {},
}));

vi.mock("@/lib/rate-limit", () => ({
  RATE_LIMITS: { AUTH_LOGIN: {} },
}));

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 if email is missing", async () => {
    const req = new Request("http://localhost/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(req as never);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Email is required");
  });

  it("should return 400 if email is invalid", async () => {
    const req = new Request("http://localhost/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "invalid-email" }),
    });

    const response = await POST(req as never);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Invalid email format");
  });

  it("should return 200 even if user does not exist (security)", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);

    const req = new Request("http://localhost/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nonexistent@example.com" }),
    });

    const response = await POST(req as never);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.message).toBe(
      "If an account exists with this email, you will receive a password reset link",
    );
  });

  it("should generate token and send email for existing user", async () => {
    const mockUser = {
      id: "user-123",
      emailHash: "hash123",
      settings: { language: "en" },
    };

    mockPrisma.user.findFirst.mockResolvedValue(mockUser);
    mockPrisma.passwordResetToken.count.mockResolvedValue(0);
    mockPrisma.passwordResetToken.create.mockResolvedValue({
      id: "token-123",
      token: "random-token",
      userId: "user-123",
      expiresAt: new Date(Date.now() + 3600000),
      used: false,
      createdAt: new Date(),
    });
    vi.mocked(email.sendEmail).mockResolvedValue({
      success: true,
      messageId: "msg-123",
    });

    const req = new Request("http://localhost/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com" }),
    });

    const response = await POST(req as never);
    expect(response.status).toBe(200);

    // Verify token was created
    expect(mockPrisma.passwordResetToken.create).toHaveBeenCalled();
    // Verify email was sent
    expect(email.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "test@example.com",
        subject: "password reset",
      }),
    );
  });

  it("should respect rate limit per email", async () => {
    const mockUser = {
      id: "user-123",
      emailHash: "hash123",
      settings: { language: "en" },
    };

    mockPrisma.user.findFirst.mockResolvedValue(mockUser);
    mockPrisma.passwordResetToken.count.mockResolvedValue(3);

    const req = new Request("http://localhost/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com" }),
    });

    const response = await POST(req as never);
    expect(response.status).toBe(429);
    const data = await response.json();
    expect(data.error).toContain("Too many");
  });

  it("should handle email service failure gracefully", async () => {
    const mockUser = {
      id: "user-123",
      emailHash: "hash123",
      settings: { language: "en" },
    };

    mockPrisma.user.findFirst.mockResolvedValue(mockUser);
    mockPrisma.passwordResetToken.count.mockResolvedValue(0);
    mockPrisma.passwordResetToken.create.mockResolvedValue({
      id: "token-123",
      token: "random-token",
      userId: "user-123",
      expiresAt: new Date(Date.now() + 3600000),
      used: false,
      createdAt: new Date(),
    });
    vi.mocked(email.sendEmail).mockResolvedValue({
      success: false,
      error: "Email service unavailable",
    });

    const req = new Request("http://localhost/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com" }),
    });

    const response = await POST(req as never);
    expect(response.status).toBe(200); // Still return 200 for security
    const data = await response.json();
    expect(data.message).toBe(
      "If an account exists with this email, you will receive a password reset link",
    );
  });
});
