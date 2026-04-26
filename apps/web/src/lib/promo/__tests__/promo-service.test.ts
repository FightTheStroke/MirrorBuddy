/**
 * Unit tests for promo-service
 *
 * Covers:
 * 1. validateCode returns valid entry for unused code
 * 2. validateCode rejects already-redeemed code
 * 3. validateCode rejects non-existent code
 * 4. redeemCode creates UserSubscription with Pro tier +30 days
 * 5. redeemCode rejects if user has active Stripe subscription (non-combinable)
 * 6. redeemCode is transactional (WaitlistEntry + UserSubscription updated atomically)
 * 7. redeemCode logs to TierAuditLog
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma BEFORE importing service
vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  },
}));

import { prisma } from '@/lib/db';
import { validateCode, redeemCode } from '../promo-service';

// Re-typed mock accessors
const mockPrisma = prisma as unknown as {
  waitlistEntry: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  userSubscription: {
    findUnique: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
  };
  tierDefinition: { findUnique: ReturnType<typeof vi.fn> };
  tierAuditLog: { create: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

const VALID_ENTRY = {
  id: 'entry-1',
  email: 'test@example.com',
  promoCode: 'ABC12345',
  promoRedeemedAt: null,
  convertedUserId: null,
  verifiedAt: new Date(),
};

const PRO_TIER = { id: 'tier-pro', code: 'PRO' };

// ---------------------------------------------------------------------------
// validateCode
// ---------------------------------------------------------------------------

describe('validateCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns valid entry for unused code', async () => {
    mockPrisma.waitlistEntry.findUnique.mockResolvedValue(VALID_ENTRY);

    const result = await validateCode('ABC12345');

    expect(result.valid).toBe(true);
    expect(result.entry).toMatchObject({ id: 'entry-1', promoCode: 'ABC12345' });
    expect(mockPrisma.waitlistEntry.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { promoCode: 'ABC12345' } }),
    );
  });

  it('rejects already-redeemed code (valid=false, reason=ALREADY_REDEEMED)', async () => {
    mockPrisma.waitlistEntry.findUnique.mockResolvedValue({
      ...VALID_ENTRY,
      promoRedeemedAt: new Date(),
    });

    const result = await validateCode('ABC12345');

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('ALREADY_REDEEMED');
  });

  it('rejects non-existent code (valid=false, reason=NOT_FOUND)', async () => {
    mockPrisma.waitlistEntry.findUnique.mockResolvedValue(null);

    const result = await validateCode('NOTEXIST');

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// redeemCode
// ---------------------------------------------------------------------------

describe('redeemCode', () => {
  // tx mock shared across tests in this describe block
  let txMock: {
    waitlistEntry: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
    userSubscription: {
      findUnique: ReturnType<typeof vi.fn>;
      upsert: ReturnType<typeof vi.fn>;
    };
    tierDefinition: { findUnique: ReturnType<typeof vi.fn> };
    tierAuditLog: { create: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    txMock = {
      waitlistEntry: { findUnique: vi.fn(), update: vi.fn() },
      userSubscription: { findUnique: vi.fn(), upsert: vi.fn() },
      tierDefinition: { findUnique: vi.fn() },
      tierAuditLog: { create: vi.fn() },
    };

    // $transaction executes callback with our controlled tx
    mockPrisma.$transaction.mockImplementation((fn: (tx: typeof txMock) => Promise<unknown>) =>
      fn(txMock),
    );

    // Default happy-path mocks on tx
    txMock.tierDefinition.findUnique.mockResolvedValue(PRO_TIER);
    txMock.waitlistEntry.findUnique.mockResolvedValue(VALID_ENTRY);
    txMock.userSubscription.findUnique.mockResolvedValue(null); // no active Stripe sub
    txMock.waitlistEntry.update.mockResolvedValue({
      ...VALID_ENTRY,
      promoRedeemedAt: new Date(),
      convertedUserId: 'user-123',
    });
    txMock.userSubscription.upsert.mockResolvedValue({
      id: 'sub-1',
      userId: 'user-123',
      tierId: 'tier-pro',
      status: 'ACTIVE',
    });
    txMock.tierAuditLog.create.mockResolvedValue({ id: 'log-1' });
  });

  it('creates UserSubscription with Pro tier +30 days', async () => {
    const result = await redeemCode('ABC12345', 'user-123');

    expect(result.success).toBe(true);
    expect(txMock.userSubscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-123' },
        create: expect.objectContaining({
          userId: 'user-123',
          tierId: 'tier-pro',
          status: 'ACTIVE',
        }),
      }),
    );

    // expiresAt should be roughly now + 30 days
    const upsertCall = txMock.userSubscription.upsert.mock.calls[0][0];
    const expiresAt: Date = upsertCall.create.expiresAt;
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now() + thirtyDaysMs - 10000);
    expect(expiresAt.getTime()).toBeLessThan(Date.now() + thirtyDaysMs + 10000);
  });

  it('rejects if user has active Stripe subscription (non-combinable)', async () => {
    txMock.userSubscription.findUnique.mockResolvedValue({
      id: 'sub-existing',
      userId: 'user-123',
      stripeSubscriptionId: 'sub_stripe123',
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    await expect(redeemCode('ABC12345', 'user-123')).rejects.toThrow(
      /PROMO_STRIPE_CONFLICT|stripe.*subscription|already.*subscri|non-combinable/i,
    );
  });

  it('is transactional - WaitlistEntry and UserSubscription updated atomically', async () => {
    await redeemCode('ABC12345', 'user-123');

    // Both operations must go through the same transaction
    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    expect(txMock.waitlistEntry.update).toHaveBeenCalledOnce();
    expect(txMock.userSubscription.upsert).toHaveBeenCalledOnce();

    // WaitlistEntry marked redeemed with convertedUserId
    expect(txMock.waitlistEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { promoCode: 'ABC12345' },
        data: expect.objectContaining({
          promoRedeemedAt: expect.any(Date),
          convertedUserId: 'user-123',
        }),
      }),
    );
  });

  it('logs to TierAuditLog after redemption', async () => {
    await redeemCode('ABC12345', 'user-123');

    expect(txMock.tierAuditLog.create).toHaveBeenCalledOnce();
    expect(txMock.tierAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-123',
          action: expect.stringMatching(/promo|redeem|PROMO/i),
        }),
      }),
    );
  });
});
