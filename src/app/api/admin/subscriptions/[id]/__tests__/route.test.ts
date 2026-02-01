/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { GET, PUT, DELETE } from "../route";
import { NextRequest } from "next/server";
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

// Type assertions for mocked prisma methods
const mockUserSubscriptionFindUnique = prisma.userSubscription
  .findUnique as unknown as Mock;
const mockUserSubscriptionUpdate = prisma.userSubscription
  .update as unknown as Mock;
const mockUserSubscriptionDelete = prisma.userSubscription
  .delete as unknown as Mock;
const mockTierAuditLogCreate = prisma.tierAuditLog.create as unknown as Mock;

// Mock dependencies
const mockValidateAdminAuth = vi.fn();
vi.mock("@/lib/auth/session-auth", () => ({
  validateAdminAuth: () => mockValidateAdminAuth(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    userSubscription: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    tierAuditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/security/csrf", () => ({
  requireCSRF: vi.fn().mockReturnValue(true),
}));

describe("GET /api/admin/subscriptions/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: false,
      isAdmin: false,
    });

    const request = new NextRequest(
      "http://localhost:3000/api/admin/subscriptions/sub-123",
      { method: "GET" },
    );

    const response = await GET(request, {
      params: Promise.resolve({ id: "sub-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 if subscription not found", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: "admin-1",
    });

    mockUserSubscriptionFindUnique.mockResolvedValueOnce(null);

    const request = new NextRequest(
      "http://localhost:3000/api/admin/subscriptions/sub-999",
      { method: "GET" },
    );

    const response = await GET(request, {
      params: Promise.resolve({ id: "sub-999" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Subscription not found");
  });

  it("retrieves single subscription by id", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: "admin-1",
    });

    const mockSubscription = {
      id: "sub-123",
      userId: "user-1",
      tierId: "tier-1",
      status: "ACTIVE",
      startedAt: new Date(),
      expiresAt: null,
    };

    mockUserSubscriptionFindUnique.mockResolvedValueOnce(mockSubscription);

    const request = new NextRequest(
      "http://localhost:3000/api/admin/subscriptions/sub-123",
      { method: "GET" },
    );

    const response = await GET(request, {
      params: Promise.resolve({ id: "sub-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe("sub-123");
    expect(data.userId).toBe("user-1");
  });
});

describe("PUT /api/admin/subscriptions/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: false,
      isAdmin: false,
    });

    const request = new NextRequest(
      "http://localhost:3000/api/admin/subscriptions/sub-123",
      {
        method: "PUT",
        body: JSON.stringify({ status: "CANCELLED" }),
      },
    );

    const response = await PUT(request, {
      params: Promise.resolve({ id: "sub-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 if no update fields provided", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: "admin-1",
    });

    const request = new NextRequest(
      "http://localhost:3000/api/admin/subscriptions/sub-123",
      {
        method: "PUT",
        body: JSON.stringify({}),
      },
    );

    const response = await PUT(request, {
      params: Promise.resolve({ id: "sub-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("At least one field must be provided");
  });

  it("returns 404 if subscription not found", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: "admin-1",
    });

    mockUserSubscriptionFindUnique.mockResolvedValueOnce(null);

    const request = new NextRequest(
      "http://localhost:3000/api/admin/subscriptions/sub-999",
      {
        method: "PUT",
        body: JSON.stringify({ status: "CANCELLED" }),
      },
    );

    const response = await PUT(request, {
      params: Promise.resolve({ id: "sub-999" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Subscription not found");
  });

  it("updates subscription status", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: "admin-123",
    });

    const originalSubscription = {
      id: "sub-123",
      userId: "user-1",
      tierId: "tier-1",
      status: "ACTIVE",
      startedAt: new Date(),
      expiresAt: null,
    };

    const updatedSubscription = {
      ...originalSubscription,
      status: "CANCELLED",
    };

    mockUserSubscriptionFindUnique.mockResolvedValueOnce(originalSubscription);
    mockUserSubscriptionUpdate.mockResolvedValueOnce(updatedSubscription);
    mockTierAuditLogCreate.mockResolvedValueOnce({ id: "audit-123" });

    const request = new NextRequest(
      "http://localhost:3000/api/admin/subscriptions/sub-123",
      {
        method: "PUT",
        body: JSON.stringify({ status: "CANCELLED", notes: "User requested" }),
      },
    );

    const response = await PUT(request, {
      params: Promise.resolve({ id: "sub-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe("sub-123");
    expect(data.status).toBe("CANCELLED");
  });

  it("updates subscription expiration date", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: "admin-123",
    });

    const originalSubscription = {
      id: "sub-123",
      userId: "user-1",
      tierId: "tier-1",
      status: "ACTIVE",
      startedAt: new Date(),
      expiresAt: null,
    };

    const newExpiryDate = new Date("2025-12-31");
    const updatedSubscription = {
      ...originalSubscription,
      expiresAt: newExpiryDate,
    };

    mockUserSubscriptionFindUnique.mockResolvedValueOnce(originalSubscription);
    mockUserSubscriptionUpdate.mockResolvedValueOnce(updatedSubscription);
    mockTierAuditLogCreate.mockResolvedValueOnce({ id: "audit-123" });

    const request = new NextRequest(
      "http://localhost:3000/api/admin/subscriptions/sub-123",
      {
        method: "PUT",
        body: JSON.stringify({ expiresAt: newExpiryDate.toISOString() }),
      },
    );

    const response = await PUT(request, {
      params: Promise.resolve({ id: "sub-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.expiresAt).toBeDefined();
  });

  // SKIPPED: Audit log creation removed in pipe() migration - replaced with telemetry
  it.skip("creates audit log on update", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: "admin-123",
    });

    mockUserSubscriptionFindUnique.mockResolvedValueOnce({
      id: "sub-123",
      userId: "user-1",
      tierId: "tier-1",
      status: "ACTIVE",
    });

    mockUserSubscriptionUpdate.mockResolvedValueOnce({
      id: "sub-123",
      userId: "user-1",
      tierId: "tier-1",
      status: "PAUSED",
    });

    mockTierAuditLogCreate.mockResolvedValueOnce({ id: "audit-123" });

    const request = new NextRequest(
      "http://localhost:3000/api/admin/subscriptions/sub-123",
      {
        method: "PUT",
        body: JSON.stringify({ status: "PAUSED", notes: "Testing" }),
      },
    );

    await PUT(request, { params: Promise.resolve({ id: "sub-123" }) });

    expect(prisma.tierAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          adminId: "admin-123",
          action: "SUBSCRIPTION_UPDATE",
        }),
      }),
    );
  });
});

describe("DELETE /api/admin/subscriptions/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: false,
      isAdmin: false,
    });

    const request = new NextRequest(
      "http://localhost:3000/api/admin/subscriptions/sub-123",
      { method: "DELETE" },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "sub-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 if subscription not found", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: "admin-1",
    });

    mockUserSubscriptionFindUnique.mockResolvedValueOnce(null);

    const request = new NextRequest(
      "http://localhost:3000/api/admin/subscriptions/sub-999",
      { method: "DELETE" },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "sub-999" }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Subscription not found");
  });

  it("deletes subscription", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: "admin-123",
    });

    const mockSubscription = {
      id: "sub-123",
      userId: "user-1",
      tierId: "tier-1",
      status: "ACTIVE",
    };

    mockUserSubscriptionFindUnique.mockResolvedValueOnce(mockSubscription);
    mockUserSubscriptionDelete.mockResolvedValueOnce(mockSubscription);
    mockTierAuditLogCreate.mockResolvedValueOnce({ id: "audit-123" });

    const request = new NextRequest(
      "http://localhost:3000/api/admin/subscriptions/sub-123",
      { method: "DELETE" },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "sub-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.userSubscription.delete).toHaveBeenCalledWith({
      where: { id: "sub-123" },
    });
  });

  // SKIPPED: Audit log creation removed in pipe() migration - replaced with telemetry
  it.skip("creates audit log on deletion", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: "admin-123",
    });

    mockUserSubscriptionFindUnique.mockResolvedValueOnce({
      id: "sub-123",
      userId: "user-1",
      tierId: "tier-1",
      status: "ACTIVE",
    });

    mockUserSubscriptionDelete.mockResolvedValueOnce({
      id: "sub-123",
      userId: "user-1",
      tierId: "tier-1",
      status: "ACTIVE",
    });

    mockTierAuditLogCreate.mockResolvedValueOnce({ id: "audit-123" });

    const request = new NextRequest(
      "http://localhost:3000/api/admin/subscriptions/sub-123",
      { method: "DELETE" },
    );

    await DELETE(request, { params: Promise.resolve({ id: "sub-123" }) });

    expect(prisma.tierAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          adminId: "admin-123",
          action: "SUBSCRIPTION_DELETE",
        }),
      }),
    );
  });

  it("handles database error on deletion", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: "admin-1",
    });

    mockUserSubscriptionFindUnique.mockRejectedValueOnce(
      new Error("Database error"),
    );

    const request = new NextRequest(
      "http://localhost:3000/api/admin/subscriptions/sub-123",
      { method: "DELETE" },
    );

    const response = await DELETE(request, {
      params: Promise.resolve({ id: "sub-123" }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Internal server error");
  });
});
