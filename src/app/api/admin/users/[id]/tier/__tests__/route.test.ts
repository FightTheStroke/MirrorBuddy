/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { POST } from "../route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

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

// Type assertions for mocked prisma methods
const mockUserFindUnique = prisma.user.findUnique as unknown as Mock;
const mockTierDefinitionFindUnique = prisma.tierDefinition
  .findUnique as unknown as Mock;
const mockUserSubscriptionUpsert = prisma.userSubscription
  .upsert as unknown as Mock;
const mockTierAuditLogCreate = prisma.tierAuditLog.create as unknown as Mock;

// Mock dependencies
const mockValidateAdminAuth = vi.fn();
vi.mock("@/lib/auth/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/server")>();
  return {
    ...actual,
    validateAdminAuth: () => mockValidateAdminAuth(),
  };
});

vi.mock("@/lib/db", () => ({
  prisma: {
    userSubscription: {
      upsert: vi.fn(),
    },
    tierAuditLog: {
      create: vi.fn(),
    },
    tierDefinition: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/security", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/security")>();
  return {
    ...actual,
    requireCSRF: vi.fn().mockReturnValue(true),
  };
});

describe("POST /api/admin/users/[id]/tier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: false,
      isAdmin: false,
    });

    const request = new NextRequest(
      "http://localhost:3000/api/admin/users/user-123/tier",
      {
        method: "POST",
        body: JSON.stringify({ tierId: "tier-1" }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: "user-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 403 if not admin", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: false,
      userId: "user-1",
    });

    const request = new NextRequest(
      "http://localhost:3000/api/admin/users/user-123/tier",
      {
        method: "POST",
        body: JSON.stringify({ tierId: "tier-1" }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: "user-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden: admin access required");
  });

  it("returns 400 if tierId is missing", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: "admin-123",
    });

    const request = new NextRequest(
      "http://localhost:3000/api/admin/users/user-123/tier",
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: "user-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("tierId is required");
  });

  it("returns 404 if user not found", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: "admin-123",
    });

    mockUserFindUnique.mockResolvedValueOnce(null);

    const request = new NextRequest(
      "http://localhost:3000/api/admin/users/user-123/tier",
      {
        method: "POST",
        body: JSON.stringify({ tierId: "tier-1" }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: "user-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("User not found");
  });

  it("returns 404 if tier not found", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: "admin-123",
    });

    mockUserFindUnique.mockResolvedValueOnce({
      id: "user-123",
      username: "testuser",
    });

    mockTierDefinitionFindUnique.mockResolvedValueOnce(null);

    const request = new NextRequest(
      "http://localhost:3000/api/admin/users/user-123/tier",
      {
        method: "POST",
        body: JSON.stringify({ tierId: "tier-999" }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: "user-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Tier not found");
  });

  it("creates new subscription if user has none", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: "admin-123",
    });

    mockUserFindUnique.mockResolvedValueOnce({
      id: "user-123",
      username: "testuser",
    });

    mockTierDefinitionFindUnique.mockResolvedValueOnce({
      id: "tier-2",
      code: "PRO",
      name: "Pro",
    });

    const mockSubscription = {
      id: "sub-123",
      userId: "user-123",
      tierId: "tier-2",
    };

    mockUserSubscriptionUpsert.mockResolvedValueOnce(mockSubscription);
    mockTierAuditLogCreate.mockResolvedValueOnce({
      id: "audit-123",
    });

    const request = new NextRequest(
      "http://localhost:3000/api/admin/users/user-123/tier",
      {
        method: "POST",
        body: JSON.stringify({ tierId: "tier-2", notes: "Upgrade to Pro" }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: "user-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.userSubscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-123" },
        create: expect.objectContaining({
          userId: "user-123",
          tierId: "tier-2",
        }),
        update: expect.objectContaining({
          tierId: "tier-2",
        }),
      }),
    );
  });

  it("creates audit log entry with changes", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: "admin-123",
    });

    mockUserFindUnique.mockResolvedValueOnce({
      id: "user-123",
      username: "testuser",
      subscription: {
        tierId: "tier-1",
        tier: {
          code: "BASE",
          name: "Base",
        },
      },
    });

    mockTierDefinitionFindUnique.mockResolvedValueOnce({
      id: "tier-2",
      code: "PRO",
      name: "Pro",
    });

    mockUserSubscriptionUpsert.mockResolvedValueOnce({
      id: "sub-123",
      userId: "user-123",
      tierId: "tier-2",
    });

    mockTierAuditLogCreate.mockResolvedValueOnce({
      id: "audit-123",
    });

    const request = new NextRequest(
      "http://localhost:3000/api/admin/users/user-123/tier",
      {
        method: "POST",
        body: JSON.stringify({ tierId: "tier-2", notes: "Upgrade to Pro" }),
      },
    );

    await POST(request, { params: Promise.resolve({ id: "user-123" }) });

    expect(prisma.tierAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-123",
        adminId: "admin-123",
        action: "TIER_CHANGE",
        notes: "Upgrade to Pro",
        changes: expect.objectContaining({
          from: expect.any(Object),
          to: expect.any(Object),
        }),
      }),
    });
  });

  it("handles notes in audit log", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: "admin-123",
    });

    mockUserFindUnique.mockResolvedValueOnce({
      id: "user-123",
      username: "testuser",
    });

    mockTierDefinitionFindUnique.mockResolvedValueOnce({
      id: "tier-2",
      code: "PRO",
      name: "Pro",
    });

    mockUserSubscriptionUpsert.mockResolvedValueOnce({
      id: "sub-123",
      userId: "user-123",
      tierId: "tier-2",
    });

    mockTierAuditLogCreate.mockResolvedValueOnce({
      id: "audit-123",
    });

    const request = new NextRequest(
      "http://localhost:3000/api/admin/users/user-123/tier",
      {
        method: "POST",
        body: JSON.stringify({
          tierId: "tier-2",
          notes: "Special upgrade for beta tester",
        }),
      },
    );

    await POST(request, { params: Promise.resolve({ id: "user-123" }) });

    expect(prisma.tierAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          notes: "Special upgrade for beta tester",
        }),
      }),
    );
  });

  it("returns 500 on database error", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: "admin-123",
    });

    mockUserFindUnique.mockRejectedValueOnce(new Error("Database error"));

    const request = new NextRequest(
      "http://localhost:3000/api/admin/users/user-123/tier",
      {
        method: "POST",
        body: JSON.stringify({ tierId: "tier-2" }),
      },
    );

    const response = await POST(request, {
      params: Promise.resolve({ id: "user-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
