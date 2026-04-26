/**
 * Unit tests for GET /api/waitlist/verify
 *
 * F-03: Token validation and redirect behaviour
 * F-08: Rate limit returns 429
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock waitlist service BEFORE importing the route
vi.mock('@/lib/waitlist/waitlist-service', () => ({
  verify: vi.fn(),
}));

// Mock prisma — verify route uses it for locale lookup on error paths
vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});

// Mock rate-limit to allow pass-through by default
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimitAsync: vi.fn().mockResolvedValue({
    success: true,
    remaining: 9,
    resetTime: Date.now() + 3600000,
    limit: 10,
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

// Mock Sentry context enrichment
vi.mock('@/lib/observability/sentry-tier-context', () => ({
  setSentryTierContext: vi.fn(),
}));

import { GET } from '../route';
import { verify } from '@/lib/waitlist/waitlist-service';
import { checkRateLimitAsync } from '@/lib/rate-limit';
import { prisma } from '@/lib/db';

const mockVerify = verify as ReturnType<typeof vi.fn>;
const mockCheckRateLimit = checkRateLimitAsync as ReturnType<typeof vi.fn>;
const mockPrismaFindUnique = (
  prisma as unknown as { waitlistEntry: { findUnique: ReturnType<typeof vi.fn> } }
).waitlistEntry.findUnique;

function makeRequest(token?: string): NextRequest {
  const url = token
    ? `http://localhost/api/waitlist/verify?token=${encodeURIComponent(token)}`
    : 'http://localhost/api/waitlist/verify';
  return new NextRequest(url, { method: 'GET' });
}

const VERIFIED_ENTRY = {
  id: 'entry-001',
  email: 'user@example.com',
  name: 'User',
  locale: 'it',
  source: 'coming-soon',
  gdprConsentAt: new Date(),
  gdprConsentVersion: '1.0',
  marketingConsent: false,
  marketingConsentAt: null,
  verificationToken: 'valid-token',
  verificationExpiresAt: new Date(Date.now() + 86400000),
  verifiedAt: new Date(),
  unsubscribeToken: 'unsub-abc',
  unsubscribedAt: null,
  promoCode: 'PROMO123',
  promoRedeemedAt: null,
  convertedUserId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('GET /api/waitlist/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      remaining: 9,
      resetTime: Date.now() + 3600000,
      limit: 10,
    });
    mockPrismaFindUnique.mockResolvedValue(null);
  });

  it('redirects to /{locale}/waitlist/verify?status=success for a valid token', async () => {
    mockVerify.mockResolvedValueOnce(VERIFIED_ENTRY);

    const response = await GET(makeRequest('valid-token'));

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('/it/waitlist/verify');
    expect(location).toContain('status=success');
  });

  it('redirects to /waitlist/verify?status=not_found when token is missing', async () => {
    const response = await GET(makeRequest());

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('/waitlist/verify');
    expect(location).toContain('status=not_found');
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it('redirects to /waitlist/verify?status=not_found for an empty token', async () => {
    const response = await GET(makeRequest('   '));

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('status=not_found');
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it('redirects to /{locale}/waitlist/verify?status=expired for an expired token', async () => {
    mockVerify.mockRejectedValueOnce(new Error('Verification token expired'));
    mockPrismaFindUnique.mockResolvedValueOnce({ locale: 'en' });

    const response = await GET(makeRequest('expired-token'));

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('status=expired');
  });

  it('redirects to /{locale}/waitlist/verify?status=already for an already-verified token', async () => {
    mockVerify.mockRejectedValueOnce(new Error('Email already verified'));
    mockPrismaFindUnique.mockResolvedValueOnce({ locale: 'fr' });

    const response = await GET(makeRequest('already-used-token'));

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('status=already');
  });

  it('redirects to /waitlist/verify?status=not_found for an invalid/unknown token', async () => {
    mockVerify.mockRejectedValueOnce(new Error('Invalid verification token'));
    mockPrismaFindUnique.mockResolvedValueOnce(null);

    const response = await GET(makeRequest('unknown-token'));

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('status=not_found');
  });

  it('returns 429 when rate limit is exceeded', async () => {
    mockCheckRateLimit.mockResolvedValueOnce({
      success: false,
      remaining: 0,
      resetTime: Date.now() + 3600000,
      limit: 10,
    });

    const response = await GET(makeRequest('some-token'));

    expect(response.status).toBe(429);
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it('uses locale from verified entry in success redirect', async () => {
    const entryWithEnLocale = { ...VERIFIED_ENTRY, locale: 'en' };
    mockVerify.mockResolvedValueOnce(entryWithEnLocale);

    const response = await GET(makeRequest('en-token'));

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('/en/waitlist/verify');
    expect(location).toContain('status=success');
  });
});
