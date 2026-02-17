/**
 * Unit tests for POST /api/promo/redeem
 * TDD: written before implementation
 *
 * F-xx: Promo code redemption route
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock promo-service BEFORE importing route
vi.mock('@/lib/promo/promo-service', () => ({
  redeemCode: vi.fn(),
}));

// Mock middlewares — pipe passes through, withSentry is no-op, withRateLimit passes by default
vi.mock('@/lib/api/middlewares', () => ({
  pipe:
    () =>
    (handler: (ctx: { req: NextRequest; userId?: string }) => Promise<Response>) =>
    (req: NextRequest) =>
      handler({ req, userId: undefined }),
  withSentry: () => {},
  withCSRF: {},
  withRateLimit: () => {},
}));

// Mock rate-limit to allow by default
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimitAsync: vi.fn().mockResolvedValue({
    success: true,
    remaining: 9,
    resetTime: Date.now() + 3600000,
    limit: 10,
  }),
  getRateLimitIdentifier: vi.fn().mockReturnValue('127.0.0.1'),
  rateLimitResponse: vi.fn(
    () =>
      new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      }),
  ),
}));

// Mock auth — route imports from '@/lib/auth/server'
vi.mock('@/lib/auth/server', () => ({
  validateAuth: vi.fn(),
}));

// Mock logger
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

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

// Mock audit service
vi.mock('@/lib/admin/audit-service', () => ({
  logAdminAction: vi.fn().mockResolvedValue(undefined),
}));

import { POST } from '../route';
import { redeemCode } from '@/lib/promo/promo-service';
import { checkRateLimitAsync } from '@/lib/rate-limit';
import { validateAuth } from '@/lib/auth/server';
import { logAdminAction } from '@/lib/admin/audit-service';

const mockRedeemCode = redeemCode as ReturnType<typeof vi.fn>;
const mockCheckRateLimit = checkRateLimitAsync as ReturnType<typeof vi.fn>;
const mockValidateAuth = validateAuth as ReturnType<typeof vi.fn>;
const mockLogAdminAction = logAdminAction as ReturnType<typeof vi.fn>;

const VALID_SUBSCRIPTION = {
  id: 'sub-1',
  userId: 'user-123',
  tierId: 'tier-pro',
  status: 'ACTIVE',
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
};

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/promo/redeem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/promo/redeem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: rate limit passes
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      remaining: 9,
      resetTime: Date.now() + 3600000,
      limit: 10,
    });
    // Default: authenticated
    mockValidateAuth.mockResolvedValue({
      authenticated: true,
      userId: 'user-123',
    });
  });

  it('returns 200 with valid code and authenticated user', async () => {
    mockRedeemCode.mockResolvedValueOnce(VALID_SUBSCRIPTION);

    const req = makeRequest({ code: 'ABC12345' });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockRedeemCode).toHaveBeenCalledWith('ABC12345', 'user-123');
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'REDEEM_PROMO_CODE',
        entityType: 'PromoCode',
        entityId: 'ABC12345',
        adminId: 'user-123',
      }),
    );
  });

  it('returns 401 without auth', async () => {
    mockValidateAuth.mockResolvedValueOnce({
      authenticated: false,
      userId: null,
      error: 'No authentication cookie',
    });

    const req = makeRequest({ code: 'ABC12345' });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBeTruthy();
    expect(mockRedeemCode).not.toHaveBeenCalled();
  });

  it('returns 400 with invalid/non-existent code', async () => {
    mockRedeemCode.mockRejectedValueOnce(new Error('PROMO_NOT_FOUND'));

    const req = makeRequest({ code: 'BADCODE' });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeTruthy();
  });

  it('returns 409 with active Stripe subscription', async () => {
    mockRedeemCode.mockRejectedValueOnce(new Error('PROMO_STRIPE_CONFLICT'));

    const req = makeRequest({ code: 'ABC12345' });
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBeTruthy();
  });

  it('returns 429 on rate limit', async () => {
    mockCheckRateLimit.mockResolvedValueOnce({
      success: false,
      remaining: 0,
      resetTime: Date.now() + 3600000,
      limit: 10,
    });

    const req = makeRequest({ code: 'ABC12345' });
    const response = await POST(req);

    expect(response.status).toBe(429);
    expect(mockRedeemCode).not.toHaveBeenCalled();
  });
});
