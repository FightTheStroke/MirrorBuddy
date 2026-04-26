/**
 * Unit tests for waitlist-service query functions (getByEmail, getStats)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});

vi.mock('@/lib/funnel', () => ({
  recordFunnelEvent: vi.fn(),
}));

vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/lib/email/templates/waitlist-templates', () => ({
  getVerificationTemplate: vi.fn().mockReturnValue({
    subject: 'Verify your email',
    html: '<p>Verify</p>',
    text: 'Verify',
  }),
  getVerifiedTemplate: vi.fn().mockReturnValue({
    subject: 'Welcome!',
    html: '<p>Welcome</p>',
    text: 'Welcome',
  }),
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

import { prisma } from '@/lib/db';
import { getByEmail, getStats } from '../waitlist-service';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getByEmail', () => {
  it('returns entry when found', async () => {
    const entry = { id: 'id', email: 'test@example.com' };
    vi.mocked(prisma.waitlistEntry.findUnique).mockResolvedValue(entry as any);

    const result = await getByEmail('test@example.com');
    expect(result).toEqual(entry);
  });

  it('returns null when not found', async () => {
    vi.mocked(prisma.waitlistEntry.findUnique).mockResolvedValue(null);

    const result = await getByEmail('notfound@example.com');
    expect(result).toBeNull();
  });
});

describe('getStats', () => {
  it('returns counts by status', async () => {
    vi.mocked(prisma.waitlistEntry.count)
      .mockResolvedValueOnce(100) // total
      .mockResolvedValueOnce(60) // verified
      .mockResolvedValueOnce(10) // unsubscribed
      .mockResolvedValueOnce(25); // converted (promoCode redeemed)

    const stats = await getStats();

    expect(stats).toMatchObject({
      total: 100,
      verified: 60,
      unsubscribed: 10,
      converted: 25,
    });
  });
});
