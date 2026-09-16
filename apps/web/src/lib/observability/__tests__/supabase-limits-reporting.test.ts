/**
 * Reporting contract for failed Supabase monitoring queries.
 *
 * A failed monitoring query used to be reported twice: once by the query
 * helper and once by the metric source wrapper, as two unrelated production
 * problems. These tests pin a single report that still identifies which query
 * failed and preserves the driver error, including its SQLSTATE, for
 * attribution.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({ info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() }),
  },
}));

vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/db';
import { getSupabaseLimits } from '../supabase-limits';

describe('supabase monitoring query failures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports a failed monitoring query once, naming the query and keeping the driver error', async () => {
    const driverError = Object.assign(
      new Error('Connection terminated due to connection timeout'),
      { code: '08006' },
    );
    vi.mocked(prisma.$queryRaw).mockRejectedValue(driverError);

    const failure = await getSupabaseLimits().catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toBe('Supabase monitoring query failed: database_size');
    expect((failure as Error).cause).toBe(driverError);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('names the connection count query when that query is the one failing', async () => {
    vi.mocked(prisma.$queryRaw)
      .mockResolvedValueOnce([{ size: BigInt(1024) }] as never)
      .mockRejectedValueOnce(new Error('terminating connection due to administrator command'));

    const failure = await getSupabaseLimits().catch((error: unknown) => error);

    expect((failure as Error).message).toBe('Supabase monitoring query failed: connection_count');
    expect(logger.error).not.toHaveBeenCalled();
  });
});
