/**
 * @jest-environment node
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    inviteRequest: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      create: vi.fn(),
    },
    $transaction: vi.fn((fn) =>
      fn({
        inviteRequest: {
          update: vi.fn(),
        },
        user: {
          create: vi.fn().mockResolvedValue({ id: "user-123" }),
        },
      }),
    ),
  },
}));

// Mock email
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock password
vi.mock("@/lib/auth/password", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed-password"),
  generateRandomPassword: vi.fn().mockReturnValue("temp-pass-123"),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    })),
  },
}));

import { prisma } from "@/lib/db";

describe("Invite Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPendingInvites", () => {
    it("should return pending invites ordered by creation date", async () => {
      const mockInvites = [
        { id: "inv-1", email: "user1@test.com", status: "PENDING" },
        { id: "inv-2", email: "user2@test.com", status: "PENDING" },
      ];

      vi.mocked(prisma.inviteRequest.findMany).mockResolvedValue(
        mockInvites as never,
      );

      const { getPendingInvites } = await import("../invite-service");
      const result = await getPendingInvites();

      expect(prisma.inviteRequest.findMany).toHaveBeenCalledWith({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
      });
      expect(result).toEqual(mockInvites);
    });
  });

  describe("getInvites", () => {
    it("should return all invites when no status filter", async () => {
      const mockInvites = [
        { id: "inv-1", status: "APPROVED" },
        { id: "inv-2", status: "PENDING" },
      ];

      vi.mocked(prisma.inviteRequest.findMany).mockResolvedValue(
        mockInvites as never,
      );

      const { getInvites } = await import("../invite-service");
      const result = await getInvites();

      expect(prisma.inviteRequest.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: { createdAt: "desc" },
      });
      expect(result).toEqual(mockInvites);
    });

    it("should filter by status when provided", async () => {
      vi.mocked(prisma.inviteRequest.findMany).mockResolvedValue([]);

      const { getInvites } = await import("../invite-service");
      await getInvites("APPROVED");

      expect(prisma.inviteRequest.findMany).toHaveBeenCalledWith({
        where: { status: "APPROVED" },
        orderBy: { createdAt: "desc" },
      });
    });
  });

  describe("notifyAdminNewRequest", () => {
    it("should send email notification for valid request", async () => {
      const mockRequest = {
        id: "req-123",
        name: "Test User",
        email: "test@example.com",
        motivation: "I want to learn",
        trialSessionId: null,
      };

      vi.mocked(prisma.inviteRequest.findUnique).mockResolvedValue(
        mockRequest as never,
      );

      const { sendEmail } = await import("@/lib/email");
      const { notifyAdminNewRequest } = await import("../invite-service");

      await notifyAdminNewRequest("req-123");

      expect(sendEmail).toHaveBeenCalled();
    });

    it("should not send email if request not found", async () => {
      vi.mocked(prisma.inviteRequest.findUnique).mockResolvedValue(null);

      const { sendEmail } = await import("@/lib/email");
      const { notifyAdminNewRequest } = await import("../invite-service");

      await notifyAdminNewRequest("invalid-id");

      expect(sendEmail).not.toHaveBeenCalled();
    });
  });
});
