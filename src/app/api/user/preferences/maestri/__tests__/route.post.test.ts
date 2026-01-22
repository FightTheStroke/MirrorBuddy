/**
 * MIRRORBUDDY - Preferences API POST Tests
 *
 * Unit tests for updating maestri preferences with validation
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
    info: vi.fn(),
  },
}));

import { prisma } from "@/lib/db";
import { validateAuth } from "@/lib/auth/session-auth";
import { logger } from "@/lib/logger";
import { POST } from "../route";

const VALID_MAESTRI = [
  "leonardo",
  "galileo",
  "curie",
  "cicerone",
  "lovelace",
  "smith",
  "shakespeare",
  "humboldt",
  "erodoto",
  "manzoni",
  "euclide",
  "mozart",
  "socrate",
  "ippocrate",
  "feynman",
  "darwin",
  "chris",
  "omero",
  "alexPina",
  "simone",
  "cassese",
];

describe("POST /api/user/preferences/maestri", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(validateAuth).mockResolvedValue({
      authenticated: false,
      error: "Unauthorized",
    } as any);

    const request = new NextRequest(
      "http://localhost/api/user/preferences/maestri",
      {
        method: "POST",
        body: JSON.stringify({ maestriIds: ["euclide"] }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe("Unauthorized");
  });

  it("accepts valid maestri selection", async () => {
    const userId = "user-123";
    const maestriIds = ["euclide", "galileo", "darwin"];

    vi.mocked(validateAuth).mockResolvedValue({
      authenticated: true,
      userId,
    } as any);

    vi.mocked(prisma.user.update).mockResolvedValue({
      selectedMaestri: maestriIds,
    } as any);

    const request = new NextRequest(
      "http://localhost/api/user/preferences/maestri",
      {
        method: "POST",
        body: JSON.stringify({ maestriIds }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.selected).toEqual(maestriIds);
    expect(data.available).toBe(3);
  });

  it("accepts 1 maestro", async () => {
    const userId = "user-123";
    const maestriIds = ["euclide"];

    vi.mocked(validateAuth).mockResolvedValue({
      authenticated: true,
      userId,
    } as any);

    vi.mocked(prisma.user.update).mockResolvedValue({
      selectedMaestri: maestriIds,
    } as any);

    const request = new NextRequest(
      "http://localhost/api/user/preferences/maestri",
      {
        method: "POST",
        body: JSON.stringify({ maestriIds }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it("accepts 3 maestri (at limit)", async () => {
    const userId = "user-123";
    const maestriIds = ["euclide", "galileo", "darwin"];

    vi.mocked(validateAuth).mockResolvedValue({
      authenticated: true,
      userId,
    } as any);

    vi.mocked(prisma.user.update).mockResolvedValue({
      selectedMaestri: maestriIds,
    } as any);

    const request = new NextRequest(
      "http://localhost/api/user/preferences/maestri",
      {
        method: "POST",
        body: JSON.stringify({ maestriIds }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it("allows empty array selection", async () => {
    const userId = "user-123";
    const maestriIds: string[] = [];

    vi.mocked(validateAuth).mockResolvedValue({
      authenticated: true,
      userId,
    } as any);

    vi.mocked(prisma.user.update).mockResolvedValue({
      selectedMaestri: maestriIds,
    } as any);

    const request = new NextRequest(
      "http://localhost/api/user/preferences/maestri",
      {
        method: "POST",
        body: JSON.stringify({ maestriIds }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(200);
  });

  it("logs successful update", async () => {
    const userId = "user-123";
    const maestriIds = ["euclide", "galileo"];

    vi.mocked(validateAuth).mockResolvedValue({
      authenticated: true,
      userId,
    } as any);

    vi.mocked(prisma.user.update).mockResolvedValue({
      selectedMaestri: maestriIds,
    } as any);

    const request = new NextRequest(
      "http://localhost/api/user/preferences/maestri",
      {
        method: "POST",
        body: JSON.stringify({ maestriIds }),
      },
    );

    await POST(request);

    expect(logger.info).toHaveBeenCalledWith(
      "Maestri preferences updated",
      expect.objectContaining({
        userId,
        maestriCount: 2,
      }),
    );
  });

  it("returns 500 on database error", async () => {
    vi.mocked(validateAuth).mockResolvedValue({
      authenticated: true,
      userId: "user-123",
    } as any);

    vi.mocked(prisma.user.update).mockRejectedValue(
      new Error("Database connection failed"),
    );

    const request = new NextRequest(
      "http://localhost/api/user/preferences/maestri",
      {
        method: "POST",
        body: JSON.stringify({ maestriIds: ["euclide"] }),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Failed to update maestri preferences");
    expect(logger.error).toHaveBeenCalled();
  });
});
