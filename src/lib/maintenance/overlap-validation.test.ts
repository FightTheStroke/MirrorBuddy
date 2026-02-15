import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFindFirst } = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: {
    maintenanceWindow: {
      findFirst: mockFindFirst,
    },
  },
}));

import { checkOverlap } from './overlap-validation';

describe('overlap-validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns overlaps=false when there is no conflicting window', async () => {
    mockFindFirst.mockResolvedValueOnce(null);

    const result = await checkOverlap(
      new Date('2026-03-01T10:00:00.000Z'),
      new Date('2026-03-01T11:00:00.000Z'),
    );

    expect(result).toEqual({ overlaps: false });
  });

  it('returns overlaps=true when there is a full overlap', async () => {
    const conflictingWindow = {
      id: 'mw-full',
      startTime: new Date('2026-03-01T10:00:00.000Z'),
      endTime: new Date('2026-03-01T12:00:00.000Z'),
      cancelled: false,
      isActive: false,
      message: 'Planned maintenance',
      severity: 'medium',
      estimatedMinutes: 120,
      createdBy: 'admin-1',
      createdAt: new Date('2026-03-01T09:00:00.000Z'),
      updatedAt: new Date('2026-03-01T09:00:00.000Z'),
    };
    mockFindFirst.mockResolvedValueOnce(conflictingWindow);

    const result = await checkOverlap(
      new Date('2026-03-01T10:15:00.000Z'),
      new Date('2026-03-01T11:45:00.000Z'),
    );

    expect(result).toEqual({ overlaps: true, conflictingWindow });
  });

  it('returns overlaps=true on partial overlap', async () => {
    const conflictingWindow = {
      id: 'mw-partial',
      startTime: new Date('2026-03-01T10:30:00.000Z'),
      endTime: new Date('2026-03-01T11:30:00.000Z'),
      cancelled: false,
      isActive: false,
      message: 'Another maintenance window',
      severity: 'high',
      estimatedMinutes: 60,
      createdBy: 'admin-2',
      createdAt: new Date('2026-03-01T09:30:00.000Z'),
      updatedAt: new Date('2026-03-01T09:30:00.000Z'),
    };
    mockFindFirst.mockResolvedValueOnce(conflictingWindow);

    const result = await checkOverlap(
      new Date('2026-03-01T10:00:00.000Z'),
      new Date('2026-03-01T11:00:00.000Z'),
    );

    expect(result).toEqual({ overlaps: true, conflictingWindow });
  });

  it('uses strict range boundaries so adjacent windows are allowed', async () => {
    mockFindFirst.mockResolvedValueOnce(null);
    const startTime = new Date('2026-03-01T11:00:00.000Z');
    const endTime = new Date('2026-03-01T12:00:00.000Z');

    await checkOverlap(startTime, endTime);

    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        }),
      }),
    );
  });

  it('excludes the same window when excludeId is provided', async () => {
    mockFindFirst.mockResolvedValueOnce(null);
    const excludeId = 'mw-same-id';

    await checkOverlap(
      new Date('2026-03-01T10:00:00.000Z'),
      new Date('2026-03-01T11:00:00.000Z'),
      excludeId,
    );

    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          NOT: { id: excludeId },
        }),
      }),
    );
  });
});
