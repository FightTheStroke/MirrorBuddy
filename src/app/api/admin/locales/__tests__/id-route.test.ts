/**
 * @vitest-environment node
 * Tests for GET /api/admin/locales/[id], PUT /api/admin/locales/[id], DELETE /api/admin/locales/[id]
 */

import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

const mockValidateAdminAuth = vi.fn();
vi.mock("@/lib/auth/session-auth", () => ({
  validateAdminAuth: () => mockValidateAdminAuth(),
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    localeConfig: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    localeAuditLog: {
      create: vi.fn(),
    },
  },
}));
vi.mock("@/lib/locale/locale-audit-service", () => ({
  logLocaleCreate: vi.fn(),
  logLocaleUpdate: vi.fn(),
  logLocaleDelete: vi.fn(),
}));

vi.mock("@/lib/security/csrf", () => ({
  requireCSRF: vi.fn().mockReturnValue(true),
}));

import { GET, PUT, DELETE } from "../[id]/route";

const mockLocaleConfigFindUnique = prisma.localeConfig
  .findUnique as unknown as Mock;
const mockLocaleConfigUpdate = prisma.localeConfig.update as unknown as Mock;
const mockLocaleConfigDelete = prisma.localeConfig.delete as unknown as Mock;

function createMockLocale(overrides = {}) {
  return {
    id: "IT",
    countryName: "Italia",
    primaryLocale: "it",
    primaryLanguageMaestroId: "manzoni-italiano",
    secondaryLocales: ["en"],
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("GET /api/admin/locales/[id]", () => {
  beforeEach(() => {
    mockValidateAdminAuth.mockClear();
    mockLocaleConfigFindUnique.mockClear();
  });

  it("returns 401 without admin auth", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: false,
      isAdmin: false,
    });
    const request = new NextRequest(
      "http://localhost:3000/api/admin/locales/IT",
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: "IT" }),
    });
    expect(response.status).toBe(401);
  });

  it("returns 404 when locale not found", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
    });
    mockLocaleConfigFindUnique.mockResolvedValueOnce(null);
    const request = new NextRequest(
      "http://localhost:3000/api/admin/locales/IT",
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: "IT" }),
    });
    expect(response.status).toBe(404);
  });

  it("returns single locale by ID", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
    });
    mockLocaleConfigFindUnique.mockResolvedValueOnce(createMockLocale());
    const request = new NextRequest(
      "http://localhost:3000/api/admin/locales/IT",
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: "IT" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.locale.id).toBe("IT");
  });

  it("handles database errors", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
    });
    mockLocaleConfigFindUnique.mockRejectedValueOnce(new Error("DB error"));
    const request = new NextRequest(
      "http://localhost:3000/api/admin/locales/IT",
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: "IT" }),
    });
    expect(response.status).toBe(500);
  });
});

describe("PUT /api/admin/locales/[id]", () => {
  beforeEach(() => {
    mockValidateAdminAuth.mockClear();
    mockLocaleConfigFindUnique.mockClear();
    mockLocaleConfigUpdate.mockClear();
  });

  it("returns 401 without admin auth", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: false,
      isAdmin: false,
    });
    const request = new NextRequest(
      "http://localhost:3000/api/admin/locales/IT",
      {
        method: "PUT",
        body: JSON.stringify({ countryName: "Updated" }),
      },
    );
    const response = await PUT(request, {
      params: Promise.resolve({ id: "IT" }),
    });
    expect(response.status).toBe(401);
  });

  it("returns 404 when locale not found", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
    });
    mockLocaleConfigFindUnique.mockResolvedValueOnce(null);
    const request = new NextRequest(
      "http://localhost:3000/api/admin/locales/IT",
      {
        method: "PUT",
        body: JSON.stringify({ countryName: "Updated" }),
      },
    );
    const response = await PUT(request, {
      params: Promise.resolve({ id: "IT" }),
    });
    expect(response.status).toBe(404);
  });

  it("updates locale with partial data", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: "admin-1",
    });
    const existing = createMockLocale();
    mockLocaleConfigFindUnique.mockResolvedValueOnce(existing);
    const updated = { ...existing, countryName: "Updated Country" };
    mockLocaleConfigUpdate.mockResolvedValueOnce(updated);

    const request = new NextRequest(
      "http://localhost:3000/api/admin/locales/IT",
      {
        method: "PUT",
        body: JSON.stringify({ countryName: "Updated Country" }),
      },
    );
    const response = await PUT(request, {
      params: Promise.resolve({ id: "IT" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.locale.countryName).toBe("Updated Country");
  });

  it("updates multiple fields", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: "admin-1",
    });
    const existing = createMockLocale();
    mockLocaleConfigFindUnique.mockResolvedValueOnce(existing);
    const updated = {
      ...existing,
      enabled: false,
      secondaryLocales: ["en", "fr"],
    };
    mockLocaleConfigUpdate.mockResolvedValueOnce(updated);

    const request = new NextRequest(
      "http://localhost:3000/api/admin/locales/IT",
      {
        method: "PUT",
        body: JSON.stringify({
          enabled: false,
          secondaryLocales: ["en", "fr"],
        }),
      },
    );
    const response = await PUT(request, {
      params: Promise.resolve({ id: "IT" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.locale.enabled).toBe(false);
  });

  it("handles database errors on update", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
    });
    mockLocaleConfigFindUnique.mockResolvedValueOnce(createMockLocale());
    mockLocaleConfigUpdate.mockRejectedValueOnce(new Error("DB error"));

    const request = new NextRequest(
      "http://localhost:3000/api/admin/locales/IT",
      {
        method: "PUT",
        body: JSON.stringify({ countryName: "Updated" }),
      },
    );
    const response = await PUT(request, {
      params: Promise.resolve({ id: "IT" }),
    });
    expect(response.status).toBe(500);
  });
});

describe("DELETE /api/admin/locales/[id]", () => {
  beforeEach(() => {
    mockValidateAdminAuth.mockClear();
    mockLocaleConfigFindUnique.mockClear();
    mockLocaleConfigDelete.mockClear();
  });

  it("returns 401 without admin auth", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: false,
      isAdmin: false,
    });
    const request = new NextRequest(
      "http://localhost:3000/api/admin/locales/IT",
      {
        method: "DELETE",
      },
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "IT" }),
    });
    expect(response.status).toBe(401);
  });

  it("returns 404 when locale not found", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
    });
    mockLocaleConfigFindUnique.mockResolvedValueOnce(null);
    const request = new NextRequest(
      "http://localhost:3000/api/admin/locales/IT",
      {
        method: "DELETE",
      },
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "IT" }),
    });
    expect(response.status).toBe(404);
  });

  it("deletes existing locale", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: "admin-1",
    });
    mockLocaleConfigFindUnique.mockResolvedValueOnce(createMockLocale());
    mockLocaleConfigDelete.mockResolvedValueOnce(createMockLocale());

    const request = new NextRequest(
      "http://localhost:3000/api/admin/locales/IT",
      {
        method: "DELETE",
      },
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "IT" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain("deleted");
  });

  it("handles database errors on delete", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
    });
    mockLocaleConfigFindUnique.mockResolvedValueOnce(createMockLocale());
    mockLocaleConfigDelete.mockRejectedValueOnce(new Error("DB error"));

    const request = new NextRequest(
      "http://localhost:3000/api/admin/locales/IT",
      {
        method: "DELETE",
      },
    );
    const response = await DELETE(request, {
      params: Promise.resolve({ id: "IT" }),
    });
    expect(response.status).toBe(500);
  });
});
