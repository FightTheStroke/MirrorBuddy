/**
 * Tests for forgot-password API route
 * TDD: Write tests FIRST, then implement
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "../route";
import { prisma } from "@/lib/db";
import * as email from "@/lib/email";

vi.mock("@/lib/db");
vi.mock("@/lib/email");
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
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

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
      email: "test@example.com",
      emailHash: "hash123",
    };

    vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as never);
    vi.mocked(prisma.passwordResetToken.create).mockResolvedValue({
      id: "token-123",
      token: "random-token",
      userId: "user-123",
      expiresAt: new Date(Date.now() + 3600000),
      used: false,
      createdAt: new Date(),
    } as never);
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
    expect(prisma.passwordResetToken.create).toHaveBeenCalled();
    // Verify email was sent
    expect(email.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "test@example.com",
        subject: expect.stringContaining("password reset"),
      }),
    );
  });

  it("should respect rate limit per email", async () => {
    const mockUser = {
      id: "user-123",
      email: "test@example.com",
      emailHash: "hash123",
    };

    vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as never);
    vi.mocked(prisma.passwordResetToken.count).mockResolvedValue(3);

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
      email: "test@example.com",
      emailHash: "hash123",
    };

    vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as never);
    vi.mocked(prisma.passwordResetToken.create).mockResolvedValue({
      id: "token-123",
      token: "random-token",
      userId: "user-123",
      expiresAt: new Date(Date.now() + 3600000),
      used: false,
      createdAt: new Date(),
    } as never);
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
