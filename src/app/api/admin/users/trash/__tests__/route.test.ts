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

vi.mock("@/lib/auth/middleware", () => ({
  withAdmin: (handler: any) => handler,
}));

vi.mock("@/lib/security/csrf", () => ({
  requireCSRF: vi.fn().mockReturnValue(true),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    deletedUserBackup: {
      findMany: vi.fn().mockResolvedValue([
        {
          userId: "user-1",
          email: "user@test.com",
          username: "user",
          role: "USER",
          deletedAt: new Date("2026-01-01T00:00:00Z"),
          purgeAt: new Date("2026-02-01T00:00:00Z"),
          deletedBy: "admin-1",
          reason: null,
        },
      ]),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  },
}));

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

import { GET, DELETE } from "../route";

describe("admin users trash API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns deleted user backups", async () => {
    const request = new NextRequest("http://localhost/api/admin/users/trash");
    const routeContext = { params: Promise.resolve({}) };

    const response = await GET(request, routeContext);
    const body = await response.json();

    expect(body.backups).toHaveLength(1);
    expect(body.backups[0].userId).toBe("user-1");
  });

  it("purges backups before cutoff", async () => {
    const request = new NextRequest(
      "http://localhost/api/admin/users/trash?before=2026-02-02T00:00:00Z",
    );
    const routeContext = { params: Promise.resolve({}) };

    const response = await DELETE(request, routeContext);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.deleted).toBe(1);
  });
});
