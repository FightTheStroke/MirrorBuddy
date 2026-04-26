/**
 * Unit tests for GET /api/waitlist/unsubscribe
 *
 * F-03: Token validation
 * F-05: Idempotent unsubscribe (success vs already status)
 * F-08: Rate limit returns 429
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock unsubscribe service BEFORE importing the route
vi.mock('@/lib/waitlist/waitlist-service', () => ({
  unsubscribe: vi.fn(),
}));

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
import { unsubscribe } from '@/lib/waitlist/waitlist-service';
import { checkRateLimitAsync } from '@/lib/rate-limit';

const mockUnsubscribe = unsubscribe as ReturnType<typeof vi.fn>;
const mockCheckRateLimit = checkRateLimitAsync as ReturnType<typeof vi.fn>;

function makeRequest(token?: string): NextRequest {
  const url = token
    ? `http://localhost/api/waitlist/unsubscribe?token=${encodeURIComponent(token)}`
    : 'http://localhost/api/waitlist/unsubscribe';
  return new NextRequest(url, { method: 'GET' });
}

/** Fresh unsubscribe: unsubscribedAt was just set (within threshold) */
const FRESH_UNSUB_ENTRY = {
  id: 'entry-001',
  email: 'user@example.com',
  name: 'User',
  locale: 'it',
  source: 'coming-soon',
  gdprConsentAt: new Date(),
  gdprConsentVersion: '1.0',
  marketingConsent: false,
  marketingConsentAt: null,
  verificationToken: 'ver-tok',
  verificationExpiresAt: new Date(Date.now() + 86400000),
  verifiedAt: new Date(),
  unsubscribeToken: 'unsub-fresh',
  unsubscribedAt: new Date(), // just now — within 10 second threshold
  promoCode: null,
  promoRedeemedAt: null,
  convertedUserId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

/** Already-unsubscribed: unsubscribedAt was set more than 10 seconds ago */
const ALREADY_UNSUB_ENTRY = {
  ...FRESH_UNSUB_ENTRY,
  unsubscribeToken: 'unsub-old',
  unsubscribedAt: new Date(Date.now() - 60000), // 1 minute ago — past threshold
};

describe('GET /api/waitlist/unsubscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      remaining: 9,
      resetTime: Date.now() + 3600000,
      limit: 10,
    });
  });

  it('redirects to /{locale}/waitlist/unsubscribe?status=success for a fresh unsubscribe', async () => {
    mockUnsubscribe.mockResolvedValueOnce(FRESH_UNSUB_ENTRY);

    const response = await GET(makeRequest('unsub-fresh'));

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('/it/waitlist/unsubscribe');
    expect(location).toContain('status=success');
  });

  it('redirects to /{locale}/waitlist/unsubscribe?status=already for a repeat unsubscribe', async () => {
    mockUnsubscribe.mockResolvedValueOnce(ALREADY_UNSUB_ENTRY);

    const response = await GET(makeRequest('unsub-old'));

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('/it/waitlist/unsubscribe');
    expect(location).toContain('status=already');
  });

  it('redirects to /waitlist/unsubscribe?status=not_found when token is missing', async () => {
    const response = await GET(makeRequest());

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('/waitlist/unsubscribe');
    expect(location).toContain('status=not_found');
    expect(mockUnsubscribe).not.toHaveBeenCalled();
  });

  it('redirects to /waitlist/unsubscribe?status=not_found for an empty token', async () => {
    const response = await GET(makeRequest('   '));

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('status=not_found');
    expect(mockUnsubscribe).not.toHaveBeenCalled();
  });

  it('redirects to /waitlist/unsubscribe?status=not_found for an invalid token', async () => {
    mockUnsubscribe.mockRejectedValueOnce(new Error('Invalid unsubscribe token'));

    const response = await GET(makeRequest('bad-token'));

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
    expect(mockUnsubscribe).not.toHaveBeenCalled();
  });

  it('uses locale from entry in redirect URL', async () => {
    const entryWithFrLocale = { ...FRESH_UNSUB_ENTRY, locale: 'fr' };
    mockUnsubscribe.mockResolvedValueOnce(entryWithFrLocale);

    const response = await GET(makeRequest('fr-token'));

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('/fr/waitlist/unsubscribe');
    expect(location).toContain('status=success');
  });
});
