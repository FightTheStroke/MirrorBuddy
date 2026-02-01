/**
 * MIRRORBUDDY - Trial Email Capture API Tests
 *
 * Tests for email capture endpoint:
 * - PATCH /api/trial/email - Save email to trial session
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "../route";

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

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimitAsync: vi.fn().mockResolvedValue({ success: true }),
  getClientIdentifier: vi.fn().mockReturnValue("test-ip"),
  rateLimitResponse: vi.fn(),
  RATE_LIMITS: { CONTACT_FORM: { maxRequests: 5, windowMs: 3600000 } },
}));

vi.mock("@/lib/trial/trial-service", () => ({
  updateTrialEmail: vi.fn(),
  requestTrialEmailVerification: vi.fn(),
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

import {
  requestTrialEmailVerification,
  updateTrialEmail,
} from "@/lib/trial/trial-service";

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

    const updatedSession = {
      ...mockSession,
      email: "user@example.com",
      emailCollectedAt: new Date(),
    };

    vi.mocked(updateTrialEmail).mockResolvedValue(updatedSession as any);
    vi.mocked(requestTrialEmailVerification).mockResolvedValue({
      session: updatedSession,
      emailSent: true,
      expiresAt: new Date(),
    } as any);

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
    expect(updateTrialEmail).toHaveBeenCalledWith(
      "session-123",
      "user@example.com",
    );
    expect(requestTrialEmailVerification).toHaveBeenCalledWith("session-123");
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
    vi.mocked(updateTrialEmail).mockRejectedValue(
      new Error("Session not found"),
    );

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

    const updatedSession = {
      ...mockSession,
      email: "new@example.com",
      emailCollectedAt: new Date(),
    };

    vi.mocked(updateTrialEmail).mockResolvedValue(updatedSession as any);
    vi.mocked(requestTrialEmailVerification).mockResolvedValue({
      session: updatedSession,
      emailSent: true,
      expiresAt: new Date(),
    } as any);

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
    expect(updateTrialEmail).toHaveBeenCalledWith(
      "session-123",
      "new@example.com",
    );
    expect(requestTrialEmailVerification).toHaveBeenCalledWith("session-123");
  });
});
