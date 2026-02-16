import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  prisma: {
    funnelEvent: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
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
import { processActiveUsers, processChurnedUsers, processBatchFunnelEvents } from '../batch-funnel';

const mockQueryRaw = vi.mocked(prisma.$queryRaw);
const mockFindFirst = vi.mocked(prisma.funnelEvent.findFirst);
const mockCreate = vi.mocked(prisma.funnelEvent.create);

beforeEach(() => {
  vi.clearAllMocks();
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
        user_key: 'user-1',
        stage: 'FIRST_LOGIN',
        last_activity: oldDate,
        is_user: true,
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
        user_key: 'user-1',
        stage: 'FIRST_LOGIN',
        last_activity: oldDate,
        is_user: true,
      },
    ]);
    mockFindFirst.mockResolvedValueOnce({ id: 'existing' } as never); // hasStage = true

    const count = await processChurnedUsers();

    expect(count).toBe(0);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('handles visitor-based identifiers', async () => {
    const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    mockQueryRaw.mockResolvedValueOnce([
      {
        user_key: 'visitor-abc',
        stage: 'TRIAL_ENGAGED',
        last_activity: oldDate,
        is_user: false,
      },
    ]);
    mockFindFirst.mockResolvedValueOnce(null); // hasStage = false
    mockFindFirst.mockResolvedValueOnce({ stage: 'TRIAL_ENGAGED' } as never); // getLatestStage
    mockCreate.mockResolvedValueOnce({} as never);

    const count = await processChurnedUsers();

    expect(count).toBe(1);
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        visitorId: 'visitor-abc',
        stage: 'CHURNED',
      }),
    });
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
