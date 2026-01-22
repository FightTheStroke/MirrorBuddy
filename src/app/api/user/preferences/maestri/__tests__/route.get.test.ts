/**
 * MIRRORBUDDY - Preferences API GET Tests
 *
 * Unit tests for retrieving maestri preferences
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
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
import { logger } from "@/lib/logger";
import { GET } from "../route";

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

describe("GET /api/user/preferences/maestri", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(validateAuth).mockResolvedValue({
      authenticated: false,
      error: "Unauthorized",
    } as any);

    const response = await GET();

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe("Unauthorized");
  });

  it("returns user maestri with correct structure", async () => {
    const userId = "user-123";
    const selectedMaestri = ["euclide", "galileo", "darwin"];

    vi.mocked(validateAuth).mockResolvedValue({
      authenticated: true,
      userId,
    } as any);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      selectedMaestri,
    } as any);

    const response = await GET();

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      selected: selectedMaestri,
      available: 3,
      validMaestri: VALID_MAESTRI,
    });
  });

  it("returns empty array for user with no preferences", async () => {
    const userId = "user-456";

    vi.mocked(validateAuth).mockResolvedValue({
      authenticated: true,
      userId,
    } as any);

    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      selectedMaestri: [],
    } as any);

    const response = await GET();

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.selected).toEqual([]);
    expect(data.available).toBe(3);
  });

  it("returns 404 when user not found", async () => {
    vi.mocked(validateAuth).mockResolvedValue({
      authenticated: true,
      userId: "nonexistent-user",
    } as any);

    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("User not found");
  });

  it("returns 500 on database error", async () => {
    vi.mocked(validateAuth).mockResolvedValue({
      authenticated: true,
      userId: "user-789",
    } as any);

    vi.mocked(prisma.user.findUnique).mockRejectedValue(
      new Error("Database connection failed"),
    );

    const response = await GET();

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Failed to get maestri preferences");
    expect(logger.error).toHaveBeenCalled();
  });
});
