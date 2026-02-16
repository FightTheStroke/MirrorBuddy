import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  prisma: {
    funnelEvent: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/db';
import { hasStage, recordFunnelEvent, recordStageTransition } from '../index';

const mockCreate = vi.mocked(prisma.funnelEvent.create);
const mockFindFirst = vi.mocked(prisma.funnelEvent.findFirst);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('hasStage', () => {
  it('returns true when stage exists for userId', async () => {
    mockFindFirst.mockResolvedValueOnce({ id: 'evt-1' } as never);

    const result = await hasStage({ userId: 'user-1' }, 'FIRST_LOGIN');

    expect(result).toBe(true);
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { userId: 'user-1', stage: 'FIRST_LOGIN' },
      select: { id: true },
    });
  });

  it('returns false when stage does not exist', async () => {
    mockFindFirst.mockResolvedValueOnce(null);

    const result = await hasStage({ userId: 'user-1' }, 'ACTIVE');

    expect(result).toBe(false);
  });

  it('uses visitorId when userId is not provided', async () => {
    mockFindFirst.mockResolvedValueOnce({ id: 'evt-2' } as never);

    await hasStage({ visitorId: 'visitor-1' }, 'LIMIT_HIT');

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { visitorId: 'visitor-1', stage: 'LIMIT_HIT' },
      select: { id: true },
    });
  });
});

describe('recordFunnelEvent with locale', () => {
  it('includes locale in created record', async () => {
    mockCreate.mockResolvedValueOnce({} as never);

    await recordFunnelEvent({
      userId: 'user-1',
      stage: 'FIRST_LOGIN',
      locale: 'it',
    });

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        stage: 'FIRST_LOGIN',
        locale: 'it',
      }),
    });
  });

  it('omits locale when not provided', async () => {
    mockCreate.mockResolvedValueOnce({} as never);

    await recordFunnelEvent({
      userId: 'user-1',
      stage: 'ACTIVE',
    });

    const data = mockCreate.mock.calls[0][0].data;
    expect(data.locale).toBeUndefined();
  });
});

describe('recordStageTransition with locale', () => {
  it('passes locale through to recordFunnelEvent', async () => {
    mockFindFirst.mockResolvedValueOnce({ stage: 'APPROVED' } as never);
    mockCreate.mockResolvedValueOnce({} as never);

    await recordStageTransition({ userId: 'user-1' }, 'FIRST_LOGIN', { source: 'login' }, 'en');

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        stage: 'FIRST_LOGIN',
        fromStage: 'APPROVED',
        locale: 'en',
      }),
    });
  });
});
