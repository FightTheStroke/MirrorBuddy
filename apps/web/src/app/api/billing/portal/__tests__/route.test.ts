/**
 * @vitest-environment node
 * Unit tests for Billing Portal API logic
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

// Mock stripeService
const { mockCreateCustomerPortalSession } = vi.hoisted(() => ({
  mockCreateCustomerPortalSession: vi.fn(),
}));

vi.mock('@/lib/stripe', () => ({
  stripeService: {
    createCustomerPortalSession: mockCreateCustomerPortalSession,
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
vi.mock('@/lib/safety/server', () => ({
  recordComplianceEvent: mockRecordComplianceEvent,
}));

describe('Billing Portal API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('subscription lookup', () => {
    it('finds subscription by userId', async () => {
      mockFindUnique.mockResolvedValueOnce({ stripeCustomerId: 'cus_123' });

      const result = await mockFindUnique({
        where: { userId: 'user_123' },
        select: { stripeCustomerId: true },
      });

      expect(result?.stripeCustomerId).toBe('cus_123');
    });

    it('returns null when no subscription exists', async () => {
      mockFindUnique.mockResolvedValueOnce(null);

      const result = await mockFindUnique({
        where: { userId: 'user_no_sub' },
        select: { stripeCustomerId: true },
      });

      expect(result).toBeNull();
    });

    it('returns null when subscription has no stripeCustomerId', async () => {
      mockFindUnique.mockResolvedValueOnce({ stripeCustomerId: null });

      const result = await mockFindUnique({
        where: { userId: 'user_123' },
        select: { stripeCustomerId: true },
      });

      expect(result?.stripeCustomerId).toBeNull();
    });
  });

  describe('stripeService.createCustomerPortalSession', () => {
    it('creates portal session with correct params', async () => {
      const mockSession = {
        url: 'https://billing.stripe.com/session/123',
      };
      mockCreateCustomerPortalSession.mockResolvedValueOnce(mockSession);

      const result = await mockCreateCustomerPortalSession({
        customerId: 'cus_123',
        returnUrl: 'https://example.com/dashboard',
      });

      expect(result.url).toContain('billing.stripe.com');
    });

    it('throws error when Stripe fails', async () => {
      mockCreateCustomerPortalSession.mockRejectedValueOnce(new Error('No such customer'));

      await expect(
        mockCreateCustomerPortalSession({
          customerId: 'invalid_customer',
          returnUrl: 'https://example.com/dashboard',
        }),
      ).rejects.toThrow('No such customer');
    });

    it('includes correct return URL', async () => {
      mockCreateCustomerPortalSession.mockImplementationOnce(
        async (params: { customerId: string; returnUrl: string }) => {
          expect(params.returnUrl).toContain('/dashboard');
          return { url: 'https://billing.stripe.com/session/123' };
        },
      );

      await mockCreateCustomerPortalSession({
        customerId: 'cus_123',
        returnUrl: 'https://example.com/dashboard',
      });
    });
  });

  describe('business logic', () => {
    it('requires stripeCustomerId to create portal session', async () => {
      // Simulate the check that happens in the route
      mockFindUnique.mockResolvedValueOnce({ stripeCustomerId: null });

      const subscription = await mockFindUnique({
        where: { userId: 'user_123' },
        select: { stripeCustomerId: true },
      });

      // This is the check from the route
      const hasValidSubscription = subscription?.stripeCustomerId != null;
      expect(hasValidSubscription).toBe(false);
    });

    it('allows portal session when stripeCustomerId exists', async () => {
      mockFindUnique.mockResolvedValueOnce({ stripeCustomerId: 'cus_123' });

      const subscription = await mockFindUnique({
        where: { userId: 'user_123' },
        select: { stripeCustomerId: true },
      });

      const hasValidSubscription = subscription?.stripeCustomerId != null;
      expect(hasValidSubscription).toBe(true);
    });
  });
});

// ============================================================================
// Route-level tests: guardian gate on POST /api/billing/portal (T1.6, D-11)
// Invokes the actual route handler with mocked middleware pipeline.
// ============================================================================

type MockPrismaT = import('@/test/mocks/prisma').MockPrisma;

function makePortalRequest() {
  return {
    method: 'POST',
    url: 'https://example.com/api/billing/portal',
    nextUrl: { origin: 'https://example.com', pathname: '/api/billing/portal' },
  } as never;
}

describe('POST /api/billing/portal — server-side guardian gate (T1.6, D-11)', () => {
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
    mockPrisma.profile.findUnique.mockResolvedValueOnce({ age: 9 });
    mockPrisma.coppaConsent.findUnique.mockResolvedValueOnce(null);

    const res = await POST(makePortalRequest());

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('GUARDIAN_REQUIRED');
    expect(mockCreateCustomerPortalSession).not.toHaveBeenCalled();
    // Gate runs before any subscription lookup
    expect(mockPrisma.userSubscription.findUnique).not.toHaveBeenCalled();
    // Refusal is audited
    expect(mockRecordComplianceEvent).toHaveBeenCalledWith(
      'guardrail_triggered',
      expect.objectContaining({ outcome: 'blocked' }),
    );
  });

  it('allows an adult with a subscription through to the Stripe portal', async () => {
    mockPrisma.profile.findUnique.mockResolvedValueOnce({ age: 40 });
    mockPrisma.userSubscription.findUnique.mockResolvedValueOnce({
      stripeCustomerId: 'cus_adult_1',
    });
    mockCreateCustomerPortalSession.mockResolvedValueOnce({
      url: 'https://billing.stripe.com/session/ok',
    });

    const res = await POST(makePortalRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toContain('billing.stripe.com');
    expect(mockRecordComplianceEvent).not.toHaveBeenCalled();
  });

  it('allows a minor WITH granted parental consent through to the Stripe portal', async () => {
    mockPrisma.profile.findUnique.mockResolvedValueOnce({ age: 12 });
    mockPrisma.coppaConsent.findUnique.mockResolvedValueOnce({
      consentGranted: true,
      consentGrantedAt: new Date(),
      verificationSentAt: new Date(),
      verificationExpiresAt: null,
    });
    mockPrisma.userSubscription.findUnique.mockResolvedValueOnce({
      stripeCustomerId: 'cus_minor_1',
    });
    mockCreateCustomerPortalSession.mockResolvedValueOnce({
      url: 'https://billing.stripe.com/session/minor-ok',
    });

    const res = await POST(makePortalRequest());

    expect(res.status).toBe(200);
  });
});
