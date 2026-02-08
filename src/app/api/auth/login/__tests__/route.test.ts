/**
 * Login API Tests
 *
 * Tests the POST /api/auth/login endpoint to ensure:
 * 1. Both httpOnly and client-readable cookies are set on successful login
 * 2. Authentication works correctly
 * 3. Error handling is proper
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { POST } from "../route";

interface ResponseCookie {
  name: string;
  value: string;
  httpOnly?: boolean;
}

// Mock dependencies
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/server")>();
  return {
    ...actual,
    verifyPassword: vi.fn(),
    signCookieValue: vi.fn(),
  };
});

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimitAsync: vi.fn().mockResolvedValue({ success: true }),
  getClientIdentifier: vi.fn().mockReturnValue("test-ip"),
  getRateLimitIdentifier: vi.fn().mockReturnValue("test-ip"),
  rateLimitResponse: vi.fn(),
  RATE_LIMITS: { AUTH_LOGIN: { limit: 5, window: 900 } },
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

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

vi.mock("@/lib/security", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/security")>();
  return { ...actual, requireCSRF: vi.fn().mockReturnValue(true) };
});

import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/server";
import { signCookieValue } from "@/lib/auth/server";

const mockPrismaFindFirst = prisma.user.findFirst as ReturnType<typeof vi.fn>;
const mockVerifyPassword = verifyPassword as ReturnType<typeof vi.fn>;
const mockSignCookieValue = signCookieValue as ReturnType<typeof vi.fn>;

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets both httpOnly and client-readable cookies on successful login", async () => {
    const mockUser = {
      id: "user-123",
      username: "testuser",
      passwordHash: "hashed-password",
      disabled: false,
      mustChangePassword: false,
      role: "USER",
    };

    mockPrismaFindFirst.mockResolvedValueOnce(mockUser);
    mockVerifyPassword.mockResolvedValueOnce(true);
    mockSignCookieValue.mockReturnValueOnce({ signed: "signed-cookie-value" });

    const request = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", password: "password" }),
    });

    const routeContext = { params: Promise.resolve({}) };
    const response = (await POST(request, routeContext)) as NextResponse;
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user.id).toBe("user-123");

    // Check cookies are set
    const cookies = response.cookies.getAll() as ResponseCookie[];
    const cookieNames = cookies.map((c: ResponseCookie) => c.name);

    // CRITICAL: Both cookies must be present
    expect(cookieNames).toContain("mirrorbuddy-user-id");
    expect(cookieNames).toContain("mirrorbuddy-user-id-client");

    // Verify httpOnly cookie properties
    const httpOnlyCookie = cookies.find(
      (c: ResponseCookie) => c.name === "mirrorbuddy-user-id",
    );
    expect(httpOnlyCookie?.httpOnly).toBe(true);
    expect(httpOnlyCookie?.value).toBe("signed-cookie-value");

    // Verify client-readable cookie properties
    const clientCookie = cookies.find(
      (c: ResponseCookie) => c.name === "mirrorbuddy-user-id-client",
    );
    expect(clientCookie?.httpOnly).toBe(false);
    expect(clientCookie?.value).toBe("user-123");
  });

  it("returns 401 for invalid credentials", async () => {
    mockPrismaFindFirst.mockResolvedValueOnce(null);

    const request = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "wrong@example.com", password: "wrong" }),
    });

    const routeContext = { params: Promise.resolve({}) };
    const response = (await POST(request, routeContext)) as NextResponse;
    expect(response.status).toBe(401);

    // No cookies should be set on failed login
    const cookies = response.cookies.getAll() as ResponseCookie[];
    expect(cookies).toHaveLength(0);
  });

  it("returns 401 for wrong password", async () => {
    const mockUser = {
      id: "user-123",
      username: "testuser",
      passwordHash: "hashed-password",
      disabled: false,
      mustChangePassword: false,
      role: "USER",
    };

    mockPrismaFindFirst.mockResolvedValueOnce(mockUser);
    mockVerifyPassword.mockResolvedValueOnce(false);

    const request = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "test@example.com",
        password: "wrongpassword",
      }),
    });

    const routeContext = { params: Promise.resolve({}) };
    const response = (await POST(request, routeContext)) as NextResponse;
    expect(response.status).toBe(401);

    // No cookies should be set on failed login
    const cookies = response.cookies.getAll() as ResponseCookie[];
    expect(cookies).toHaveLength(0);
  });

  it("returns 403 for disabled users", async () => {
    const mockUser = {
      id: "user-123",
      username: "testuser",
      passwordHash: "hashed-password",
      disabled: true,
      mustChangePassword: false,
      role: "USER",
    };

    mockPrismaFindFirst.mockResolvedValueOnce(mockUser);

    const request = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", password: "password" }),
    });

    const routeContext = { params: Promise.resolve({}) };
    const response = (await POST(request, routeContext)) as NextResponse;
    expect(response.status).toBe(403);

    // No cookies should be set for disabled users
    const cookies = response.cookies.getAll() as ResponseCookie[];
    expect(cookies).toHaveLength(0);
  });

  it("includes mustChangePassword flag in response", async () => {
    const mockUser = {
      id: "user-123",
      username: "testuser",
      passwordHash: "hashed-password",
      disabled: false,
      mustChangePassword: true,
      role: "USER",
    };

    mockPrismaFindFirst.mockResolvedValueOnce(mockUser);
    mockVerifyPassword.mockResolvedValueOnce(true);
    mockSignCookieValue.mockReturnValueOnce({ signed: "signed-cookie-value" });

    const request = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com", password: "password" }),
    });

    const routeContext = { params: Promise.resolve({}) };
    const response = await POST(request, routeContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user.mustChangePassword).toBe(true);
  });

  it("includes admin role in response for admin users", async () => {
    const mockUser = {
      id: "admin-123",
      username: "admin",
      passwordHash: "hashed-password",
      disabled: false,
      mustChangePassword: false,
      role: "ADMIN",
    };

    mockPrismaFindFirst.mockResolvedValueOnce(mockUser);
    mockVerifyPassword.mockResolvedValueOnce(true);
    mockSignCookieValue.mockReturnValueOnce({ signed: "signed-cookie-value" });

    const request = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "admin@example.com",
        password: "password",
      }),
    });

    const routeContext = { params: Promise.resolve({}) };
    const response = await POST(request, routeContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user.role).toBe("ADMIN");
  });

  it("includes valid redirect URL in response when provided", async () => {
    const mockUser = {
      id: "user-123",
      username: "testuser",
      passwordHash: "hashed-password",
      disabled: false,
      mustChangePassword: false,
      role: "USER",
    };

    mockPrismaFindFirst.mockResolvedValueOnce(mockUser);
    mockVerifyPassword.mockResolvedValueOnce(true);
    mockSignCookieValue.mockReturnValueOnce({ signed: "signed-cookie-value" });

    const request = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "test@example.com",
        password: "password",
        redirect: "/admin/dashboard",
      }),
    });

    const routeContext = { params: Promise.resolve({}) };
    const response = await POST(request, routeContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.redirect).toBe("/admin/dashboard");
  });

  it("rejects open redirect attempts with absolute URLs", async () => {
    const mockUser = {
      id: "user-123",
      username: "testuser",
      passwordHash: "hashed-password",
      disabled: false,
      mustChangePassword: false,
      role: "USER",
    };

    mockPrismaFindFirst.mockResolvedValueOnce(mockUser);
    mockVerifyPassword.mockResolvedValueOnce(true);
    mockSignCookieValue.mockReturnValueOnce({ signed: "signed-cookie-value" });

    const request = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "test@example.com",
        password: "password",
        redirect: "https://evil.com/phish",
      }),
    });

    const routeContext = { params: Promise.resolve({}) };
    const response = await POST(request, routeContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    // Should NOT include redirect for absolute URLs
    expect(data.redirect).toBeUndefined();
  });

  it("rejects open redirect attempts with protocol-relative URLs", async () => {
    const mockUser = {
      id: "user-123",
      username: "testuser",
      passwordHash: "hashed-password",
      disabled: false,
      mustChangePassword: false,
      role: "USER",
    };

    mockPrismaFindFirst.mockResolvedValueOnce(mockUser);
    mockVerifyPassword.mockResolvedValueOnce(true);
    mockSignCookieValue.mockReturnValueOnce({ signed: "signed-cookie-value" });

    const request = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "test@example.com",
        password: "password",
        redirect: "//evil.com/phish",
      }),
    });

    const routeContext = { params: Promise.resolve({}) };
    const response = await POST(request, routeContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    // Should NOT include redirect for protocol-relative URLs
    expect(data.redirect).toBeUndefined();
  });

  it("omits redirect from response when not provided", async () => {
    const mockUser = {
      id: "user-123",
      username: "testuser",
      passwordHash: "hashed-password",
      disabled: false,
      mustChangePassword: false,
      role: "USER",
    };

    mockPrismaFindFirst.mockResolvedValueOnce(mockUser);
    mockVerifyPassword.mockResolvedValueOnce(true);
    mockSignCookieValue.mockReturnValueOnce({ signed: "signed-cookie-value" });

    const request = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "test@example.com",
        password: "password",
      }),
    });

    const routeContext = { params: Promise.resolve({}) };
    const response = await POST(request, routeContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.redirect).toBeUndefined();
  });
});
