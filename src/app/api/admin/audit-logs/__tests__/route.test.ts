/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { GET } from "../route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

// Type assertions for mocked prisma methods
const mockTierAuditLogFindMany = prisma.tierAuditLog
  .findMany as unknown as Mock;
const mockTierAuditLogCount = prisma.tierAuditLog.count as unknown as Mock;

// Mock dependencies
const mockValidateAdminAuth = vi.fn();
vi.mock("@/lib/auth/session-auth", () => ({
  validateAdminAuth: () => mockValidateAdminAuth(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    tierAuditLog: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

describe("GET /api/admin/audit-logs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if not authenticated", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: false,
      isAdmin: false,
    });

    const request = new NextRequest(
      "http://localhost:3000/api/admin/audit-logs",
      { method: "GET" },
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns all audit logs with pagination", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
    });

    const mockLogs = [
      {
        id: "log-1",
        tierId: "tier-1",
        userId: "user-1",
        adminId: "admin-1",
        action: "TIER_UPDATE",
        changes: { name: "Pro" },
        notes: "Updated tier name",
        createdAt: new Date(),
      },
      {
        id: "log-2",
        tierId: null,
        userId: "user-2",
        adminId: "admin-1",
        action: "SUBSCRIPTION_UPDATE",
        changes: { status: "ACTIVE" },
        notes: null,
        createdAt: new Date(),
      },
    ];

    mockTierAuditLogFindMany.mockResolvedValueOnce(mockLogs);
    mockTierAuditLogCount.mockResolvedValueOnce(2);

    const request = new NextRequest(
      "http://localhost:3000/api/admin/audit-logs",
      { method: "GET" },
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.logs).toHaveLength(2);
    expect(data.pagination.total).toBe(2);
    expect(data.pagination.page).toBe(1);
    expect(data.pagination.pageSize).toBe(50);
  });

  it("filters by action", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
    });

    const mockLogs = [
      {
        id: "log-1",
        tierId: "tier-1",
        userId: null,
        adminId: "admin-1",
        action: "TIER_CREATE",
        changes: { name: "Enterprise" },
        notes: "Created new tier",
        createdAt: new Date(),
      },
    ];

    mockTierAuditLogFindMany.mockResolvedValueOnce(mockLogs);
    mockTierAuditLogCount.mockResolvedValueOnce(1);

    const request = new NextRequest(
      "http://localhost:3000/api/admin/audit-logs?action=TIER_CREATE",
      { method: "GET" },
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.logs).toHaveLength(1);
    expect(data.logs[0].action).toBe("TIER_CREATE");
    expect(prisma.tierAuditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          action: "TIER_CREATE",
        }),
      }),
    );
  });

  it("filters by userId", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
    });

    mockTierAuditLogFindMany.mockResolvedValueOnce([]);
    mockTierAuditLogCount.mockResolvedValueOnce(0);

    const request = new NextRequest(
      "http://localhost:3000/api/admin/audit-logs?userId=user-123",
      { method: "GET" },
    );

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(prisma.tierAuditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user-123",
        }),
      }),
    );
  });

  it("filters by adminId", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
    });

    mockTierAuditLogFindMany.mockResolvedValueOnce([]);
    mockTierAuditLogCount.mockResolvedValueOnce(0);

    const request = new NextRequest(
      "http://localhost:3000/api/admin/audit-logs?adminId=admin-456",
      { method: "GET" },
    );

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(prisma.tierAuditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          adminId: "admin-456",
        }),
      }),
    );
  });

  it("filters by date range", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
    });

    mockTierAuditLogFindMany.mockResolvedValueOnce([]);
    mockTierAuditLogCount.mockResolvedValueOnce(0);

    const startDate = "2025-01-01T00:00:00.000Z";
    const endDate = "2025-01-31T23:59:59.999Z";

    const request = new NextRequest(
      `http://localhost:3000/api/admin/audit-logs?startDate=${startDate}&endDate=${endDate}`,
      { method: "GET" },
    );

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(prisma.tierAuditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
      }),
    );
  });

  it("handles pagination with page and pageSize", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
    });

    mockTierAuditLogFindMany.mockResolvedValueOnce([]);
    mockTierAuditLogCount.mockResolvedValueOnce(100);

    const request = new NextRequest(
      "http://localhost:3000/api/admin/audit-logs?page=2&pageSize=20",
      { method: "GET" },
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.pagination.page).toBe(2);
    expect(data.pagination.pageSize).toBe(20);
    expect(data.pagination.total).toBe(100);
    expect(data.pagination.totalPages).toBe(5);
    expect(prisma.tierAuditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 20,
      }),
    );
  });

  it("orders by createdAt descending by default", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
    });

    mockTierAuditLogFindMany.mockResolvedValueOnce([]);
    mockTierAuditLogCount.mockResolvedValueOnce(0);

    const request = new NextRequest(
      "http://localhost:3000/api/admin/audit-logs",
      { method: "GET" },
    );

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(prisma.tierAuditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "desc" },
      }),
    );
  });

  it("handles database errors", async () => {
    mockValidateAdminAuth.mockResolvedValueOnce({
      authenticated: true,
      isAdmin: true,
    });

    mockTierAuditLogFindMany.mockRejectedValueOnce(
      new Error("Database connection failed"),
    );

    const request = new NextRequest(
      "http://localhost:3000/api/admin/audit-logs",
      { method: "GET" },
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch audit logs");
  });
});
