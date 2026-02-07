/**
 * @vitest-environment node
 * Tests for POST /api/admin/email-test
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";
import { NextRequest } from "next/server";

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

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

// Mock email service
const mockSendTestEmail = vi.fn();
const mockIsEmailConfigured = vi.fn();
vi.mock("@/lib/email", () => ({
  sendTestEmail: (...args: unknown[]) => mockSendTestEmail(...args),
  isEmailConfigured: () => mockIsEmailConfigured(),
}));

// Mock audit service
const mockLogAdminAction = vi.fn();
const mockGetClientIp = vi.fn();
vi.mock("@/lib/admin/audit-service", () => ({
  logAdminAction: (...args: unknown[]) => mockLogAdminAction(...args),
  getClientIp: (...args: unknown[]) => mockGetClientIp(...args),
}));

// Mock CSRF
vi.mock("@/lib/security/csrf", () => ({
  requireCSRF: vi.fn().mockReturnValue(true),
}));

// Mock auth
const mockValidateAdminAuth = vi.fn();
vi.mock("@/lib/auth/session-auth", () => ({
  validateAdminAuth: () => mockValidateAdminAuth(),
}));

describe("POST /api/admin/email-test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClientIp.mockReturnValue("127.0.0.1");
  });

  it("returns 401 if not authenticated", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: false,
      isAdmin: false,
    });
    const req = new NextRequest("http://localhost:3000/api/admin/email-test", {
      method: "POST",
      body: JSON.stringify({ to: "test@example.com" }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 403 if not admin", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: false,
      userId: "user-1",
    });
    const req = new NextRequest("http://localhost:3000/api/admin/email-test", {
      method: "POST",
      body: JSON.stringify({ to: "test@example.com" }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden: admin access required");
  });

  it("returns 400 if 'to' field is missing", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: "admin-1",
    });
    const req = new NextRequest("http://localhost:3000/api/admin/email-test", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBe("Missing required field: 'to'");
  });

  it("returns 400 if email format is invalid", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: "admin-1",
    });
    const req = new NextRequest("http://localhost:3000/api/admin/email-test", {
      method: "POST",
      body: JSON.stringify({ to: "invalid-email" }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toContain("Invalid email address format");
  });

  it("returns 400 if request body is invalid JSON", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: "admin-1",
    });
    const req = new NextRequest("http://localhost:3000/api/admin/email-test", {
      method: "POST",
      body: "invalid-json",
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid JSON in request body");
  });

  it("returns 503 if email service is not configured", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: "admin-1",
    });
    mockIsEmailConfigured.mockReturnValueOnce(false);
    const req = new NextRequest("http://localhost:3000/api/admin/email-test", {
      method: "POST",
      body: JSON.stringify({ to: "test@example.com" }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(503);
    expect(data.success).toBe(false);
    expect(data.error).toContain("Email service not configured");
  });

  it("returns 200 with messageId on successful send", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: "admin-1",
    });
    mockIsEmailConfigured.mockReturnValueOnce(true);
    mockSendTestEmail.mockResolvedValueOnce({
      success: true,
      messageId: "msg-123",
    });
    const req = new NextRequest("http://localhost:3000/api/admin/email-test", {
      method: "POST",
      body: JSON.stringify({ to: "test@example.com" }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.messageId).toBe("msg-123");
    expect(mockSendTestEmail).toHaveBeenCalledWith("test@example.com");
  });

  it("logs admin action on successful send", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: "admin-1",
    });
    mockIsEmailConfigured.mockReturnValueOnce(true);
    mockSendTestEmail.mockResolvedValueOnce({
      success: true,
      messageId: "msg-456",
    });
    const req = new NextRequest("http://localhost:3000/api/admin/email-test", {
      method: "POST",
      body: JSON.stringify({ to: "admin@example.com" }),
    });
    await POST(req);
    expect(mockLogAdminAction).toHaveBeenCalledWith({
      action: "SEND_TEST_EMAIL",
      entityType: "EmailTest",
      entityId: "admin@example.com",
      adminId: "admin-1",
      details: { messageId: "msg-456" },
      ipAddress: "127.0.0.1",
    });
  });

  it("does not log admin action if send fails", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: "admin-1",
    });
    mockIsEmailConfigured.mockReturnValueOnce(true);
    mockSendTestEmail.mockResolvedValueOnce({
      success: false,
      error: "Send failed",
    });
    const req = new NextRequest("http://localhost:3000/api/admin/email-test", {
      method: "POST",
      body: JSON.stringify({ to: "test@example.com" }),
    });
    await POST(req);
    expect(mockLogAdminAction).not.toHaveBeenCalled();
  });

  it("returns error response if sendTestEmail fails", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: "admin-1",
    });
    mockIsEmailConfigured.mockReturnValueOnce(true);
    mockSendTestEmail.mockResolvedValueOnce({
      success: false,
      error: "SMTP connection failed",
    });
    const req = new NextRequest("http://localhost:3000/api/admin/email-test", {
      method: "POST",
      body: JSON.stringify({ to: "test@example.com" }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(false);
    expect(data.error).toBe("SMTP connection failed");
  });
});
