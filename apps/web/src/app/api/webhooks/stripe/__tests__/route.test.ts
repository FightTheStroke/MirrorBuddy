/**
 * @vitest-environment node
 * Unit tests for Stripe Webhook Handler
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';

// Mock stripeService
const mockConstructWebhookEvent = vi.fn();
vi.mock('@/lib/stripe', () => ({
  stripeService: {
    constructWebhookEvent: (...args: unknown[]) => mockConstructWebhookEvent(...args),
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
vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});

import { prisma } from '@/lib/db';

function createWebhookRequest(body: string, signature: string | null): NextRequest {
  const headers = new Headers();
  if (signature) {
    headers.set('stripe-signature', signature);
  }
  return new NextRequest('http://localhost:3000/api/webhooks/stripe', {
    method: 'POST',
    body,
    headers,
  });
}

describe('POST /api/webhooks/stripe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signature verification', () => {
    it('returns 400 when signature is missing', async () => {
      const request = createWebhookRequest('{}', null);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing signature');
    });

    it('returns 400 when signature is invalid', async () => {
      mockConstructWebhookEvent.mockRejectedValueOnce(new Error('Invalid signature'));

      const request = createWebhookRequest('{}', 'invalid_sig');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid signature');
    });

    it('accepts valid signature', async () => {
      mockConstructWebhookEvent.mockResolvedValueOnce({
        id: 'evt_123',
        type: 'unknown.event',
        data: { object: {} },
      });

      const request = createWebhookRequest('{}', 'valid_sig');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
    });
  });

  describe('checkout.session.completed', () => {
    it('activates subscription for user', async () => {
      const mockTier = { id: 'tier_pro', code: 'pro' };
      vi.mocked(prisma.tierDefinition.findFirst).mockResolvedValueOnce(mockTier as never);
      vi.mocked(prisma.userSubscription.upsert).mockResolvedValueOnce({ id: 'sub_123' } as never);

      mockConstructWebhookEvent.mockResolvedValueOnce({
        id: 'evt_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_123',
            metadata: { userId: 'user_123' },
            customer: 'cus_123',
            subscription: 'sub_stripe_123',
            line_items: { data: [{ price: { id: 'price_pro' } }] },
          },
        },
      });

      const request = createWebhookRequest('{}', 'valid_sig');
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(prisma.tierDefinition.findFirst).toHaveBeenCalledWith({
        where: { stripePriceId: 'price_pro' },
      });
      expect(prisma.userSubscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user_123' },
          update: expect.objectContaining({
            tierId: 'tier_pro',
            status: 'ACTIVE',
          }),
        }),
      );
    });

    it('handles missing userId in metadata', async () => {
      mockConstructWebhookEvent.mockResolvedValueOnce({
        id: 'evt_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_123',
            metadata: {},
            client_reference_id: null,
          },
        },
      });

      const request = createWebhookRequest('{}', 'valid_sig');
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(prisma.userSubscription.upsert).not.toHaveBeenCalled();
    });

    it('handles missing tier for price ID', async () => {
      vi.mocked(prisma.tierDefinition.findFirst).mockResolvedValueOnce(null as never);

      mockConstructWebhookEvent.mockResolvedValueOnce({
        id: 'evt_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_123',
            metadata: { userId: 'user_123' },
            line_items: { data: [{ price: { id: 'price_unknown' } }] },
          },
        },
      });

      const request = createWebhookRequest('{}', 'valid_sig');
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(prisma.userSubscription.upsert).not.toHaveBeenCalled();
    });
  });

  describe('customer.subscription.updated', () => {
    it('updates subscription status to CANCELLED when canceled', async () => {
      vi.mocked(prisma.userSubscription.findFirst).mockResolvedValueOnce({
        id: 'sub_db_123',
        userId: 'user_123',
      } as never);
      vi.mocked(prisma.userSubscription.update).mockResolvedValueOnce({
        id: 'sub_db_123',
      } as never);

      mockConstructWebhookEvent.mockResolvedValueOnce({
        id: 'evt_123',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_stripe_123',
            customer: 'cus_123',
            status: 'canceled',
          },
        },
      });

      const request = createWebhookRequest('{}', 'valid_sig');
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(prisma.userSubscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'CANCELLED' },
        }),
      );
    });

    it('updates subscription status to PAUSED when paused', async () => {
      vi.mocked(prisma.userSubscription.findFirst).mockResolvedValueOnce({
        id: 'sub_db_123',
        userId: 'user_123',
      } as never);
      vi.mocked(prisma.userSubscription.update).mockResolvedValueOnce({
        id: 'sub_db_123',
      } as never);

      mockConstructWebhookEvent.mockResolvedValueOnce({
        id: 'evt_123',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_stripe_123',
            customer: 'cus_123',
            status: 'paused',
          },
        },
      });

      const request = createWebhookRequest('{}', 'valid_sig');
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(prisma.userSubscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'PAUSED' },
        }),
      );
    });

    it('handles unknown subscription', async () => {
      vi.mocked(prisma.userSubscription.findFirst).mockResolvedValueOnce(null as never);

      mockConstructWebhookEvent.mockResolvedValueOnce({
        id: 'evt_123',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_unknown',
            customer: 'cus_123',
            status: 'active',
          },
        },
      });

      const request = createWebhookRequest('{}', 'valid_sig');
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(prisma.userSubscription.update).not.toHaveBeenCalled();
    });
  });

  describe('customer.subscription.deleted', () => {
    it('downgrades user to Base tier', async () => {
      const mockUserSub = { id: 'sub_db_123', userId: 'user_123' };
      const mockBaseTier = { id: 'tier_base', code: 'base' };

      vi.mocked(prisma.userSubscription.findFirst).mockResolvedValueOnce(mockUserSub as never);
      vi.mocked(prisma.tierDefinition.findUnique).mockResolvedValueOnce(mockBaseTier as never);
      vi.mocked(prisma.userSubscription.update).mockResolvedValueOnce({
        id: 'sub_db_123',
      } as never);

      mockConstructWebhookEvent.mockResolvedValueOnce({
        id: 'evt_123',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_stripe_123',
            customer: 'cus_123',
          },
        },
      });

      const request = createWebhookRequest('{}', 'valid_sig');
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(prisma.tierDefinition.findUnique).toHaveBeenCalledWith({
        where: { code: 'base' },
      });
      expect(prisma.userSubscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tierId: 'tier_base',
            status: 'CANCELLED',
          }),
        }),
      );
    });

    it('handles missing base tier gracefully', async () => {
      vi.mocked(prisma.userSubscription.findFirst).mockResolvedValueOnce({
        id: 'sub_db_123',
      } as never);
      vi.mocked(prisma.tierDefinition.findUnique).mockResolvedValueOnce(null as never);

      mockConstructWebhookEvent.mockResolvedValueOnce({
        id: 'evt_123',
        type: 'customer.subscription.deleted',
        data: {
          object: { id: 'sub_stripe_123', customer: 'cus_123' },
        },
      });

      const request = createWebhookRequest('{}', 'valid_sig');
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(prisma.userSubscription.update).not.toHaveBeenCalled();
    });
  });

  describe('invoice.payment_failed', () => {
    it('sets 7-day grace period', async () => {
      vi.mocked(prisma.userSubscription.findFirst).mockResolvedValueOnce({
        id: 'sub_db_123',
        userId: 'user_123',
      } as never);
      vi.mocked(prisma.userSubscription.update).mockResolvedValueOnce({
        id: 'sub_db_123',
      } as never);

      mockConstructWebhookEvent.mockResolvedValueOnce({
        id: 'evt_123',
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'inv_123',
            customer: 'cus_123',
            subscription: 'sub_stripe_123',
            amount_due: 999,
          },
        },
      });

      const request = createWebhookRequest('{}', 'valid_sig');
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(prisma.userSubscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PAUSED',
            expiresAt: expect.any(Date),
          }),
        }),
      );
    });

    it('handles missing subscription ID', async () => {
      mockConstructWebhookEvent.mockResolvedValueOnce({
        id: 'evt_123',
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'inv_123',
            customer: 'cus_123',
            amount_due: 999,
          },
        },
      });

      const request = createWebhookRequest('{}', 'valid_sig');
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(prisma.userSubscription.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('returns 500 when handler throws', async () => {
      mockConstructWebhookEvent.mockResolvedValueOnce({
        id: 'evt_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_123',
            metadata: { userId: 'user_123' },
            line_items: { data: [{ price: { id: 'price_pro' } }] },
          },
        },
      });

      vi.mocked(prisma.tierDefinition.findFirst).mockRejectedValueOnce(new Error('Database error'));

      const request = createWebhookRequest('{}', 'valid_sig');
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Handler failed');
    });
  });
});
