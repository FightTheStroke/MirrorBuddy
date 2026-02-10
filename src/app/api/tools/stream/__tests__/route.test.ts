/**
 * SSE Stream API Tests (F-03)
 *
 * Tests session ownership verification for GET /api/tools/stream
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../route';

// Mock cookie store
const mockCookies = { get: vi.fn() };

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => mockCookies),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    conversation: { findFirst: vi.fn() },
    trialSession: { findFirst: vi.fn() },
  },
}));

vi.mock('@/lib/logger', () => ({
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

vi.mock('@/lib/auth/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth/server')>();
  return {
    ...actual,
    validateAuth: vi.fn(),
    validateSessionOwnership: vi.fn(),
    isSignedCookie: vi.fn(),
    verifyCookieValue: vi.fn(),
  };
});

vi.mock('@/lib/realtime/tool-events', () => ({
  registerClient: vi.fn(),
  unregisterClient: vi.fn(),
  sendHeartbeat: vi.fn().mockReturnValue(true),
  HEARTBEAT_INTERVAL_MS: 30000,
  getSessionClientCount: vi.fn().mockReturnValue(1),
  getTotalClientCount: vi.fn().mockReturnValue(1),
}));

import { prisma } from '@/lib/db';
import { validateAuth, validateSessionOwnership } from '@/lib/auth/server';

const mockPrismaTrial = prisma.trialSession.findFirst as ReturnType<typeof vi.fn>;
const mockValidateAuth = validateAuth as ReturnType<typeof vi.fn>;
const mockValidateSessionOwnership = validateSessionOwnership as ReturnType<typeof vi.fn>;

describe('GET /api/tools/stream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookies.get.mockReturnValue(undefined);
  });

  it('returns 400 for missing sessionId', async () => {
    const req = new NextRequest('http://localhost:3000/api/tools/stream');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('sessionId');
  });

  it('returns 400 for invalid sessionId format', async () => {
    const req = new NextRequest('http://localhost:3000/api/tools/stream?sessionId=invalid@chars!');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('Invalid sessionId format');
  });

  it('returns 401 for unauthenticated user with no trial session', async () => {
    mockValidateAuth.mockResolvedValue({
      authenticated: false,
      userId: null,
    });

    const req = new NextRequest(
      'http://localhost:3000/api/tools/stream?sessionId=valid-session-123',
    );
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('Invalid session');
  });

  it("returns 403 for authenticated user accessing another user's session", async () => {
    mockValidateAuth.mockResolvedValue({
      authenticated: true,
      userId: 'user-123',
    });
    mockValidateSessionOwnership.mockResolvedValue(false);

    const req = new NextRequest(
      'http://localhost:3000/api/tools/stream?sessionId=other-user-session',
    );
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe('Session access denied');
  });

  it("returns 403 for trial user accessing another trial user's session", async () => {
    mockValidateAuth.mockResolvedValue({
      authenticated: false,
      userId: null,
    });
    mockCookies.get.mockImplementation((name: string) =>
      name === 'mirrorbuddy-visitor-id'
        ? { value: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' }
        : undefined,
    );
    mockPrismaTrial.mockResolvedValue(null);

    const req = new NextRequest(
      'http://localhost:3000/api/tools/stream?sessionId=other-trial-session',
    );
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe('Session access denied');
  });

  it('allows authenticated user to connect to their own session', async () => {
    mockValidateAuth.mockResolvedValue({
      authenticated: true,
      userId: 'user-123',
    });
    mockValidateSessionOwnership.mockResolvedValue(true);

    const req = new NextRequest('http://localhost:3000/api/tools/stream?sessionId=session-abc');
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
  });

  it('allows trial user to connect to their own trial session', async () => {
    mockValidateAuth.mockResolvedValue({
      authenticated: false,
      userId: null,
    });
    mockCookies.get.mockImplementation((name: string) =>
      name === 'mirrorbuddy-visitor-id'
        ? { value: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' }
        : undefined,
    );
    mockPrismaTrial.mockResolvedValue({
      id: 'trial-session-xyz',
      visitorId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    });

    const req = new NextRequest(
      'http://localhost:3000/api/tools/stream?sessionId=trial-session-xyz',
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
  });

  it('allows authenticated user to connect to voice session', async () => {
    mockValidateAuth.mockResolvedValue({
      authenticated: true,
      userId: 'user-123',
    });
    mockValidateSessionOwnership.mockResolvedValue(true);

    const req = new NextRequest(
      'http://localhost:3000/api/tools/stream?sessionId=voice-galileo-1234567890',
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
  });
});
