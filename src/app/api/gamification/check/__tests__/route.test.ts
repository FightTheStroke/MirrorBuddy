/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { GET } from "../route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
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

// Mock gamification DB functions
const mockCheckAchievements = vi.fn();
const mockGetOrCreateGamification = vi.fn();

vi.mock("@/lib/gamification/db", () => ({
  checkAchievements: (userId: string) => mockCheckAchievements(userId),
  getOrCreateGamification: (userId: string) =>
    mockGetOrCreateGamification(userId),
}));

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    achievement: {
      findMany: vi.fn(),
    },
    userAchievement: {
      findMany: vi.fn(),
    },
  },
}));

describe("GET /api/gamification/check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns newly unlocked achievements", async () => {
    // Mock auth context
    const mockContext = {
      userId: "user-123",
      req: new NextRequest("http://localhost:3000/api/gamification/check", {
        method: "GET",
      }),
    };

    const mockNewAchievements = [
      {
        id: "achievement-1",
        code: "first_chat",
        name: "First Conversation",
        description: "Start your first conversation",
        icon: "💬",
        category: "onboarding",
        tier: "bronze",
        points: 50,
        isSecret: false,
      },
    ];

    const mockGamification = {
      id: "gamif-1",
      userId: "user-123",
      achievements: [
        {
          id: "user-ach-1",
          achievementId: "achievement-1",
          unlockedAt: new Date(),
          createdAt: new Date(),
        },
      ],
    };

    mockCheckAchievements.mockResolvedValueOnce(["first_chat"]);
    mockGetOrCreateGamification.mockResolvedValueOnce(mockGamification);
    (prisma.achievement.findMany as unknown as Mock).mockResolvedValueOnce(
      mockNewAchievements,
    );

    // Simulate the route handler being called with auth middleware context
    const handler = GET as any;
    const response = await handler(mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.newAchievements).toHaveLength(1);
    expect(data.newAchievements[0].code).toBe("first_chat");
    expect(mockCheckAchievements).toHaveBeenCalledWith("user-123");
  });

  it("returns empty array when no new achievements", async () => {
    const mockContext = {
      userId: "user-123",
      req: new NextRequest("http://localhost:3000/api/gamification/check", {
        method: "GET",
      }),
    };

    const mockGamification = {
      id: "gamif-1",
      userId: "user-123",
      achievements: [],
    };

    mockCheckAchievements.mockResolvedValueOnce([]);
    mockGetOrCreateGamification.mockResolvedValueOnce(mockGamification);
    (prisma.achievement.findMany as unknown as Mock).mockResolvedValueOnce([]);

    const handler = GET as any;
    const response = await handler(mockContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.newAchievements).toHaveLength(0);
  });

  it("handles errors gracefully", async () => {
    const mockContext = {
      userId: "user-123",
      req: new NextRequest("http://localhost:3000/api/gamification/check", {
        method: "GET",
      }),
    };

    mockCheckAchievements.mockRejectedValueOnce(new Error("Database error"));

    const handler = GET as any;
    const response = await handler(mockContext);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeTruthy();
  });
});
