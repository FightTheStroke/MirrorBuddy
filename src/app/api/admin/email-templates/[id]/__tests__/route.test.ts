/**
 * @vitest-environment node
 * Tests for GET/PUT/DELETE /api/admin/email-templates/[id]
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PUT, DELETE } from "../route";
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

// Mock template service
const mockGetTemplate = vi.fn();
const mockUpdateTemplate = vi.fn();
const mockDeleteTemplate = vi.fn();
vi.mock("@/lib/email/template-service", () => ({
  getTemplate: (...args: unknown[]) => mockGetTemplate(...args),
  updateTemplate: (...args: unknown[]) => mockUpdateTemplate(...args),
  deleteTemplate: (...args: unknown[]) => mockDeleteTemplate(...args),
}));

// Mock audit service
const mockLogAdminAction = vi.fn();
const mockGetClientIp = vi.fn();
vi.mock("@/lib/admin/audit-service", () => ({
  logAdminAction: (...args: unknown[]) => mockLogAdminAction(...args),
  getClientIp: (...args: unknown[]) => mockGetClientIp(...args),
}));

// Mock CSRF
vi.mock("@/lib/security", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/security")>();
  return { ...actual, requireCSRF: vi.fn().mockReturnValue(true) };
});

// Mock auth
const mockValidateAdminAuth = vi.fn();
vi.mock("@/lib/auth/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/server")>();
  return { ...actual, validateAdminAuth: () => mockValidateAdminAuth() };
});

describe("GET /api/admin/email-templates/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClientIp.mockReturnValue("127.0.0.1");
  });

  it("returns 401 if not authenticated", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: false,
      isAdmin: false,
    });
    const req = new NextRequest(
      "http://localhost:3000/api/admin/email-templates/tpl-1",
      {
        method: "GET",
      },
    );
    const res = await GET(req, { params: Promise.resolve({ id: "tpl-1" }) });
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
    const req = new NextRequest(
      "http://localhost:3000/api/admin/email-templates/tpl-1",
      {
        method: "GET",
      },
    );
    const res = await GET(req, { params: Promise.resolve({ id: "tpl-1" }) });
    const data = await res.json();
    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden: admin access required");
  });

  it("returns 404 if template not found", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: "admin-1",
    });
    mockGetTemplate.mockResolvedValueOnce(null);
    const req = new NextRequest(
      "http://localhost:3000/api/admin/email-templates/tpl-999",
      {
        method: "GET",
      },
    );
    const res = await GET(req, { params: Promise.resolve({ id: "tpl-999" }) });
    const data = await res.json();
    expect(res.status).toBe(404);
    expect(data.error).toBe("Email template not found");
  });

  it("returns template successfully", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: "admin-1",
    });
    const mockTemplate = {
      id: "tpl-1",
      name: "Welcome",
      subject: "Welcome!",
      htmlBody: "<p>Hello {{name}}</p>",
      textBody: "Hello {{name}}",
      category: "onboarding",
      variables: ["name"],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockGetTemplate.mockResolvedValueOnce(mockTemplate);
    const req = new NextRequest(
      "http://localhost:3000/api/admin/email-templates/tpl-1",
      {
        method: "GET",
      },
    );
    const res = await GET(req, { params: Promise.resolve({ id: "tpl-1" }) });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.template).toMatchObject({
      id: "tpl-1",
      name: "Welcome",
      subject: "Welcome!",
      htmlBody: "<p>Hello {{name}}</p>",
      textBody: "Hello {{name}}",
      category: "onboarding",
      variables: ["name"],
      isActive: true,
    });
    expect(mockGetTemplate).toHaveBeenCalledWith("tpl-1");
  });

  it("handles service errors gracefully", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: "admin-1",
    });
    mockGetTemplate.mockRejectedValueOnce(new Error("Database error"));
    const req = new NextRequest(
      "http://localhost:3000/api/admin/email-templates/tpl-1",
      {
        method: "GET",
      },
    );
    const res = await GET(req, { params: Promise.resolve({ id: "tpl-1" }) });
    const data = await res.json();
    expect(res.status).toBe(500);
    expect(data.error).toContain("Failed to fetch email template");
  });
});

describe("PUT /api/admin/email-templates/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClientIp.mockReturnValue("127.0.0.1");
  });

  it("returns 401 if not authenticated", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: false,
      isAdmin: false,
    });
    const req = new NextRequest(
      "http://localhost:3000/api/admin/email-templates/tpl-1",
      {
        method: "PUT",
        body: JSON.stringify({ name: "Updated" }),
      },
    );
    const res = await PUT(req, { params: Promise.resolve({ id: "tpl-1" }) });
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
    const req = new NextRequest(
      "http://localhost:3000/api/admin/email-templates/tpl-1",
      {
        method: "PUT",
        body: JSON.stringify({ name: "Updated" }),
      },
    );
    const res = await PUT(req, { params: Promise.resolve({ id: "tpl-1" }) });
    const data = await res.json();
    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden: admin access required");
  });

  it("returns 400 if request body is invalid JSON", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: "admin-1",
    });
    const req = new NextRequest(
      "http://localhost:3000/api/admin/email-templates/tpl-1",
      {
        method: "PUT",
        body: "invalid-json",
      },
    );
    const res = await PUT(req, { params: Promise.resolve({ id: "tpl-1" }) });
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid JSON in request body");
  });

  it("updates template successfully", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: "admin-1",
    });
    const updatedTemplate = {
      id: "tpl-1",
      name: "Updated Welcome",
      subject: "Welcome!",
      htmlBody: "<p>Hi {{name}}</p>",
      textBody: "Hi {{name}}",
      category: "onboarding",
      variables: ["name"],
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockUpdateTemplate.mockResolvedValueOnce(updatedTemplate);
    const req = new NextRequest(
      "http://localhost:3000/api/admin/email-templates/tpl-1",
      {
        method: "PUT",
        body: JSON.stringify({ name: "Updated Welcome", isActive: false }),
      },
    );
    const res = await PUT(req, { params: Promise.resolve({ id: "tpl-1" }) });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.template).toMatchObject({
      id: "tpl-1",
      name: "Updated Welcome",
      isActive: false,
    });
    expect(mockUpdateTemplate).toHaveBeenCalledWith("tpl-1", {
      name: "Updated Welcome",
      isActive: false,
    });
  });

  it("logs admin action on successful update", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: "admin-1",
    });
    const updatedTemplate = {
      id: "tpl-1",
      name: "Updated",
      subject: "Test",
      htmlBody: "<p>Test</p>",
      textBody: "Test",
      category: "test",
      variables: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockUpdateTemplate.mockResolvedValueOnce(updatedTemplate);
    const req = new NextRequest(
      "http://localhost:3000/api/admin/email-templates/tpl-1",
      {
        method: "PUT",
        body: JSON.stringify({ name: "Updated" }),
      },
    );
    await PUT(req, { params: Promise.resolve({ id: "tpl-1" }) });
    expect(mockLogAdminAction).toHaveBeenCalledWith({
      action: "UPDATE_EMAIL_TEMPLATE",
      entityType: "EmailTemplate",
      entityId: "tpl-1",
      adminId: "admin-1",
      details: { name: "Updated" },
      ipAddress: "127.0.0.1",
    });
  });

  it("handles service errors gracefully", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: "admin-1",
    });
    mockUpdateTemplate.mockRejectedValueOnce(new Error("Database error"));
    const req = new NextRequest(
      "http://localhost:3000/api/admin/email-templates/tpl-1",
      {
        method: "PUT",
        body: JSON.stringify({ name: "Updated" }),
      },
    );
    const res = await PUT(req, { params: Promise.resolve({ id: "tpl-1" }) });
    const data = await res.json();
    expect(res.status).toBe(500);
    expect(data.error).toContain("Failed to update email template");
  });
});

describe("DELETE /api/admin/email-templates/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClientIp.mockReturnValue("127.0.0.1");
  });

  it("returns 401 if not authenticated", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: false,
      isAdmin: false,
    });
    const req = new NextRequest(
      "http://localhost:3000/api/admin/email-templates/tpl-1",
      {
        method: "DELETE",
      },
    );
    const res = await DELETE(req, { params: Promise.resolve({ id: "tpl-1" }) });
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
    const req = new NextRequest(
      "http://localhost:3000/api/admin/email-templates/tpl-1",
      {
        method: "DELETE",
      },
    );
    const res = await DELETE(req, { params: Promise.resolve({ id: "tpl-1" }) });
    const data = await res.json();
    expect(res.status).toBe(403);
    expect(data.error).toBe("Forbidden: admin access required");
  });

  it("deletes template successfully", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: "admin-1",
    });
    const deletedTemplate = {
      id: "tpl-1",
      name: "Old Template",
      subject: "Test",
      htmlBody: "<p>Test</p>",
      textBody: "Test",
      category: "test",
      variables: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockDeleteTemplate.mockResolvedValueOnce(deletedTemplate);
    const req = new NextRequest(
      "http://localhost:3000/api/admin/email-templates/tpl-1",
      {
        method: "DELETE",
      },
    );
    const res = await DELETE(req, { params: Promise.resolve({ id: "tpl-1" }) });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("Email template deleted successfully");
    expect(mockDeleteTemplate).toHaveBeenCalledWith("tpl-1");
  });

  it("logs admin action on successful deletion", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: "admin-1",
    });
    const deletedTemplate = {
      id: "tpl-1",
      name: "Deleted",
      subject: "Test",
      htmlBody: "<p>Test</p>",
      textBody: "Test",
      category: "test",
      variables: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockDeleteTemplate.mockResolvedValueOnce(deletedTemplate);
    const req = new NextRequest(
      "http://localhost:3000/api/admin/email-templates/tpl-1",
      {
        method: "DELETE",
      },
    );
    await DELETE(req, { params: Promise.resolve({ id: "tpl-1" }) });
    expect(mockLogAdminAction).toHaveBeenCalledWith({
      action: "DELETE_EMAIL_TEMPLATE",
      entityType: "EmailTemplate",
      entityId: "tpl-1",
      adminId: "admin-1",
      details: { name: "Deleted" },
      ipAddress: "127.0.0.1",
    });
  });

  it("handles service errors gracefully", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: "admin-1",
    });
    mockDeleteTemplate.mockRejectedValueOnce(new Error("Database error"));
    const req = new NextRequest(
      "http://localhost:3000/api/admin/email-templates/tpl-1",
      {
        method: "DELETE",
      },
    );
    const res = await DELETE(req, { params: Promise.resolve({ id: "tpl-1" }) });
    const data = await res.json();
    expect(res.status).toBe(500);
    expect(data.error).toContain("Failed to delete email template");
  });
});
