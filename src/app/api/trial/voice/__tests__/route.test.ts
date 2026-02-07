/**
 * MIRRORBUDDY - Trial Voice API Tests
 *
 * Tests for POST and GET /api/trial/voice
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

// Mock dependencies
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
  headers: vi.fn(),
}));

vi.mock("@/lib/auth/session-auth", () => ({
  validateAuth: vi.fn(),
}));

vi.mock("@/lib/security/csrf", () => ({
  requireCSRF: vi.fn(),
}));

vi.mock("@/lib/trial/trial-service", () => ({
  getOrCreateTrialSession: vi.fn(),
  checkTrialLimits: vi.fn(),
  addVoiceSeconds: vi.fn(),
  TRIAL_LIMITS: {
    VOICE_SECONDS: 300,
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: () => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

import { cookies, headers } from "next/headers";
import { validateAuth } from "@/lib/auth";
import { requireCSRF } from "@/lib/security";
import {
  getOrCreateTrialSession,
  checkTrialLimits,
  addVoiceSeconds,
} from "@/lib/trial/trial-service";
import { GET, POST } from "../route";

describe("Trial Voice API", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock for headers
    vi.mocked(headers).mockResolvedValue({
      get: vi.fn((key: string) => {
        if (key === "x-forwarded-for") return "192.168.1.1";
        return null;
      }),
    } as any);

    // Default CSRF check passes
    vi.mocked(requireCSRF).mockReturnValue(true);
  });

  describe("GET /api/trial/voice", () => {
    it("returns unlimited for authenticated users", async () => {
      vi.mocked(validateAuth).mockResolvedValue({
        authenticated: true,
        userId: "user-123",
      } as any);

      const response = await GET(
        new NextRequest("http://localhost/api/trial/voice"),
      );
      const data = await response.json();

      expect(data.allowed).toBe(true);
      expect(data.isTrialUser).toBe(false);
      expect(data.voiceSecondsRemaining).toBe(-1);
    });

    it("returns full quota when no visitor cookie", async () => {
      vi.mocked(validateAuth).mockResolvedValue({
        authenticated: false,
      } as any);
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue(undefined),
      } as any);

      const response = await GET(
        new NextRequest("http://localhost/api/trial/voice"),
      );
      const data = await response.json();

      expect(data.allowed).toBe(true);
      expect(data.isTrialUser).toBe(true);
      expect(data.voiceSecondsRemaining).toBe(300);
    });

    it("returns current usage for trial user with session", async () => {
      vi.mocked(validateAuth).mockResolvedValue({
        authenticated: false,
      } as any);
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "visitor-abc" }),
      } as any);
      vi.mocked(getOrCreateTrialSession).mockResolvedValue({
        id: "session-123",
        voiceSecondsUsed: 120,
      } as any);
      vi.mocked(checkTrialLimits).mockResolvedValue({ allowed: true });

      const response = await GET(
        new NextRequest("http://localhost/api/trial/voice"),
      );
      const data = await response.json();

      expect(data.allowed).toBe(true);
      expect(data.isTrialUser).toBe(true);
      expect(data.voiceSecondsUsed).toBe(120);
      expect(data.voiceSecondsRemaining).toBe(180);
      expect(data.maxVoiceSeconds).toBe(300);
    });

    it("returns denied when voice limit reached", async () => {
      vi.mocked(validateAuth).mockResolvedValue({
        authenticated: false,
      } as any);
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "visitor-abc" }),
      } as any);
      vi.mocked(getOrCreateTrialSession).mockResolvedValue({
        id: "session-123",
        voiceSecondsUsed: 300,
      } as any);
      vi.mocked(checkTrialLimits).mockResolvedValue({
        allowed: false,
        reason: "Limite voce raggiunto",
      });

      const response = await GET(
        new NextRequest("http://localhost/api/trial/voice"),
      );
      const data = await response.json();

      expect(data.allowed).toBe(false);
      expect(data.voiceSecondsRemaining).toBe(0);
      expect(data.reason).toBe("Limite voce raggiunto");
    });
  });

  describe("POST /api/trial/voice", () => {
    function createRequest(body: unknown): NextRequest {
      return new NextRequest("http://localhost/api/trial/voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    }

    it("accepts requests without CSRF (public endpoint)", async () => {
      vi.mocked(validateAuth).mockResolvedValue({
        authenticated: false,
      } as any);
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "visitor-123" }),
      } as any);
      vi.mocked(headers).mockResolvedValue({
        get: vi.fn().mockReturnValue(null),
      } as any);
      vi.mocked(getOrCreateTrialSession).mockResolvedValue({
        id: "session-123",
        visitorId: "visitor-123",
        voiceSecondsUsed: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      vi.mocked(checkTrialLimits).mockResolvedValue({
        allowed: true,
      });
      vi.mocked(addVoiceSeconds).mockResolvedValue(60);

      const response = await POST(createRequest({ durationSeconds: 60 }));

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.voiceSecondsUsed).toBe(60);
      expect(data.voiceSecondsRemaining).toBe(240);
    });

    it("skips tracking for authenticated users", async () => {
      vi.mocked(validateAuth).mockResolvedValue({
        authenticated: true,
        userId: "user-123",
      } as any);

      const response = await POST(createRequest({ durationSeconds: 60 }));
      const data = await response.json();

      expect(data.skipped).toBe(true);
      expect(data.reason).toBe("authenticated");
      expect(addVoiceSeconds).not.toHaveBeenCalled();
    });

    it("returns 400 when no visitor cookie", async () => {
      vi.mocked(validateAuth).mockResolvedValue({
        authenticated: false,
      } as any);
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue(undefined),
      } as any);

      const response = await POST(createRequest({ durationSeconds: 60 }));

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("No trial session");
    });

    it("returns 400 for invalid duration", async () => {
      vi.mocked(validateAuth).mockResolvedValue({
        authenticated: false,
      } as any);
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "visitor-abc" }),
      } as any);
      vi.mocked(getOrCreateTrialSession).mockResolvedValue({
        id: "session-123",
      } as any);

      const response = await POST(
        createRequest({ durationSeconds: "invalid" }),
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid duration");
    });

    it("returns 400 for negative duration", async () => {
      vi.mocked(validateAuth).mockResolvedValue({
        authenticated: false,
      } as any);
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "visitor-abc" }),
      } as any);
      vi.mocked(getOrCreateTrialSession).mockResolvedValue({
        id: "session-123",
      } as any);

      const response = await POST(createRequest({ durationSeconds: -10 }));

      expect(response.status).toBe(400);
    });

    it("successfully records voice usage", async () => {
      vi.mocked(validateAuth).mockResolvedValue({
        authenticated: false,
      } as any);
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "visitor-abc" }),
      } as any);
      vi.mocked(getOrCreateTrialSession).mockResolvedValue({
        id: "session-123",
      } as any);
      vi.mocked(addVoiceSeconds).mockResolvedValue(180);

      const response = await POST(createRequest({ durationSeconds: 60 }));
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.voiceSecondsUsed).toBe(180);
      expect(data.voiceSecondsRemaining).toBe(120);
      expect(data.maxVoiceSeconds).toBe(300);
      expect(data.limitReached).toBe(false);

      expect(addVoiceSeconds).toHaveBeenCalledWith("session-123", 60);
    });

    it("indicates limit reached when voice exhausted", async () => {
      vi.mocked(validateAuth).mockResolvedValue({
        authenticated: false,
      } as any);
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "visitor-abc" }),
      } as any);
      vi.mocked(getOrCreateTrialSession).mockResolvedValue({
        id: "session-123",
      } as any);
      vi.mocked(addVoiceSeconds).mockResolvedValue(300);

      const response = await POST(createRequest({ durationSeconds: 60 }));
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.voiceSecondsRemaining).toBe(0);
      expect(data.limitReached).toBe(true);
    });
  });
});
