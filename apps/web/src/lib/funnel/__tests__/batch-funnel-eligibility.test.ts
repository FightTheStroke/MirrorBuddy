/**
 * Regression for #1159 (Sentry MIRRORBUDDY-3B, N+1 on /api/cron/metrics-push).
 *
 * Every opted-in user of a consent page cost one Profile query (and one
 * CoppaConsent query under the COPPA age): the cron repeated
 * `SELECT id, age FROM Profile WHERE userId = $1` per user. A page now costs one
 * Profile query and at most one guardian-consent query, with the same policy.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

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
import { processActiveUsers } from '../batch-funnel';
import { analyticsConsentFixture } from '@/lib/telemetry/__tests__/analytics-fixtures';

const optedIn = JSON.stringify({ consent: analyticsConsentFixture });

describe('batch funnel consent eligibility', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(prisma.settings.findMany).mockResolvedValue(
      ['adult', 'child-ok', 'child-no', 'unknown-age', 'no-optin'].map((userId) => ({
        userId,
        azureCostConfig: userId === 'no-optin' ? null : optedIn,
      })) as never,
    );
    vi.mocked(prisma.profile.findMany).mockResolvedValue([
      { userId: 'adult', age: 30 },
      { userId: 'child-ok', age: 10 },
      { userId: 'child-no', age: 9 },
      { userId: 'unknown-age', age: null },
    ] as never);
    vi.mocked(prisma.coppaConsent.findMany).mockResolvedValue([{ userId: 'child-ok' }] as never);
    vi.mocked(prisma.$queryRaw).mockResolvedValue([] as never);
  });

  it('checks a whole consent page with one profile and one guardian query', async () => {
    await processActiveUsers();

    expect(prisma.profile.findUnique).not.toHaveBeenCalled();
    expect(prisma.coppaConsent.findUnique).not.toHaveBeenCalled();
    expect(prisma.profile.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.coppaConsent.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.coppaConsent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: { in: ['child-ok', 'child-no'] }, consentGranted: true },
      }),
    );
  });

  it('keeps the same policy: adults, and minors with guardian consent, only', async () => {
    await processActiveUsers();

    const sql = vi.mocked(prisma.$queryRaw).mock.calls[0];
    const permitted = sql
      .slice(1)
      .flatMap((value) =>
        value && typeof value === 'object' && 'values' in value
          ? (value as { values: unknown[] }).values
          : [value],
      );
    expect(permitted).toEqual(expect.arrayContaining(['adult', 'child-ok']));
    expect(permitted).not.toContain('child-no');
    expect(permitted).not.toContain('unknown-age');
    expect(permitted).not.toContain('no-optin');
  });
});
