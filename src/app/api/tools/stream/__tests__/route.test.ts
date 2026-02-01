/**
 * SSE Stream API Tests (F-03)
 *
 * Tests session ownership verification for GET /api/tools/stream
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../route";

// Mock cookie store
const mockCookies = { get: vi.fn() };

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => mockCookies),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    conversation: { findFirst: vi.fn() },
    trialSession: { findFirst: vi.fn() },
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

vi.mock("@/lib/auth/cookie-signing", () => ({
  isSignedCookie: vi.fn(),
  verifyCookieValue: vi.fn(),
}));

vi.mock("@/lib/realtime/tool-events", () => ({
  registerClient: vi.fn(),
  unregisterClient: vi.fn(),
  sendHeartbeat: vi.fn().mockReturnValue(true),
  HEARTBEAT_INTERVAL_MS: 30000,
  getSessionClientCount: vi.fn().mockReturnValue(1),
  getTotalClientCount: vi.fn().mockReturnValue(1),
}));

import { prisma } from "@/lib/db";
import { isSignedCookie, verifyCookieValue } from "@/lib/auth/cookie-signing";

const mockPrismaUser = prisma.user.findUnique as ReturnType<typeof vi.fn>;
const mockPrismaConversation = prisma.conversation.findFirst as ReturnType<
  typeof vi.fn
>;
const mockPrismaTrial = prisma.trialSession.findFirst as ReturnType<
  typeof vi.fn
>;
const mockSignedCookie = isSignedCookie as ReturnType<typeof vi.fn>;
const mockVerifyCookie = verifyCookieValue as ReturnType<typeof vi.fn>;

describe("GET /api/tools/stream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookies.get.mockReturnValue(undefined);
  });

  it("returns 400 for missing sessionId", async () => {
    const req = new NextRequest("http://localhost:3000/api/tools/stream");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("sessionId");
  });

  it("returns 400 for invalid sessionId format", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/tools/stream?sessionId=invalid@chars!",
    );
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain("Invalid sessionId format");
  });

  it("returns 401 for unauthenticated user with no trial session", async () => {
    mockSignedCookie.mockReturnValue(false);

    const req = new NextRequest(
      "http://localhost:3000/api/tools/stream?sessionId=valid-session-123",
    );
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Invalid session");
  });

  it("returns 403 for authenticated user accessing another user's session", async () => {
    mockCookies.get.mockImplementation((name: string) =>
      name === "mirrorbuddy-user-id" ? { value: "s:user-123.sig" } : undefined,
    );
    mockSignedCookie.mockReturnValue(true);
    mockVerifyCookie.mockReturnValue({ valid: true, value: "user-123" });
    mockPrismaUser.mockResolvedValue({ id: "user-123" });
    mockPrismaConversation.mockResolvedValue(null);

    const req = new NextRequest(
      "http://localhost:3000/api/tools/stream?sessionId=other-user-session",
    );
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Session access denied");
  });

  it("returns 403 for trial user accessing another trial user's session", async () => {
    mockCookies.get.mockImplementation((name: string) =>
      name === "mirrorbuddy-visitor-id" ? { value: "visitor-123" } : undefined,
    );
    mockSignedCookie.mockReturnValue(false);
    mockPrismaTrial.mockResolvedValue(null);

    const req = new NextRequest(
      "http://localhost:3000/api/tools/stream?sessionId=other-trial-session",
    );
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Session access denied");
  });

  it("allows authenticated user to connect to their own session", async () => {
    mockCookies.get.mockImplementation((name: string) =>
      name === "mirrorbuddy-user-id" ? { value: "s:user-123.sig" } : undefined,
    );
    mockSignedCookie.mockReturnValue(true);
    mockVerifyCookie.mockReturnValue({ valid: true, value: "user-123" });
    mockPrismaUser.mockResolvedValue({ id: "user-123" });
    mockPrismaConversation.mockResolvedValue({ id: "session-abc" });

    const req = new NextRequest(
      "http://localhost:3000/api/tools/stream?sessionId=session-abc",
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
  });

  it("allows trial user to connect to their own trial session", async () => {
    mockCookies.get.mockImplementation((name: string) =>
      name === "mirrorbuddy-visitor-id" ? { value: "visitor-123" } : undefined,
    );
    mockSignedCookie.mockReturnValue(false);
    mockPrismaTrial.mockResolvedValue({
      id: "trial-session-xyz",
      visitorId: "visitor-123",
    });

    const req = new NextRequest(
      "http://localhost:3000/api/tools/stream?sessionId=trial-session-xyz",
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
  });

  it("allows authenticated user to connect to voice session", async () => {
    mockCookies.get.mockImplementation((name: string) =>
      name === "mirrorbuddy-user-id" ? { value: "s:user-123.sig" } : undefined,
    );
    mockSignedCookie.mockReturnValue(true);
    mockVerifyCookie.mockReturnValue({ valid: true, value: "user-123" });
    mockPrismaUser.mockResolvedValue({ id: "user-123" });

    const req = new NextRequest(
      "http://localhost:3000/api/tools/stream?sessionId=voice-galileo-1234567890",
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    expect(mockPrismaConversation).not.toHaveBeenCalled();
  });
});
