/**
 * MIRRORBUDDY - Preferences API POST Validation Tests
 *
 * Unit tests for input validation and error handling
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/session-auth", () => ({
  validateAuth: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

import { prisma } from "@/lib/db";
import { validateAuth } from "@/lib/auth/session-auth";
import { POST } from "../route";

describe("POST /api/user/preferences/maestri - Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects more than 3 maestri with 400", async () => {
    const userId = "user-123";
    const maestriIds = ["euclide", "galileo", "darwin", "einstein"];

    vi.mocked(validateAuth).mockResolvedValue({
      authenticated: true,
      userId,
    } as any);

    const request = new NextRequest(
      "http://localhost/api/user/preferences/maestri",
      {
        method: "POST",
        body: JSON.stringify({ maestriIds }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Invalid maestri selection");
    expect(data.details).toBeDefined();
  });

  it("rejects invalid maestri IDs with 400", async () => {
    const userId = "user-123";
    const maestriIds = ["euclide", "invalid-maestro"];

    vi.mocked(validateAuth).mockResolvedValue({
      authenticated: true,
      userId,
    } as any);

    const request = new NextRequest(
      "http://localhost/api/user/preferences/maestri",
      {
        method: "POST",
        body: JSON.stringify({ maestriIds }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Invalid maestri IDs");
    expect(data.invalidIds).toContain("invalid-maestro");
    expect(data.validMaestri).toBeDefined();
  });

  it("rejects missing maestriIds field", async () => {
    vi.mocked(validateAuth).mockResolvedValue({
      authenticated: true,
      userId: "user-123",
    } as any);

    const request = new NextRequest(
      "http://localhost/api/user/preferences/maestri",
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Invalid maestri selection");
  });

  it("rejects non-array maestriIds", async () => {
    vi.mocked(validateAuth).mockResolvedValue({
      authenticated: true,
      userId: "user-123",
    } as any);

    const request = new NextRequest(
      "http://localhost/api/user/preferences/maestri",
      {
        method: "POST",
        body: JSON.stringify({ maestriIds: "euclide" }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Invalid maestri selection");
  });
});
