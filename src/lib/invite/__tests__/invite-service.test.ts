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
  isEmailConfigured: vi.fn().mockReturnValue(true),
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
import { isEmailConfigured, sendEmail } from "@/lib/email";

describe("Invite Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isEmailConfigured).mockReturnValue(true);
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
        where: {},
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

    it("should filter by direct invite flag when provided", async () => {
      vi.mocked(prisma.inviteRequest.findMany).mockResolvedValue([]);

      const { getInvites } = await import("../invite-service");
      await getInvites(undefined, true);

      expect(prisma.inviteRequest.findMany).toHaveBeenCalledWith({
        where: { isDirect: true },
        orderBy: { createdAt: "desc" },
      });
    });

    it("should filter by reviewer when provided", async () => {
      vi.mocked(prisma.inviteRequest.findMany).mockResolvedValue([]);

      const { getInvites } = await import("../invite-service");
      await getInvites(undefined, undefined, "admin-123");

      expect(prisma.inviteRequest.findMany).toHaveBeenCalledWith({
        where: { reviewedBy: "admin-123" },
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

      const { notifyAdminNewRequest } = await import("../invite-service");

      await notifyAdminNewRequest("req-123");

      expect(sendEmail).toHaveBeenCalled();
    });

    it("should not send email if request not found", async () => {
      vi.mocked(prisma.inviteRequest.findUnique).mockResolvedValue(null);

      const { notifyAdminNewRequest } = await import("../invite-service");

      await notifyAdminNewRequest("invalid-id");

      expect(sendEmail).not.toHaveBeenCalled();
    });
  });

  describe("sendRequestConfirmation", () => {
    it("should skip when email is not configured", async () => {
      const mockRequest = {
        id: "req-456",
        name: "Test User",
        email: "test@example.com",
        motivation: "I want to learn",
        trialSessionId: null,
      };

      vi.mocked(prisma.inviteRequest.findUnique).mockResolvedValue(
        mockRequest as never,
      );

      const { sendRequestConfirmation } = await import("../invite-service");

      vi.mocked(isEmailConfigured).mockReturnValue(false);

      await sendRequestConfirmation("req-456");

      expect(prisma.inviteRequest.findUnique).not.toHaveBeenCalled();
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it("should send confirmation when email is configured", async () => {
      const mockRequest = {
        id: "req-789",
        name: "Test User",
        email: "test@example.com",
        motivation: "I want to learn",
        trialSessionId: null,
      };

      vi.mocked(prisma.inviteRequest.findUnique).mockResolvedValue(
        mockRequest as never,
      );

      const { sendRequestConfirmation } = await import("../invite-service");

      await sendRequestConfirmation("req-789");

      expect(prisma.inviteRequest.findUnique).toHaveBeenCalled();
      expect(sendEmail).toHaveBeenCalled();
    });
  });

  describe("bulkApproveInvites", () => {
    it("should process multiple approve requests", async () => {
      const mockRequests = [
        {
          id: "req-1",
          email: "user1@test.com",
          name: "User 1",
          status: "PENDING",
        },
        {
          id: "req-2",
          email: "user2@test.com",
          name: "User 2",
          status: "PENDING",
        },
      ];

      vi.mocked(prisma.inviteRequest.findUnique)
        .mockResolvedValueOnce(mockRequests[0] as never)
        .mockResolvedValueOnce(mockRequests[1] as never);

      const { bulkApproveInvites } = await import("../invite-service");
      const result = await bulkApproveInvites(["req-1", "req-2"], "admin-123");

      expect(result.processed).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.success).toBe(true);
    });

    it("should limit batch size to 50", async () => {
      const ids = Array.from({ length: 60 }, (_, i) => `req-${i}`);

      vi.mocked(prisma.inviteRequest.findUnique).mockResolvedValue({
        id: "req-1",
        email: "user@test.com",
        name: "User",
        status: "PENDING",
      } as never);

      const { bulkApproveInvites } = await import("../invite-service");
      const result = await bulkApproveInvites(ids, "admin-123");

      // Should only process first 50
      expect(result.processed + result.failed).toBeLessThanOrEqual(50);
    });

    it("should report errors for failed requests", async () => {
      vi.mocked(prisma.inviteRequest.findUnique)
        .mockResolvedValueOnce({
          id: "req-1",
          email: "user1@test.com",
          name: "User 1",
          status: "PENDING",
        } as never)
        .mockResolvedValueOnce(null); // This will fail

      const { bulkApproveInvites } = await import("../invite-service");
      const result = await bulkApproveInvites(["req-1", "req-2"], "admin-123");

      expect(result.processed).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].requestId).toBe("req-2");
    });
  });

  describe("bulkRejectInvites", () => {
    it("should process multiple reject requests with reason", async () => {
      const mockRequests = [
        {
          id: "req-1",
          email: "user1@test.com",
          name: "User 1",
          status: "PENDING",
        },
        {
          id: "req-2",
          email: "user2@test.com",
          name: "User 2",
          status: "PENDING",
        },
      ];

      vi.mocked(prisma.inviteRequest.findUnique)
        .mockResolvedValueOnce(mockRequests[0] as never)
        .mockResolvedValueOnce(mockRequests[1] as never);

      vi.mocked(prisma.inviteRequest.update).mockResolvedValue({} as never);

      const { bulkRejectInvites } = await import("../invite-service");
      const result = await bulkRejectInvites(
        ["req-1", "req-2"],
        "admin-123",
        "Not eligible",
      );

      expect(result.processed).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.success).toBe(true);
    });

    it("should handle mixed success and failure", async () => {
      vi.mocked(prisma.inviteRequest.findUnique)
        .mockResolvedValueOnce({
          id: "req-1",
          email: "user@test.com",
          name: "User",
          status: "PENDING",
        } as never)
        .mockResolvedValueOnce({
          id: "req-2",
          email: "user2@test.com",
          name: "User 2",
          status: "APPROVED", // Already processed
        } as never);

      vi.mocked(prisma.inviteRequest.update).mockResolvedValue({} as never);

      const { bulkRejectInvites } = await import("../invite-service");
      const result = await bulkRejectInvites(["req-1", "req-2"], "admin-123");

      expect(result.processed).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.success).toBe(false);
    });
  });
});
