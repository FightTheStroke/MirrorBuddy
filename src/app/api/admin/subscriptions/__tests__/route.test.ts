/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { GET } from "../route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

// Type assertions for mocked prisma methods
const mockUserSubscriptionFindMany = prisma.userSubscription
  .findMany as unknown as Mock;

// Mock dependencies
const mockValidateAdminAuth = vi.fn();
vi.mock("@/lib/auth/session-auth", () => ({
  validateAdminAuth: () => mockValidateAdminAuth(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    userSubscription: {
      findMany: vi.fn(),
    },
  },
}));

describe("GET /api/admin/subscriptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: false,
      isAdmin: false,
    });

    const request = new NextRequest(
      "http://localhost:3000/api/admin/subscriptions",
      { method: "GET" },
    );

    const response = await GET(request);
    const _data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 401 if not admin", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: false,
    });

    const request = new NextRequest(
      "http://localhost:3000/api/admin/subscriptions",
      { method: "GET" },
    );

    const response = await GET(request);
    const _data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("lists all subscriptions without filters", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
      userId: "admin-123",
    });

    const mockSubscriptions = [
      {
        id: "sub-1",
        userId: "user-1",
        tierId: "tier-1",
        status: "ACTIVE",
        startedAt: new Date(),
        expiresAt: null,
      },
      {
        id: "sub-2",
        userId: "user-2",
        tierId: "tier-2",
        status: "TRIAL",
        startedAt: new Date(),
        expiresAt: new Date(),
      },
    ];

    mockUserSubscriptionFindMany.mockResolvedValueOnce(mockSubscriptions);

    const request = new NextRequest(
      "http://localhost:3000/api/admin/subscriptions",
      { method: "GET" },
    );

    const response = await GET(request);
    const _data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(2);
  });

  it("filters subscriptions by userId", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
    });

    mockUserSubscriptionFindMany.mockResolvedValueOnce([
      {
        id: "sub-1",
        userId: "user-1",
        tierId: "tier-1",
        status: "ACTIVE",
      },
    ]);

    const request = new NextRequest(
      "http://localhost:3000/api/admin/subscriptions?userId=user-1",
      { method: "GET" },
    );

    const response = await GET(request);
    const _data = await response.json();

    expect(response.status).toBe(200);
    expect(prisma.userSubscription.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-1",
        }),
      }),
    );
  });

  it("filters subscriptions by tierId", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
    });

    mockUserSubscriptionFindMany.mockResolvedValueOnce([]);

    const request = new NextRequest(
      "http://localhost:3000/api/admin/subscriptions?tierId=tier-2",
      { method: "GET" },
    );

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(prisma.userSubscription.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tierId: "tier-2",
        }),
      }),
    );
  });

  it("filters subscriptions by status", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
    });

    mockUserSubscriptionFindMany.mockResolvedValueOnce([]);

    const request = new NextRequest(
      "http://localhost:3000/api/admin/subscriptions?status=EXPIRED",
      { method: "GET" },
    );

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(prisma.userSubscription.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "EXPIRED",
        }),
      }),
    );
  });

  it("handles database error", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
    });

    mockUserSubscriptionFindMany.mockRejectedValueOnce(
      new Error("Database error"),
    );

    const request = new NextRequest(
      "http://localhost:3000/api/admin/subscriptions",
      { method: "GET" },
    );

    const response = await GET(request);
    const _data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to list subscriptions");
  });
});
