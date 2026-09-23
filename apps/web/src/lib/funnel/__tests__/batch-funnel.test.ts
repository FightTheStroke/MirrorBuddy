import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Prisma } from '@prisma/client';

type ConsentSettings = Prisma.SettingsGetPayload<{
  select: { userId: true; azureCostConfig: true };
}>;
const mockSettingsFindMany = vi.hoisted(() =>
  vi.fn<(args?: Prisma.SettingsFindManyArgs) => Promise<ConsentSettings[]>>(),
);

vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  const mock = createMockPrisma();
  return {
    prisma: {
      ...mock,
      settings: { ...mock.settings, findMany: mockSettingsFindMany },
    },
  };
});

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
import { processActiveUsers, processChurnedUsers, processBatchFunnelEvents } from '../batch-funnel';
import {
  analyticsConsentFixture,
  permitOptionalAnalytics,
} from '@/lib/telemetry/__tests__/analytics-fixtures';

const mockQueryRaw = vi.mocked(prisma.$queryRaw);
const mockFindFirst = vi.mocked(prisma.funnelEvent.findFirst);
const mockCreate = vi.mocked(prisma.funnelEvent.create);

beforeEach(() => {
  vi.resetAllMocks();
  permitOptionalAnalytics();
  vi.mocked(prisma.profile.findMany).mockResolvedValue([{ userId: 'user-1', age: 18 }] as never);
  mockSettingsFindMany.mockResolvedValue([
    {
      userId: 'user-1',
      azureCostConfig: JSON.stringify({ consent: analyticsConsentFixture }),
    },
  ]);
});

describe('processActiveUsers', () => {
  it('records ACTIVE for users with >= 3 sessions in 7 days', async () => {
    mockQueryRaw.mockResolvedValueOnce([{ userId: 'user-1', sessionCount: BigInt(5) }]);
    mockFindFirst.mockResolvedValueOnce(null); // hasStage = false
    mockFindFirst.mockResolvedValueOnce({ stage: 'FIRST_LOGIN' } as never); // getLatestStage
    mockCreate.mockResolvedValueOnce({} as never);

    const count = await processActiveUsers();

    expect(count).toBe(1);
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        stage: 'ACTIVE',
      }),
    });
  });

  it('skips users already marked ACTIVE', async () => {
    mockQueryRaw.mockResolvedValueOnce([{ userId: 'user-1', sessionCount: BigInt(5) }]);
    mockFindFirst.mockResolvedValueOnce({ id: 'existing' } as never); // hasStage = true

    const count = await processActiveUsers();

    expect(count).toBe(0);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('handles empty results', async () => {
    mockQueryRaw.mockResolvedValueOnce([]);

    const count = await processActiveUsers();

    expect(count).toBe(0);
  });
});

describe('processChurnedUsers', () => {
  it('records CHURNED for inactive users', async () => {
    const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    mockQueryRaw.mockResolvedValueOnce([
      {
        userId: 'user-1',
        stage: 'FIRST_LOGIN',
        last_activity: oldDate,
      },
    ]);
    mockFindFirst.mockResolvedValueOnce(null); // hasStage = false
    mockFindFirst.mockResolvedValueOnce({ stage: 'FIRST_LOGIN' } as never); // getLatestStage
    mockCreate.mockResolvedValueOnce({} as never);

    const count = await processChurnedUsers();

    expect(count).toBe(1);
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        stage: 'CHURNED',
      }),
    });
  });

  it('skips users already marked CHURNED', async () => {
    const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    mockQueryRaw.mockResolvedValueOnce([
      {
        userId: 'user-1',
        stage: 'FIRST_LOGIN',
        last_activity: oldDate,
      },
    ]);
    mockFindFirst.mockResolvedValueOnce({ id: 'existing' } as never); // hasStage = true

    const count = await processChurnedUsers();

    expect(count).toBe(0);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('does not profile visitor-only identifiers without age/consent evidence', async () => {
    mockSettingsFindMany.mockResolvedValue([]);

    const count = await processChurnedUsers();

    expect(count).toBe(0);
    expect(mockQueryRaw).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe('processBatchFunnelEvents', () => {
  it('aggregates results from active and churned processing', async () => {
    // ACTIVE query
    mockQueryRaw.mockResolvedValueOnce([{ userId: 'user-1', sessionCount: BigInt(4) }]);
    mockFindFirst.mockResolvedValueOnce(null); // hasStage ACTIVE
    mockFindFirst.mockResolvedValueOnce(null); // getLatestStage
    mockCreate.mockResolvedValueOnce({} as never);

    // CHURNED query
    mockQueryRaw.mockResolvedValueOnce([]);

    const result = await processBatchFunnelEvents();

    expect(result.activeRecorded).toBe(1);
    expect(result.churnedRecorded).toBe(0);
    expect(result.errors).toBe(0);
  });
});
