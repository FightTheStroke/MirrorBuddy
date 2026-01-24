/**
 * MIRRORBUDDY - Trial Email Capture API Tests
 *
 * Tests for email capture endpoint:
 * - PATCH /api/trial/email - Save email to trial session
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "../route";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  prisma: {
    trialSession: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    child: vi.fn(() => ({
      info: vi.fn(),
      error: vi.fn(),
    })),
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({
    get: vi.fn((name: string) => {
      if (name === "x-forwarded-for") return "192.168.1.1";
      if (name === "x-real-ip") return "192.168.1.1";
      return null;
    }),
  })),
  cookies: vi.fn(async () => ({
    get: vi.fn((name: string) => {
      if (name === "mirrorbuddy-visitor-id") {
        return { value: "test-visitor-123" };
      }
      return undefined;
    }),
  })),
}));

import { prisma } from "@/lib/db";

describe("PATCH /api/trial/email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves email to trial session", async () => {
    const mockSession = {
      id: "session-123",
      email: null,
      emailCollectedAt: null,
    };

    vi.mocked(prisma.trialSession.findUnique).mockResolvedValue(
      mockSession as any,
    );

    const updatedSession = {
      ...mockSession,
      email: "user@example.com",
      emailCollectedAt: new Date(),
    };

    vi.mocked(prisma.trialSession.update).mockResolvedValue(
      updatedSession as any,
    );

    const request = new NextRequest("http://localhost:3000/api/trial/email", {
      method: "PATCH",
      body: JSON.stringify({
        sessionId: "session-123",
        email: "user@example.com",
      }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.email).toBe("user@example.com");
    expect(prisma.trialSession.update).toHaveBeenCalledWith({
      where: { id: "session-123" },
      data: {
        email: "user@example.com",
        emailCollectedAt: expect.any(Date),
      },
    });
  });

  it("validates email format", async () => {
    const request = new NextRequest("http://localhost:3000/api/trial/email", {
      method: "PATCH",
      body: JSON.stringify({
        sessionId: "session-123",
        email: "invalid-email",
      }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid email");
  });

  it("requires sessionId", async () => {
    const request = new NextRequest("http://localhost:3000/api/trial/email", {
      method: "PATCH",
      body: JSON.stringify({
        email: "user@example.com",
      }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("sessionId");
  });

  it("returns 404 if session not found", async () => {
    vi.mocked(prisma.trialSession.findUnique).mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/trial/email", {
      method: "PATCH",
      body: JSON.stringify({
        sessionId: "nonexistent-session",
        email: "user@example.com",
      }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain("Session not found");
  });

  it("allows updating email even if already set", async () => {
    const mockSession = {
      id: "session-123",
      email: "old@example.com",
      emailCollectedAt: new Date("2024-01-01"),
    };

    vi.mocked(prisma.trialSession.findUnique).mockResolvedValue(
      mockSession as any,
    );

    const updatedSession = {
      ...mockSession,
      email: "new@example.com",
      emailCollectedAt: new Date(),
    };

    vi.mocked(prisma.trialSession.update).mockResolvedValue(
      updatedSession as any,
    );

    const request = new NextRequest("http://localhost:3000/api/trial/email", {
      method: "PATCH",
      body: JSON.stringify({
        sessionId: "session-123",
        email: "new@example.com",
      }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.email).toBe("new@example.com");
  });
});
