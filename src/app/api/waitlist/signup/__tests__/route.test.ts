/**
 * Unit tests for POST /api/waitlist/signup
 *
 * F-03: GDPR consent is required
 * F-05: Duplicate email returns 409
 * F-08: Rate limit returns 429
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the waitlist service BEFORE importing the route
vi.mock('@/lib/waitlist/waitlist-service', () => ({
  signup: vi.fn(),
}));

// Mock rate-limit to allow pass-through by default; individual tests override
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimitAsync: vi.fn().mockResolvedValue({
    success: true,
    remaining: 4,
    resetTime: Date.now() + 3600000,
    limit: 5,
  }),
  getRateLimitIdentifier: vi.fn().mockReturnValue('127.0.0.1'),
  rateLimitResponse: vi.fn(
    (_result) =>
      new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      }),
  ),
}));

// Mock observability / Sentry (not needed for unit tests)
vi.mock('@/lib/observability/sentry-tier-context', () => ({
  setSentryTierContext: vi.fn(),
}));

// Mock prisma (verify route uses it for locale lookup on error, not used in signup)
vi.mock('@/lib/db', () => ({
  prisma: {
    waitlistEntry: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { POST } from '../route';
import { signup } from '@/lib/waitlist/waitlist-service';
import { checkRateLimitAsync } from '@/lib/rate-limit';

const mockSignup = signup as ReturnType<typeof vi.fn>;
const mockCheckRateLimit = checkRateLimitAsync as ReturnType<typeof vi.fn>;

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/waitlist/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const VALID_ENTRY = {
  id: 'entry-123',
  email: 'test@example.com',
  name: 'Test User',
  locale: 'it',
  source: 'coming-soon',
  gdprConsentAt: new Date(),
  gdprConsentVersion: '1.0',
  marketingConsent: false,
  marketingConsentAt: null,
  verificationToken: 'tok-abc',
  verificationExpiresAt: new Date(Date.now() + 86400000),
  verifiedAt: null,
  unsubscribeToken: 'unsub-xyz',
  unsubscribedAt: null,
  promoCode: null,
  promoRedeemedAt: null,
  convertedUserId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('POST /api/waitlist/signup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: rate limit passes
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      remaining: 4,
      resetTime: Date.now() + 3600000,
      limit: 5,
    });
  });

  it('returns 201 with valid data and gdprConsent=true', async () => {
    mockSignup.mockResolvedValueOnce(VALID_ENTRY);

    const req = makeRequest({
      email: 'test@example.com',
      name: 'Test User',
      gdprConsent: true,
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.id).toBe('entry-123');
    expect(mockSignup).toHaveBeenCalledOnce();
  });

  it('returns 400 when gdprConsent is missing', async () => {
    const req = makeRequest({
      email: 'test@example.com',
      // gdprConsent intentionally omitted
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/gdpr consent/i);
    expect(mockSignup).not.toHaveBeenCalled();
  });

  it('returns 400 when gdprConsent is false', async () => {
    const req = makeRequest({
      email: 'test@example.com',
      gdprConsent: false,
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/gdpr consent/i);
    expect(mockSignup).not.toHaveBeenCalled();
  });

  it('returns 400 when email is missing', async () => {
    const req = makeRequest({ gdprConsent: true });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/email/i);
    expect(mockSignup).not.toHaveBeenCalled();
  });

  it('returns 400 when email is invalid', async () => {
    const req = makeRequest({ email: 'not-an-email', gdprConsent: true });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/email/i);
    expect(mockSignup).not.toHaveBeenCalled();
  });

  it('returns 409 for duplicate email', async () => {
    mockSignup.mockRejectedValueOnce(new Error('Email already registered on waitlist'));

    const req = makeRequest({
      email: 'duplicate@example.com',
      gdprConsent: true,
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toMatch(/already on the waitlist/i);
  });

  it('returns 429 when rate limit is exceeded', async () => {
    mockCheckRateLimit.mockResolvedValueOnce({
      success: false,
      remaining: 0,
      resetTime: Date.now() + 3600000,
      limit: 5,
    });

    const req = makeRequest({
      email: 'test@example.com',
      gdprConsent: true,
    });

    const response = await POST(req);

    expect(response.status).toBe(429);
    expect(mockSignup).not.toHaveBeenCalled();
  });

  it('returns 400 when JSON body is invalid', async () => {
    const req = new NextRequest('http://localhost/api/waitlist/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/invalid json/i);
  });
});
