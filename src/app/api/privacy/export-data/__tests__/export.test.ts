/**
 * GDPR Data Portability API Tests
 *
 * Tests for the /api/privacy/export-data endpoint
 * Verifies GDPR Article 20 compliance
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";
import * as helpers from "../helpers";

// Mock the auth module
vi.mock("@/lib/auth/session-auth", () => ({
  validateAuth: vi.fn(),
}));

// Mock the helpers
vi.mock("../helpers", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    canUserExport: vi.fn(),
    exportUserData: vi.fn(),
    logExportAudit: vi.fn(),
    getExportStats: vi.fn(),
  };
});

// Mock the tracing module
vi.mock("@/lib/tracing", () => ({
  getRequestLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
  getRequestId: (req: NextRequest) => "test-request-id",
}));

describe("GDPR Data Export API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    const { validateAuth } = await import("@/lib/auth/session-auth");
    vi.mocked(validateAuth).mockResolvedValue({
      authenticated: false,
      userId: null,
    } as any);

    const request = new NextRequest(
      new URL("http://localhost:3000/api/privacy/export-data"),
      {
        method: "GET",
      },
    );

    const response = await GET(request);
    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json).toHaveProperty("error");
    expect((json as any).error).toMatch(/Unauthorized/i);
  });

  it("should return 429 if user has exported recently (rate limit)", async () => {
    const { validateAuth } = await import("@/lib/auth/session-auth");
    const { canUserExport } = await import("../helpers");

    vi.mocked(validateAuth).mockResolvedValue({
      authenticated: true,
      userId: "user-123",
    } as any);

    vi.mocked(canUserExport).mockResolvedValue(false);

    const request = new NextRequest(
      new URL("http://localhost:3000/api/privacy/export-data"),
      {
        method: "GET",
      },
    );

    const response = await GET(request);
    expect(response.status).toBe(429);
    const json = await response.json();
    expect((json as any).error).toMatch(/hour/i);
  });

  it("should export user data successfully", async () => {
    const { validateAuth } = await import("@/lib/auth/session-auth");
    const { canUserExport, exportUserData, getExportStats, logExportAudit } =
      await import("../helpers");

    const mockExportData = {
      exportedAt: new Date().toISOString(),
      userId: "user-123",
      profile: {
        username: "testuser",
        email: "test@example.com",
        createdAt: new Date().toISOString(),
      },
      settings: {},
      conversations: [],
      messages: [],
      learningProgress: {
        level: 1,
        xp: 0,
        totalStudyMinutes: 0,
        streakCurrent: 0,
        streakLongest: 0,
        questionsAsked: 0,
      },
      flashcards: {
        totalCards: 0,
        byState: {},
      },
      quizzes: [],
      studySessions: [],
      learnings: [],
      accessibility: {},
      gamification: {},
      tosAcceptances: [],
      privacyPreferences: {
        pseudonymizedMode: false,
      },
    };

    const mockStats = {
      conversationCount: 0,
      messageCount: 0,
      flashcardCount: 0,
      quizCount: 0,
      sessionCount: 0,
      learningCount: 0,
    };

    vi.mocked(validateAuth).mockResolvedValue({
      authenticated: true,
      userId: "user-123",
    } as any);

    vi.mocked(canUserExport).mockResolvedValue(true);
    vi.mocked(exportUserData).mockResolvedValue(mockExportData as any);
    vi.mocked(getExportStats).mockResolvedValue(mockStats);
    vi.mocked(logExportAudit).mockResolvedValue(undefined);

    const request = new NextRequest(
      new URL("http://localhost:3000/api/privacy/export-data"),
      {
        method: "GET",
      },
    );

    const response = await GET(request);
    expect(response.status).toBe(200);

    const json = (await response.json()) as any;
    expect(json).toHaveProperty("data");
    expect(json).toHaveProperty("stats");
    expect(json.data.userId).toBe("user-123");
    expect(json.stats.conversationCount).toBe(0);
  });

  it("should include download headers in response", async () => {
    const { validateAuth } = await import("@/lib/auth/session-auth");
    const { canUserExport, exportUserData, getExportStats, logExportAudit } =
      await import("../helpers");

    vi.mocked(validateAuth).mockResolvedValue({
      authenticated: true,
      userId: "user-123",
    } as any);

    vi.mocked(canUserExport).mockResolvedValue(true);
    vi.mocked(exportUserData).mockResolvedValue({
      exportedAt: new Date().toISOString(),
      userId: "user-123",
      profile: { createdAt: new Date().toISOString() },
    } as any);
    vi.mocked(getExportStats).mockResolvedValue({
      conversationCount: 0,
      messageCount: 0,
      flashcardCount: 0,
      quizCount: 0,
      sessionCount: 0,
      learningCount: 0,
    });
    vi.mocked(logExportAudit).mockResolvedValue(undefined);

    const request = new NextRequest(
      new URL("http://localhost:3000/api/privacy/export-data"),
      {
        method: "GET",
      },
    );

    const response = await GET(request);
    expect(response.headers.get("Content-Disposition")).toMatch(/attachment/);
    expect(response.headers.get("Content-Type")).toMatch(/application\/json/);
  });

  it("should return 500 on database errors", async () => {
    const { validateAuth } = await import("@/lib/auth/session-auth");
    const { canUserExport } = await import("../helpers");

    vi.mocked(validateAuth).mockResolvedValue({
      authenticated: true,
      userId: "user-123",
    } as any);

    vi.mocked(canUserExport).mockRejectedValue(new Error("DB error"));

    const request = new NextRequest(
      new URL("http://localhost:3000/api/privacy/export-data"),
      {
        method: "GET",
      },
    );

    const response = await GET(request);
    expect(response.status).toBe(500);
  });
});
