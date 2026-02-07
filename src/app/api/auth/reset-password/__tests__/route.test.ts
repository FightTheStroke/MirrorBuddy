/**
 * Tests for reset-password API route
 * TDD: Write tests FIRST, then implement
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "../route";
import * as password from "@/lib/auth/password";

// Hoisted mock for Prisma (avoids "cannot access before initialization")
const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    passwordResetToken: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/auth/password");
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

describe("POST /api/auth/reset-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 if token is missing", async () => {
    const req = new Request("http://localhost/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "NewPassword123!" }),
    });

    const response = await POST(req as never);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Token and password are required");
  });

  it("should return 400 if password is missing", async () => {
    const req = new Request("http://localhost/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "some-token" }),
    });

    const response = await POST(req as never);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Token and password are required");
  });

  it("should return 400 if password is too weak", async () => {
    vi.mocked(password.validatePasswordStrength).mockReturnValue({
      valid: false,
      errors: ["Password must be at least 8 characters"],
    });

    const req = new Request("http://localhost/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "some-token", password: "weak" }),
    });

    const response = await POST(req as never);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Password not strong enough");
  });

  it("should return 400 if token does not exist", async () => {
    vi.mocked(password.validatePasswordStrength).mockReturnValue({
      valid: true,
      errors: [],
    });
    mockPrisma.passwordResetToken.findFirst.mockResolvedValue(null);

    const req = new Request("http://localhost/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: "invalid-token",
        password: "NewPassword123!",
      }),
    });

    const response = await POST(req as never);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Invalid or expired token");
  });

  it("should return 400 if token is expired", async () => {
    const expiredToken = {
      id: "token-123",
      token: "valid-token",
      userId: "user-123",
      expiresAt: new Date(Date.now() - 1000),
      used: false,
      createdAt: new Date(Date.now() - 3600000),
    };

    vi.mocked(password.validatePasswordStrength).mockReturnValue({
      valid: true,
      errors: [],
    });
    mockPrisma.passwordResetToken.findFirst.mockResolvedValue(expiredToken);

    const req = new Request("http://localhost/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: "valid-token",
        password: "NewPassword123!",
      }),
    });

    const response = await POST(req as never);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Invalid or expired token");
  });

  it("should return 400 if token was already used", async () => {
    const usedToken = {
      id: "token-123",
      token: "valid-token",
      userId: "user-123",
      expiresAt: new Date(Date.now() + 3600000),
      used: true,
      createdAt: new Date(),
    };

    vi.mocked(password.validatePasswordStrength).mockReturnValue({
      valid: true,
      errors: [],
    });
    mockPrisma.passwordResetToken.findFirst.mockResolvedValue(usedToken);

    const req = new Request("http://localhost/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: "valid-token",
        password: "NewPassword123!",
      }),
    });

    const response = await POST(req as never);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Invalid or expired token");
  });

  it("should successfully reset password with valid token", async () => {
    const validToken = {
      id: "token-123",
      token: "valid-token",
      userId: "user-123",
      expiresAt: new Date(Date.now() + 3600000),
      used: false,
      createdAt: new Date(),
    };

    vi.mocked(password.validatePasswordStrength).mockReturnValue({
      valid: true,
      errors: [],
    });
    mockPrisma.passwordResetToken.findFirst.mockResolvedValue(validToken);
    vi.mocked(password.hashPassword).mockResolvedValue("hashed-password");
    mockPrisma.$transaction.mockResolvedValue([{}, {}]);

    const req = new Request("http://localhost/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: "valid-token",
        password: "NewPassword123!",
      }),
    });

    const response = await POST(req as never);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.message).toBe("Password reset successfully");

    // Verify password was hashed
    expect(password.hashPassword).toHaveBeenCalledWith("NewPassword123!");
    // Verify $transaction was called
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
