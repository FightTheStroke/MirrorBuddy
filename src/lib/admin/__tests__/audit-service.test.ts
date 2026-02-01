/**
 * Tests for admin audit service
 *
 * F-23: Verify audit log captures all admin actions
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { logAdminAction, queryAuditLog, getClientIp } from "../audit-service";
import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    adminAuditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
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

describe("audit-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================================================
  // LOG ADMIN ACTION TESTS
  // ========================================================================

  describe("logAdminAction", () => {
    it("logs admin action to database", async () => {
      vi.mocked(prisma.adminAuditLog.create).mockResolvedValueOnce({
        id: "audit-123",
        action: "user.delete",
        entityType: "User",
        entityId: "user-456",
        adminId: "admin-789",
        details: { reason: "GDPR request" },
        ipAddress: "192.168.1.1",
        createdAt: new Date(),
      });

      await logAdminAction({
        action: "user.delete",
        entityType: "User",
        entityId: "user-456",
        adminId: "admin-789",
        details: { reason: "GDPR request" },
        ipAddress: "192.168.1.1",
      });

      expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({
        data: {
          action: "user.delete",
          entityType: "User",
          entityId: "user-456",
          adminId: "admin-789",
          details: { reason: "GDPR request" },
          ipAddress: "192.168.1.1",
        },
      });
    });

    it("logs action without optional fields", async () => {
      vi.mocked(prisma.adminAuditLog.create).mockResolvedValueOnce({
        id: "audit-124",
        action: "invite.approve",
        entityType: "Invite",
        entityId: "invite-123",
        adminId: "admin-789",
        details: null,
        ipAddress: null,
        createdAt: new Date(),
      });

      await logAdminAction({
        action: "invite.approve",
        entityType: "Invite",
        entityId: "invite-123",
        adminId: "admin-789",
      });

      expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({
        data: {
          action: "invite.approve",
          entityType: "Invite",
          entityId: "invite-123",
          adminId: "admin-789",
          details: undefined,
          ipAddress: undefined,
        },
      });
    });

    it("does not throw on database error (fire-and-forget)", async () => {
      vi.mocked(prisma.adminAuditLog.create).mockRejectedValueOnce(
        new Error("Database connection failed"),
      );

      await expect(
        logAdminAction({
          action: "tier.change",
          entityType: "Tier",
          entityId: "tier-123",
          adminId: "admin-789",
        }),
      ).resolves.not.toThrow();
    });
  });

  // ========================================================================
  // QUERY AUDIT LOG TESTS
  // ========================================================================

  describe("queryAuditLog", () => {
    it("returns paginated audit logs with defaults", async () => {
      const mockLogs = [
        {
          id: "audit-1",
          action: "user.delete",
          entityType: "User",
          entityId: "user-1",
          adminId: "admin-1",
          details: null,
          ipAddress: null,
          createdAt: new Date(),
        },
      ];

      vi.mocked(prisma.adminAuditLog.findMany).mockResolvedValueOnce(mockLogs);
      vi.mocked(prisma.adminAuditLog.count).mockResolvedValueOnce(1);

      const result = await queryAuditLog({});

      expect(result.logs).toEqual(mockLogs);
      expect(result.total).toBe(1);
      expect(prisma.adminAuditLog.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: "desc" },
        skip: 0,
        take: 50,
      });
    });

    it("filters by action", async () => {
      vi.mocked(prisma.adminAuditLog.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.adminAuditLog.count).mockResolvedValueOnce(0);

      await queryAuditLog({ action: "user.delete" });

      expect(prisma.adminAuditLog.findMany).toHaveBeenCalledWith({
        where: { action: "user.delete" },
        orderBy: { createdAt: "desc" },
        skip: 0,
        take: 50,
      });
    });

    it("filters by entityType", async () => {
      vi.mocked(prisma.adminAuditLog.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.adminAuditLog.count).mockResolvedValueOnce(0);

      await queryAuditLog({ entityType: "User" });

      expect(prisma.adminAuditLog.findMany).toHaveBeenCalledWith({
        where: { entityType: "User" },
        orderBy: { createdAt: "desc" },
        skip: 0,
        take: 50,
      });
    });

    it("filters by adminId", async () => {
      vi.mocked(prisma.adminAuditLog.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.adminAuditLog.count).mockResolvedValueOnce(0);

      await queryAuditLog({ adminId: "admin-123" });

      expect(prisma.adminAuditLog.findMany).toHaveBeenCalledWith({
        where: { adminId: "admin-123" },
        orderBy: { createdAt: "desc" },
        skip: 0,
        take: 50,
      });
    });

    it("filters by date range", async () => {
      const from = new Date("2024-01-01");
      const to = new Date("2024-01-31");

      vi.mocked(prisma.adminAuditLog.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.adminAuditLog.count).mockResolvedValueOnce(0);

      await queryAuditLog({ from, to });

      expect(prisma.adminAuditLog.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: from,
            lte: to,
          },
        },
        orderBy: { createdAt: "desc" },
        skip: 0,
        take: 50,
      });
    });

    it("supports custom pagination", async () => {
      vi.mocked(prisma.adminAuditLog.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.adminAuditLog.count).mockResolvedValueOnce(150);

      await queryAuditLog({ page: 2, pageSize: 25 });

      expect(prisma.adminAuditLog.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: "desc" },
        skip: 25,
        take: 25,
      });
    });

    it("combines multiple filters", async () => {
      const from = new Date("2024-01-01");

      vi.mocked(prisma.adminAuditLog.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.adminAuditLog.count).mockResolvedValueOnce(0);

      await queryAuditLog({
        action: "user.delete",
        entityType: "User",
        adminId: "admin-123",
        from,
      });

      expect(prisma.adminAuditLog.findMany).toHaveBeenCalledWith({
        where: {
          action: "user.delete",
          entityType: "User",
          adminId: "admin-123",
          createdAt: {
            gte: from,
          },
        },
        orderBy: { createdAt: "desc" },
        skip: 0,
        take: 50,
      });
    });
  });

  // ========================================================================
  // GET CLIENT IP TESTS
  // ========================================================================

  describe("getClientIp", () => {
    it("extracts IP from x-forwarded-for header", () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          "x-forwarded-for": "192.168.1.1, 10.0.0.1",
        },
      });

      const ip = getClientIp(request);
      expect(ip).toBe("192.168.1.1");
    });

    it("extracts IP from x-real-ip header", () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          "x-real-ip": "192.168.1.2",
        },
      });

      const ip = getClientIp(request);
      expect(ip).toBe("192.168.1.2");
    });

    it("returns unknown when no IP headers", () => {
      const request = new NextRequest("http://localhost:3000/api/test");

      const ip = getClientIp(request);
      expect(ip).toBe("unknown");
    });

    it("prefers x-forwarded-for over x-real-ip", () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          "x-forwarded-for": "192.168.1.1",
          "x-real-ip": "192.168.1.2",
        },
      });

      const ip = getClientIp(request);
      expect(ip).toBe("192.168.1.1");
    });
  });
});
