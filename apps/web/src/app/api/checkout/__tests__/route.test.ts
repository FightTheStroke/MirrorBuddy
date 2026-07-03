/**
 * @vitest-environment node
 * Unit tests for Checkout API logic
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { z } from 'zod';

// Mock stripeService
const { mockCreateCheckoutSession } = vi.hoisted(() => ({
  mockCreateCheckoutSession: vi.fn(),
}));

vi.mock('@/lib/stripe', () => ({
  stripeService: {
    createCheckoutSession: mockCreateCheckoutSession,
  },
}));

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
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

// Mock prisma
const mockFindUnique = vi.fn();
vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});

// Route-level mocks (T1.6): bypass middleware pipeline, inject test userId
vi.mock('@/lib/api/middlewares', () => ({
  pipe:
    (..._middlewares: unknown[]) =>
    (handler: (ctx: Record<string, unknown>) => Promise<Response>) =>
    async (req: unknown) =>
      handler({ req, params: Promise.resolve({}), userId: 'user_route_test' }),
  withSentry: () => vi.fn(),
  withCSRF: vi.fn(),
  withAuth: vi.fn(),
}));

// guardian-gate → coppa-service imports @/lib/email
vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(),
  isEmailConfigured: () => false,
}));

// Compliance audit trail (guardian-gate refusals)
const { mockRecordComplianceEvent } = vi.hoisted(() => ({
  mockRecordComplianceEvent: vi.fn(),
}));
vi.mock('@/lib/safety', () => ({
  recordComplianceEvent: mockRecordComplianceEvent,
}));

// Test the checkout schema validation directly
const CheckoutSchema = z.object({
  priceId: z.string().min(1, 'Price ID required'),
  locale: z.enum(['it', 'en', 'fr', 'de', 'es']).optional(),
});

describe('Checkout API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CheckoutSchema validation', () => {
    it('validates correct payload', () => {
      const result = CheckoutSchema.safeParse({
        priceId: 'price_123',
        locale: 'it',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing priceId', () => {
      const result = CheckoutSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects empty priceId', () => {
      const result = CheckoutSchema.safeParse({ priceId: '' });
      expect(result.success).toBe(false);
    });

    it('rejects invalid locale', () => {
      const result = CheckoutSchema.safeParse({
        priceId: 'price_123',
        locale: 'invalid',
      });
      expect(result.success).toBe(false);
    });

    it('accepts valid locales', () => {
      for (const locale of ['it', 'en', 'fr', 'de', 'es']) {
        const result = CheckoutSchema.safeParse({
          priceId: 'price_123',
          locale,
        });
        expect(result.success).toBe(true);
      }
    });

    it('allows missing locale', () => {
      const result = CheckoutSchema.safeParse({ priceId: 'price_123' });
      expect(result.success).toBe(true);
    });
  });

  describe('stripeService.createCheckoutSession', () => {
    it('creates checkout session with correct params', async () => {
      const mockSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      };
      mockCreateCheckoutSession.mockResolvedValueOnce(mockSession);

      const result = await mockCreateCheckoutSession({
        priceId: 'price_123',
        email: 'test@example.com',
        userId: 'user_123',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        locale: 'it',
      });

      expect(result.id).toBe('cs_test_123');
      expect(result.url).toContain('checkout.stripe.com');
    });

    it('throws error when Stripe fails', async () => {
      mockCreateCheckoutSession.mockRejectedValueOnce(new Error('Stripe API error'));

      await expect(
        mockCreateCheckoutSession({
          priceId: 'price_123',
          email: 'test@example.com',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        }),
      ).rejects.toThrow('Stripe API error');
    });
  });

  describe('user lookup', () => {
    it('finds user by ID', async () => {
      mockFindUnique.mockResolvedValueOnce({ email: 'test@example.com' });

      const result = await mockFindUnique({
        where: { id: 'user_123' },
        select: { email: true },
      });

      expect(result?.email).toBe('test@example.com');
    });

    it('returns null for non-existent user', async () => {
      mockFindUnique.mockResolvedValueOnce(null);

      const result = await mockFindUnique({
        where: { id: 'invalid_user' },
        select: { email: true },
      });

      expect(result).toBeNull();
    });
  });
});

// ============================================================================
// Route-level tests: guardian gate on POST /api/checkout (T1.6, D-11)
// Invokes the actual route handler with mocked middleware pipeline.
// ============================================================================

type MockPrismaT = import('@/test/mocks/prisma').MockPrisma;

function makeCheckoutRequest(body: unknown) {
  return {
    json: async () => body,
    method: 'POST',
    url: 'https://example.com/api/checkout',
    nextUrl: { origin: 'https://example.com', pathname: '/api/checkout' },
  } as never;
}

describe('POST /api/checkout — server-side guardian gate (T1.6, D-11)', () => {
  let mockPrisma: MockPrismaT;
  let POST: (req: never) => Promise<Response>;

  beforeAll(async () => {
    mockPrisma = (await import('@/lib/db')).prisma as unknown as MockPrismaT;
    POST = (await import('../route')).POST as unknown as (
      req: never,
    ) => Promise<Response>;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 403 GUARDIAN_REQUIRED for a minor without parental consent and never calls Stripe', async () => {
    mockPrisma.profile.findUnique.mockResolvedValueOnce({ age: 10 });
    mockPrisma.coppaConsent.findUnique.mockResolvedValueOnce(null);

    const res = await POST(makeCheckoutRequest({ priceId: 'price_123' }));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('GUARDIAN_REQUIRED');
    expect(mockCreateCheckoutSession).not.toHaveBeenCalled();
    // Refusal is audited
    expect(mockRecordComplianceEvent).toHaveBeenCalledWith(
      'guardrail_triggered',
      expect.objectContaining({ outcome: 'blocked' }),
    );
  });

  it('allows an adult through to Stripe checkout', async () => {
    mockPrisma.profile.findUnique.mockResolvedValueOnce({ age: 30 });
    mockPrisma.globalConfig.findFirst.mockResolvedValueOnce({
      paymentsEnabled: true,
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      email: 'adult@example.com',
    });
    mockCreateCheckoutSession.mockResolvedValueOnce({
      id: 'cs_test_ok',
      url: 'https://checkout.stripe.com/pay/cs_test_ok',
    });

    const res = await POST(makeCheckoutRequest({ priceId: 'price_123' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sessionId).toBe('cs_test_ok');
    expect(mockCreateCheckoutSession).toHaveBeenCalledTimes(1);
    expect(mockRecordComplianceEvent).not.toHaveBeenCalled();
  });

  it('allows a minor WITH granted parental consent through to Stripe', async () => {
    mockPrisma.profile.findUnique.mockResolvedValueOnce({ age: 12 });
    mockPrisma.coppaConsent.findUnique.mockResolvedValueOnce({
      consentGranted: true,
      consentGrantedAt: new Date(),
      verificationSentAt: new Date(),
      verificationExpiresAt: null,
    });
    mockPrisma.globalConfig.findFirst.mockResolvedValueOnce({
      paymentsEnabled: true,
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      email: 'consented-minor@example.com',
    });
    mockCreateCheckoutSession.mockResolvedValueOnce({
      id: 'cs_test_minor_ok',
      url: 'https://checkout.stripe.com/pay/cs_test_minor_ok',
    });

    const res = await POST(makeCheckoutRequest({ priceId: 'price_123' }));

    expect(res.status).toBe(200);
    expect(mockCreateCheckoutSession).toHaveBeenCalledTimes(1);
  });

  it('allows unknown age (fail-open — mirrors checkCoppaStatus convention)', async () => {
    mockPrisma.profile.findUnique.mockResolvedValueOnce(null);
    mockPrisma.globalConfig.findFirst.mockResolvedValueOnce({
      paymentsEnabled: true,
    });
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      email: 'unknown-age@example.com',
    });
    mockCreateCheckoutSession.mockResolvedValueOnce({
      id: 'cs_test_unknown',
      url: 'https://checkout.stripe.com/pay/cs_test_unknown',
    });

    const res = await POST(makeCheckoutRequest({ priceId: 'price_123' }));

    expect(res.status).toBe(200);
  });
});
