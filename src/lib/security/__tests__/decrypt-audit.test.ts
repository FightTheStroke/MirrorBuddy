/**
 * PII Decrypt Audit Logger Tests
 *
 * Tests for audit logging of PII decryption operations
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Define mock functions via vi.hoisted to avoid Prisma deep-typing issues
const { mockCreate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
}));

// Mock Prisma client BEFORE imports
vi.mock("@/lib/db", () => ({
  prisma: {
    complianceAuditEntry: {
      create: mockCreate,
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

// Now import after mocks are set up
import {
  logDecryptAccess,
  logBulkDecryptAccess,
  type DecryptAuditContext,
} from "../decrypt-audit";

describe("Decrypt Audit Logging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("logDecryptAccess", () => {
    it("should create audit entry with all context fields", async () => {
      const context: DecryptAuditContext = {
        model: "User",
        field: "email",
        userId: "user-123",
        adminId: "admin-456",
        ipAddress: "192.168.1.1",
        context: { endpoint: "/api/users/profile" },
      };

      mockCreate.mockResolvedValue({});

      logDecryptAccess(context);

      // Wait for async fire-and-forget to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "user-123",
          adminId: "admin-456",
          eventType: "data_access",
          severity: "info",
          description: "PII field decrypted: User.email",
          ipAddress: "192.168.1.1",
          details: expect.stringContaining("User"),
        }),
      });
    });

    it("should handle missing optional fields", async () => {
      const context: DecryptAuditContext = {
        model: "Profile",
        field: "name",
      };

      mockCreate.mockResolvedValue({});

      logDecryptAccess(context);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: null,
          adminId: null,
          eventType: "data_access",
          severity: "info",
          description: "PII field decrypted: Profile.name",
          ipAddress: null,
        }),
      });
    });

    it("should include additional context in details JSON", async () => {
      const context: DecryptAuditContext = {
        model: "User",
        field: "email",
        userId: "user-123",
        context: {
          operation: "export",
          requestId: "req-abc-123",
        },
      };

      mockCreate.mockResolvedValue({});

      logDecryptAccess(context);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const call = mockCreate.mock.calls[0];
      const details = JSON.parse(call[0].data.details);

      expect(details).toMatchObject({
        model: "User",
        field: "email",
        accessor: "user-123",
        operation: "export",
        requestId: "req-abc-123",
      });
      expect(details.accessedAt).toBeDefined();
    });

    it("should fire-and-forget without blocking", () => {
      const context: DecryptAuditContext = {
        model: "User",
        field: "email",
      };

      mockCreate.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000)),
      );

      const start = Date.now();
      logDecryptAccess(context);
      const end = Date.now();

      // Should return immediately, not wait for promise
      expect(end - start).toBeLessThan(100);
    });

    it("should not throw on Prisma error", async () => {
      const context: DecryptAuditContext = {
        model: "User",
        field: "email",
      };

      mockCreate.mockRejectedValue(new Error("Database connection failed"));

      // Should not throw
      expect(() => logDecryptAccess(context)).not.toThrow();

      // Wait for async to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should have attempted to create entry
      expect(mockCreate).toHaveBeenCalled();
    });

    it("should use userId as accessor when adminId not present", async () => {
      const context: DecryptAuditContext = {
        model: "User",
        field: "email",
        userId: "user-789",
      };

      mockCreate.mockResolvedValue({});

      logDecryptAccess(context);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const call = mockCreate.mock.calls[0];
      const details = JSON.parse(call[0].data.details);

      expect(details.accessor).toBe("user-789");
    });

    it("should use adminId as accessor when both present", async () => {
      const context: DecryptAuditContext = {
        model: "User",
        field: "email",
        userId: "user-789",
        adminId: "admin-456",
      };

      mockCreate.mockResolvedValue({});

      logDecryptAccess(context);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const call = mockCreate.mock.calls[0];
      const details = JSON.parse(call[0].data.details);

      expect(details.accessor).toBe("admin-456");
    });

    it("should use 'system' as accessor when neither userId nor adminId present", async () => {
      const context: DecryptAuditContext = {
        model: "User",
        field: "email",
      };

      mockCreate.mockResolvedValue({});

      logDecryptAccess(context);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const call = mockCreate.mock.calls[0];
      const details = JSON.parse(call[0].data.details);

      expect(details.accessor).toBe("system");
    });

    it("should handle multiple concurrent log calls", async () => {
      mockCreate.mockResolvedValue({});

      logDecryptAccess({ model: "User", field: "email" });
      logDecryptAccess({ model: "Profile", field: "name" });
      logDecryptAccess({ model: "User", field: "phone" });

      // Wait for all microtasks and dynamic imports to complete
      await vi.waitFor(
        () => {
          expect(mockCreate).toHaveBeenCalledTimes(3);
        },
        { timeout: 1000 },
      );
    });
  });

  describe("logBulkDecryptAccess", () => {
    it("should log bulk operation with count", async () => {
      mockCreate.mockResolvedValue({});

      logBulkDecryptAccess("User", "email", 50, "user-123");

      await new Promise((resolve) => setTimeout(resolve, 10));

      const call = mockCreate.mock.calls[0];
      const details = JSON.parse(call[0].data.details);

      expect(details.bulkOperation).toBe(true);
      expect(details.recordCount).toBe(50);
      expect(call[0].data.description).toBe("PII field decrypted: User.email");
    });

    it("should include adminId for admin bulk operations", async () => {
      mockCreate.mockResolvedValue({});

      logBulkDecryptAccess("User", "email", 100, undefined, "admin-789");

      await new Promise((resolve) => setTimeout(resolve, 10));

      const call = mockCreate.mock.calls[0];

      expect(call[0].data.adminId).toBe("admin-789");
      expect(call[0].data.userId).toBeNull();
    });

    it("should handle both userId and adminId", async () => {
      mockCreate.mockResolvedValue({});

      logBulkDecryptAccess("User", "email", 25, "user-123", "admin-456");

      await new Promise((resolve) => setTimeout(resolve, 10));

      const call = mockCreate.mock.calls[0];

      expect(call[0].data.userId).toBe("user-123");
      expect(call[0].data.adminId).toBe("admin-456");
    });

    it("should fire-and-forget without blocking", () => {
      mockCreate.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000)),
      );

      const start = Date.now();
      logBulkDecryptAccess("User", "email", 100);
      const end = Date.now();

      expect(end - start).toBeLessThan(100);
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long context objects", async () => {
      mockCreate.mockResolvedValue({});

      const largeContext: Record<string, unknown> = {};
      for (let i = 0; i < 100; i++) {
        largeContext[`field${i}`] = `value${i}`;
      }

      logDecryptAccess({
        model: "User",
        field: "email",
        context: largeContext,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockCreate).toHaveBeenCalled();
    });

    it("should handle special characters in model and field names", async () => {
      mockCreate.mockResolvedValue({});

      logDecryptAccess({
        model: "User_Profile_v2",
        field: "email_address",
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const call = mockCreate.mock.calls[0];
      expect(call[0].data.description).toBe(
        "PII field decrypted: User_Profile_v2.email_address",
      );
    });

    it("should handle null values in context", async () => {
      mockCreate.mockResolvedValue({});

      logDecryptAccess({
        model: "User",
        field: "email",
        context: { nullValue: null, undefinedValue: undefined },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockCreate).toHaveBeenCalled();
    });
  });
});
