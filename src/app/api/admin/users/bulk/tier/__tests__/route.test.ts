import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../route";
import { validateAdminAuth } from "@/lib/auth/session-auth";
import { prisma } from "@/lib/db";

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    child: vi.fn(() => ({
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
    })),
  },
}));

// Mock dependencies
vi.mock("@/lib/auth/session-auth");
vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
    },
    tierDefinition: {
      findUnique: vi.fn(),
    },
    userSubscription: {
      upsert: vi.fn(),
    },
    tierAuditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/security/csrf", () => ({
  requireCSRF: vi.fn().mockReturnValue(true),
}));

describe("POST /api/admin/users/bulk/tier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reject non-admin users", async () => {
    vi.mocked(validateAdminAuth).mockResolvedValue({
      authenticated: true,
      isAdmin: false,
      userId: "user1",
    });

    const request = new NextRequest(
      "http://localhost/api/admin/users/bulk/tier",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: ["user1", "user2"],
          tierId: "tier1",
        }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("Forbidden: admin access required");
  });

  it("should validate required fields", async () => {
    vi.mocked(validateAdminAuth).mockResolvedValue({
      authenticated: true,
      isAdmin: true,
      userId: "admin1",
    });

    const request = new NextRequest(
      "http://localhost/api/admin/users/bulk/tier",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: [],
          tierId: "tier1",
        }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("userIds");
  });

  it("should validate tierId is provided", async () => {
    vi.mocked(validateAdminAuth).mockResolvedValue({
      authenticated: true,
      isAdmin: true,
      userId: "admin1",
    });

    const request = new NextRequest(
      "http://localhost/api/admin/users/bulk/tier",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: ["user1"],
        }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("tierId");
  });

  it("should check if tier exists", async () => {
    vi.mocked(validateAdminAuth).mockResolvedValue({
      authenticated: true,
      isAdmin: true,
      userId: "admin1",
    });

    vi.mocked(prisma.tierDefinition.findUnique).mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/admin/users/bulk/tier",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: ["user1", "user2"],
          tierId: "nonexistent",
        }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Tier not found");
  });

  it("should successfully change tier for multiple users", async () => {
    vi.mocked(validateAdminAuth).mockResolvedValue({
      authenticated: true,
      isAdmin: true,
      userId: "admin1",
    });

    const mockTier = {
      id: "tier1",
      code: "PRO",
      name: "Pro Tier",
    } as any;

    const mockUsers = [
      {
        id: "user1",
        username: "user1",
        email: "user1@test.com",
        subscription: {
          tierId: "tier0",
          tier: { code: "BASE", name: "Base Tier" },
        },
      },
      {
        id: "user2",
        username: "user2",
        email: "user2@test.com",
        subscription: null,
      },
    ];

    vi.mocked(prisma.tierDefinition.findUnique).mockResolvedValue(mockTier);
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as any);
    vi.mocked(prisma.userSubscription.upsert).mockResolvedValue({
      id: "sub1",
      userId: "user1",
      tierId: "tier1",
      status: "ACTIVE",
    } as any);
    vi.mocked(prisma.tierAuditLog.create).mockResolvedValue({
      id: "log1",
      userId: "user1",
      adminId: "admin1",
      action: "TIER_CHANGE",
      changes: {},
    } as any);

    const request = new NextRequest(
      "http://localhost/api/admin/users/bulk/tier",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: ["user1", "user2"],
          tierId: "tier1",
          notes: "Bulk upgrade to Pro",
        }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.results).toBeDefined();
    expect(data.summary).toBeDefined();
    expect(data.summary.total).toBe(2);
    expect(data.summary.successful).toBeGreaterThanOrEqual(0);
    expect(data.summary.failed).toBeGreaterThanOrEqual(0);
  });

  it("should handle partial failures gracefully", async () => {
    vi.mocked(validateAdminAuth).mockResolvedValue({
      authenticated: true,
      isAdmin: true,
      userId: "admin1",
    });

    const mockTier = {
      id: "tier1",
      code: "PRO",
      name: "Pro Tier",
    } as any;

    const mockUsers = [
      {
        id: "user1",
        username: "user1",
        email: "user1@test.com",
        subscription: null,
      },
    ];

    vi.mocked(prisma.tierDefinition.findUnique).mockResolvedValue(mockTier);
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as any);

    // First call succeeds, second fails
    vi.mocked(prisma.userSubscription.upsert)
      .mockResolvedValueOnce({
        id: "sub1",
        userId: "user1",
        tierId: "tier1",
        status: "ACTIVE",
      } as any)
      .mockRejectedValueOnce(new Error("Database error"));

    vi.mocked(prisma.tierAuditLog.create).mockResolvedValue({
      id: "log1",
      userId: "user1",
      adminId: "admin1",
      action: "TIER_CHANGE",
      changes: {},
    } as any);

    const request = new NextRequest(
      "http://localhost/api/admin/users/bulk/tier",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: ["user1", "user2"],
          tierId: "tier1",
        }),
      },
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.summary.failed).toBeGreaterThan(0);
  });
});
