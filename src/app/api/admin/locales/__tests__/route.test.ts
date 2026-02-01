/**
 * @vitest-environment node
 * Tests for GET /api/admin/locales and POST /api/admin/locales
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

import { GET as GET_LIST, POST } from "../route";

const mockLocaleConfigFindMany = prisma.localeConfig
  .findMany as unknown as Mock;
const mockLocaleConfigFindUnique = prisma.localeConfig
  .findUnique as unknown as Mock;
const mockLocaleConfigCreate = prisma.localeConfig.create as unknown as Mock;

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

describe("GET /api/admin/locales", () => {
  beforeEach(() => {
    mockValidateAdminAuth.mockClear();
    mockLocaleConfigFindMany.mockClear();
  });

  it("returns 401 without admin auth", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: false,
      isAdmin: false,
    });
    const request = new NextRequest("http://localhost:3000/api/admin/locales");
    const response = await GET_LIST(request);
    expect(response.status).toBe(401);
  });

  it("returns 401 if not admin", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: false,
    });
    const request = new NextRequest("http://localhost:3000/api/admin/locales");
    const response = await GET_LIST(request);
    expect(response.status).toBe(401);
  });

  it("returns all locales ordered by countryName", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
    });
    mockLocaleConfigFindMany.mockResolvedValueOnce([
      createMockLocale({ id: "IT", countryName: "Italia" }),
      createMockLocale({ id: "FR", countryName: "France" }),
    ]);

    const request = new NextRequest("http://localhost:3000/api/admin/locales");
    const response = await GET_LIST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.locales).toHaveLength(2);
    expect(mockLocaleConfigFindMany).toHaveBeenCalledWith({
      orderBy: { countryName: "asc" },
    });
  });

  it("handles database errors", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
    });
    mockLocaleConfigFindMany.mockRejectedValueOnce(new Error("DB error"));
    const request = new NextRequest("http://localhost:3000/api/admin/locales");
    const response = await GET_LIST(request);
    expect(response.status).toBe(500);
  });
});

describe("POST /api/admin/locales", () => {
  beforeEach(() => {
    mockValidateAdminAuth.mockClear();
    mockLocaleConfigFindUnique.mockClear();
    mockLocaleConfigCreate.mockClear();
  });

  it("returns 401 without admin auth", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: false,
      isAdmin: false,
    });
    const request = new NextRequest("http://localhost:3000/api/admin/locales", {
      method: "POST",
      body: JSON.stringify({
        id: "IT",
        countryName: "Italia",
        primaryLocale: "it",
        primaryLanguageMaestroId: "m1",
      }),
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("validates required fields", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
    });
    const request = new NextRequest("http://localhost:3000/api/admin/locales", {
      method: "POST",
      body: JSON.stringify({ id: "IT" }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("rejects duplicate locale ID with 409", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
    });
    mockLocaleConfigFindUnique.mockResolvedValueOnce(createMockLocale());
    const request = new NextRequest("http://localhost:3000/api/admin/locales", {
      method: "POST",
      body: JSON.stringify({
        id: "IT",
        countryName: "Italia",
        primaryLocale: "it",
        primaryLanguageMaestroId: "m1",
      }),
    });
    const response = await POST(request);
    expect(response.status).toBe(409);
  });

  it("creates new locale with status 201", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: "admin-1",
    });
    mockLocaleConfigFindUnique.mockResolvedValueOnce(null);
    const mockLocale = createMockLocale();
    mockLocaleConfigCreate.mockResolvedValueOnce(mockLocale);

    const request = new NextRequest("http://localhost:3000/api/admin/locales", {
      method: "POST",
      body: JSON.stringify({
        id: "IT",
        countryName: "Italia",
        primaryLocale: "it",
        primaryLanguageMaestroId: "m1",
      }),
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.locale.id).toBe("IT");
  });

  it("sets enabled=true by default", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: "admin-1",
    });
    mockLocaleConfigFindUnique.mockResolvedValueOnce(null);
    mockLocaleConfigCreate.mockResolvedValueOnce(createMockLocale());

    const request = new NextRequest("http://localhost:3000/api/admin/locales", {
      method: "POST",
      body: JSON.stringify({
        id: "IT",
        countryName: "Italia",
        primaryLocale: "it",
        primaryLanguageMaestroId: "m1",
      }),
    });

    await POST(request);
    expect(mockLocaleConfigCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ enabled: true }),
      }),
    );
  });

  it("handles database errors on create", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
    });
    mockLocaleConfigFindUnique.mockResolvedValueOnce(null);
    mockLocaleConfigCreate.mockRejectedValueOnce(new Error("DB error"));

    const request = new NextRequest("http://localhost:3000/api/admin/locales", {
      method: "POST",
      body: JSON.stringify({
        id: "IT",
        countryName: "Italia",
        primaryLocale: "it",
        primaryLanguageMaestroId: "m1",
      }),
    });
    const response = await POST(request);
    expect(response.status).toBe(500);
  });
});
