/**
 * @jest-environment node
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth/session-auth", () => ({
  validateAdminAuth: vi.fn().mockResolvedValue({
    authenticated: true,
    isAdmin: true,
    userId: "admin-1",
  }),
}));

// Create a mock transaction object that mirrors prisma structure
const mockTx = {
  user: {
    deleteMany: vi.fn().mockResolvedValue({ count: 5 }),
  },
  conversation: {
    deleteMany: vi.fn().mockResolvedValue({ count: 10 }),
  },
  message: {
    deleteMany: vi.fn().mockResolvedValue({ count: 50 }),
  },
  flashcardProgress: {
    deleteMany: vi.fn().mockResolvedValue({ count: 20 }),
  },
  quizResult: {
    deleteMany: vi.fn().mockResolvedValue({ count: 15 }),
  },
  material: {
    deleteMany: vi.fn().mockResolvedValue({ count: 8 }),
  },
  sessionMetrics: {
    deleteMany: vi.fn().mockResolvedValue({ count: 30 }),
  },
  userActivity: {
    deleteMany: vi.fn().mockResolvedValue({ count: 40 }),
  },
  telemetryEvent: {
    deleteMany: vi.fn().mockResolvedValue({ count: 100 }),
  },
  studySession: {
    deleteMany: vi.fn().mockResolvedValue({ count: 12 }),
  },
  funnelEvent: {
    deleteMany: vi.fn().mockResolvedValue({ count: 25 }),
  },
};

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      count: vi.fn().mockResolvedValue(5),
      deleteMany: vi.fn().mockResolvedValue({ count: 5 }),
    },
    conversation: {
      count: vi.fn().mockResolvedValue(10),
      deleteMany: vi.fn().mockResolvedValue({ count: 10 }),
    },
    message: {
      count: vi.fn().mockResolvedValue(50),
      deleteMany: vi.fn().mockResolvedValue({ count: 50 }),
    },
    flashcardProgress: {
      count: vi.fn().mockResolvedValue(20),
      deleteMany: vi.fn().mockResolvedValue({ count: 20 }),
    },
    quizResult: {
      count: vi.fn().mockResolvedValue(15),
      deleteMany: vi.fn().mockResolvedValue({ count: 15 }),
    },
    material: {
      count: vi.fn().mockResolvedValue(8),
      deleteMany: vi.fn().mockResolvedValue({ count: 8 }),
    },
    sessionMetrics: {
      count: vi.fn().mockResolvedValue(30),
      deleteMany: vi.fn().mockResolvedValue({ count: 30 }),
    },
    userActivity: {
      count: vi.fn().mockResolvedValue(40),
      deleteMany: vi.fn().mockResolvedValue({ count: 40 }),
    },
    telemetryEvent: {
      count: vi.fn().mockResolvedValue(100),
      deleteMany: vi.fn().mockResolvedValue({ count: 100 }),
    },
    studySession: {
      count: vi.fn().mockResolvedValue(12),
      deleteMany: vi.fn().mockResolvedValue({ count: 12 }),
    },
    funnelEvent: {
      count: vi.fn().mockResolvedValue(25),
      deleteMany: vi.fn().mockResolvedValue({ count: 25 }),
    },
    complianceAuditEntry: {
      create: vi.fn().mockResolvedValue({
        id: "audit-1",
        eventType: "admin_action",
        severity: "info",
      }),
    },
    $transaction: vi.fn().mockImplementation((callback) => callback(mockTx)),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

import { GET, DELETE } from "../route";

describe("admin purge-staging-data API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET - Preview counts", () => {
    it("returns counts of test data records", async () => {
      const request = new NextRequest(
        "http://localhost/api/admin/purge-staging-data",
      );

      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toHaveProperty("users", 5);
      expect(body).toHaveProperty("conversations", 10);
      expect(body).toHaveProperty("messages", 50);
      expect(body).toHaveProperty("flashcardProgress", 20);
      expect(body).toHaveProperty("quizResults", 15);
      expect(body).toHaveProperty("materials", 8);
      expect(body).toHaveProperty("sessionMetrics", 30);
      expect(body).toHaveProperty("userActivity", 40);
      expect(body).toHaveProperty("telemetryEvents", 100);
      expect(body).toHaveProperty("studySessions", 12);
      expect(body).toHaveProperty("funnelEvents", 25);
      expect(body).toHaveProperty("total");
      expect(body.total).toBe(315); // Sum of all counts
    });

    it("returns 401 if not authenticated", async () => {
      const { validateAdminAuth } = await import("@/lib/auth/session-auth");
      vi.mocked(validateAdminAuth).mockResolvedValueOnce({
        authenticated: false,
        isAdmin: false,
        userId: null,
      });

      const request = new NextRequest(
        "http://localhost/api/admin/purge-staging-data",
      );

      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body).toHaveProperty("error", "Unauthorized");
    });

    it("returns 401 if not admin", async () => {
      const { validateAdminAuth } = await import("@/lib/auth/session-auth");
      vi.mocked(validateAdminAuth).mockResolvedValueOnce({
        authenticated: true,
        isAdmin: false,
        userId: "user-1",
      });

      const request = new NextRequest(
        "http://localhost/api/admin/purge-staging-data",
      );

      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body).toHaveProperty("error", "Unauthorized");
    });
  });

  describe("DELETE - Purge test data", () => {
    it("deletes all test data records", async () => {
      const request = new NextRequest(
        "http://localhost/api/admin/purge-staging-data",
      );

      const response = await DELETE(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toHaveProperty("success", true);
      expect(body).toHaveProperty("deleted", 315);
    });

    it("logs the purge action in audit log", async () => {
      const { prisma } = await import("@/lib/db");
      const request = new NextRequest(
        "http://localhost/api/admin/purge-staging-data",
      );

      await DELETE(request);

      expect(prisma.complianceAuditEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: "admin_action",
          severity: "info",
          description: expect.stringContaining("Purged staging data"),
          adminId: "admin-1",
        }),
      });
    });

    it("returns 401 if not authenticated", async () => {
      const { validateAdminAuth } = await import("@/lib/auth/session-auth");
      vi.mocked(validateAdminAuth).mockResolvedValueOnce({
        authenticated: false,
        isAdmin: false,
        userId: null,
      });

      const request = new NextRequest(
        "http://localhost/api/admin/purge-staging-data",
      );

      const response = await DELETE(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body).toHaveProperty("error", "Unauthorized");
    });

    it("returns 401 if not admin", async () => {
      const { validateAdminAuth } = await import("@/lib/auth/session-auth");
      vi.mocked(validateAdminAuth).mockResolvedValueOnce({
        authenticated: true,
        isAdmin: false,
        userId: "user-1",
      });

      const request = new NextRequest(
        "http://localhost/api/admin/purge-staging-data",
      );

      const response = await DELETE(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body).toHaveProperty("error", "Unauthorized");
    });
  });
});
