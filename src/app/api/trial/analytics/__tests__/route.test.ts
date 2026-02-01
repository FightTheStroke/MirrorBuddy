/**
 * MIRRORBUDDY - Trial Analytics API Tests
 *
 * Tests for GET /api/trial/analytics (admin-only)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    trialSession: {
      findMany: vi.fn(),
    },
    telemetryEvent: {
      count: vi.fn(),
    },
  },
}));

// Mock auth middleware
vi.mock("@/lib/auth/session-auth", () => ({
  validateAdminAuth: vi.fn(),
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

import { prisma } from "@/lib/db";
import { validateAdminAuth } from "@/lib/auth/session-auth";
import { GET } from "../route";

describe("Trial Analytics API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createRequest(): NextRequest {
    return new NextRequest("http://localhost/api/trial/analytics", {
      method: "GET",
    });
  }

  const mockRouteContext = {
    params: Promise.resolve({}),
  };

  it("returns 401 when not authenticated", async () => {
    vi.mocked(validateAdminAuth).mockResolvedValue({
      authenticated: false,
    } as any);

    const response = await GET(createRequest(), mockRouteContext);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 403 when not admin", async () => {
    vi.mocked(validateAdminAuth).mockResolvedValue({
      authenticated: true,
      userId: "user-123",
      isAdmin: false,
    } as any);

    const response = await GET(createRequest(), mockRouteContext);

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toContain("admin");
  });

  it("returns metrics for admin user", async () => {
    vi.mocked(validateAdminAuth).mockResolvedValue({
      authenticated: true,
      userId: "admin-123",
      isAdmin: true,
    } as any);

    const mockSessions = [
      {
        id: "session-1",
        chatsUsed: 5,
        voiceSecondsUsed: 120,
        toolsUsed: 3,
        docsUsed: 0,
        createdAt: new Date("2024-01-15"),
        lastActivityAt: new Date("2024-01-15"),
      },
      {
        id: "session-2",
        chatsUsed: 10, // At limit
        voiceSecondsUsed: 300, // At limit
        toolsUsed: 5,
        docsUsed: 1,
        createdAt: new Date("2024-01-16"),
        lastActivityAt: new Date("2024-01-16"),
      },
      {
        id: "session-3",
        chatsUsed: 8,
        voiceSecondsUsed: 60,
        toolsUsed: 10, // At limit
        docsUsed: 0,
        createdAt: new Date("2024-01-16"),
        lastActivityAt: new Date("2024-01-16"),
      },
    ];

    vi.mocked(prisma.trialSession.findMany).mockResolvedValue(
      mockSessions as any,
    );
    vi.mocked(prisma.telemetryEvent.count).mockResolvedValue(2);

    const response = await GET(createRequest(), mockRouteContext);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.metrics).toBeDefined();
    expect(data.metrics.period).toBe("last_30_days");
    expect(data.metrics.trialStarts).toBe(3);
    expect(data.metrics.trialChats).toBe(23); // 5 + 10 + 8
    expect(data.metrics.trialVoiceMinutes).toBe(8); // (120 + 300 + 60) / 60
    expect(data.metrics.trialToolCalls).toBe(18); // 3 + 5 + 10

    // Limit hits
    expect(data.metrics.limitHits.chat).toBe(1); // session-2
    expect(data.metrics.limitHits.voice).toBe(1); // session-2
    expect(data.metrics.limitHits.tool).toBe(1); // session-3
    expect(data.metrics.limitHits.total).toBe(2); // session-2 and session-3

    expect(data.metrics.betaCtaClicked).toBe(2);
  });

  it("calculates averages correctly", async () => {
    vi.mocked(validateAdminAuth).mockResolvedValue({
      authenticated: true,
      userId: "admin-123",
      isAdmin: true,
    } as any);

    const mockSessions = [
      {
        id: "session-1",
        chatsUsed: 6,
        voiceSecondsUsed: 180, // 3 minutes
        toolsUsed: 4,
        docsUsed: 0,
        createdAt: new Date("2024-01-15"),
        lastActivityAt: new Date("2024-01-15"),
      },
      {
        id: "session-2",
        chatsUsed: 4,
        voiceSecondsUsed: 120, // 2 minutes
        toolsUsed: 6,
        docsUsed: 1,
        createdAt: new Date("2024-01-16"),
        lastActivityAt: new Date("2024-01-16"),
      },
    ];

    vi.mocked(prisma.trialSession.findMany).mockResolvedValue(
      mockSessions as any,
    );
    vi.mocked(prisma.telemetryEvent.count).mockResolvedValue(0);

    const response = await GET(createRequest(), mockRouteContext);
    const data = await response.json();

    expect(data.metrics.avgChatsPerTrial).toBe(5); // (6 + 4) / 2
    expect(data.metrics.avgVoiceMinutesPerTrial).toBe(2.5); // (3 + 2) / 2
    expect(data.metrics.avgToolsPerTrial).toBe(5); // (4 + 6) / 2
  });

  it("handles zero trials gracefully", async () => {
    vi.mocked(validateAdminAuth).mockResolvedValue({
      authenticated: true,
      userId: "admin-123",
      isAdmin: true,
    } as any);

    vi.mocked(prisma.trialSession.findMany).mockResolvedValue([]);
    vi.mocked(prisma.telemetryEvent.count).mockResolvedValue(0);

    const response = await GET(createRequest(), mockRouteContext);
    const data = await response.json();

    expect(data.metrics.trialStarts).toBe(0);
    expect(data.metrics.avgChatsPerTrial).toBe(0);
    expect(data.metrics.avgVoiceMinutesPerTrial).toBe(0);
    expect(data.metrics.avgToolsPerTrial).toBe(0);
    expect(data.metrics.conversionRate).toBe(0);
  });

  it("includes daily breakdown", async () => {
    vi.mocked(validateAdminAuth).mockResolvedValue({
      authenticated: true,
      userId: "admin-123",
      isAdmin: true,
    } as any);

    const mockSessions = [
      {
        id: "session-1",
        chatsUsed: 5,
        voiceSecondsUsed: 120,
        toolsUsed: 3,
        docsUsed: 0,
        createdAt: new Date("2024-01-15"),
        lastActivityAt: new Date("2024-01-15"),
      },
      {
        id: "session-2",
        chatsUsed: 7,
        voiceSecondsUsed: 180,
        toolsUsed: 4,
        docsUsed: 1,
        createdAt: new Date("2024-01-15"),
        lastActivityAt: new Date("2024-01-15"),
      },
      {
        id: "session-3",
        chatsUsed: 3,
        voiceSecondsUsed: 60,
        toolsUsed: 2,
        docsUsed: 0,
        createdAt: new Date("2024-01-16"),
        lastActivityAt: new Date("2024-01-16"),
      },
    ];

    vi.mocked(prisma.trialSession.findMany).mockResolvedValue(
      mockSessions as any,
    );
    vi.mocked(prisma.telemetryEvent.count).mockResolvedValue(0);

    const response = await GET(createRequest(), mockRouteContext);
    const data = await response.json();

    expect(data.dailyBreakdown).toBeDefined();
    expect(data.dailyBreakdown).toHaveLength(2);

    const day1 = data.dailyBreakdown[0];
    expect(day1.date).toBe("2024-01-15");
    expect(day1.trials).toBe(2);
    expect(day1.chats).toBe(12); // 5 + 7

    const day2 = data.dailyBreakdown[1];
    expect(day2.date).toBe("2024-01-16");
    expect(day2.trials).toBe(1);
    expect(day2.chats).toBe(3);
  });

  it("includes generatedAt timestamp", async () => {
    vi.mocked(validateAdminAuth).mockResolvedValue({
      authenticated: true,
      userId: "admin-123",
      isAdmin: true,
    } as any);

    vi.mocked(prisma.trialSession.findMany).mockResolvedValue([]);
    vi.mocked(prisma.telemetryEvent.count).mockResolvedValue(0);

    const response = await GET(createRequest(), mockRouteContext);
    const data = await response.json();

    expect(data.generatedAt).toBeDefined();
    expect(new Date(data.generatedAt)).toBeInstanceOf(Date);
  });
});
