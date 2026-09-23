/**
 * Regression for #1170 / #1164 (Sentry MIRRORBUDDY-3G, -3F).
 *
 * The audit write ran as a detached promise. Once the request answered, Vercel
 * suspended the instance with the insert in flight: the pool connect timed out
 * on resume ("Failed to log PII decrypt access: timeout exceeded when trying to
 * connect") or the insert was measured at 698 s. The write must be registered
 * with waitUntil, and a query that decrypts many records must write once.
 *
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { waitUntil } from '@vercel/functions';
import { prisma } from '@/lib/db';

vi.mock('@vercel/functions', () => ({ waitUntil: vi.fn() }));
vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});
const logError = vi.hoisted(() => vi.fn());
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: logError, debug: vi.fn() }),
  },
}));

import { logDecryptAccess, logDecryptAccessBatch } from '../decrypt-audit';

describe('decrypt audit request lifecycle', () => {
  beforeEach(() => vi.clearAllMocks());

  it('keeps the instance alive until a single audit write settles', async () => {
    vi.mocked(prisma.complianceAuditEntry.create).mockResolvedValue({} as never);

    logDecryptAccess({ model: 'User', field: 'email' });

    expect(waitUntil).toHaveBeenCalledTimes(1);
    await vi.mocked(waitUntil).mock.calls[0][0];
    expect(prisma.complianceAuditEntry.create).toHaveBeenCalledTimes(1);
  });

  it('writes every entry of one query in a single statement', async () => {
    vi.mocked(prisma.complianceAuditEntry.createMany).mockResolvedValue({ count: 2 } as never);

    logDecryptAccessBatch([
      { model: 'User', field: 'email', context: { recordCount: 3 } },
      { model: 'Profile', field: 'name', context: { recordCount: 3 } },
    ]);

    expect(waitUntil).toHaveBeenCalledTimes(1);
    await vi.mocked(waitUntil).mock.calls[0][0];
    expect(prisma.complianceAuditEntry.create).not.toHaveBeenCalled();
    expect(prisma.complianceAuditEntry.createMany).toHaveBeenCalledTimes(1);
    const { data } = vi.mocked(prisma.complianceAuditEntry.createMany).mock.calls[0][0] as {
      data: Array<{ description: string; eventType: string; details: string }>;
    };
    expect(data.map((row) => row.description)).toEqual([
      'PII field decrypted: User.email',
      'PII field decrypted: Profile.name',
    ]);
    expect(data.every((row) => row.eventType === 'data_access')).toBe(true);
    expect(JSON.parse(data[0].details)).toMatchObject({ recordCount: 3, accessor: 'system' });
  });

  it('still reports a failed audit write as an error', async () => {
    vi.mocked(prisma.complianceAuditEntry.createMany).mockRejectedValue(new Error('db down'));

    logDecryptAccessBatch([{ model: 'User', field: 'email' }]);
    await vi.mocked(waitUntil).mock.calls[0][0];

    expect(logError).toHaveBeenCalledWith(
      'Failed to log PII decrypt access',
      expect.objectContaining({ entries: 1, error: 'db down' }),
    );
  });

  it('writes nothing for an empty batch', () => {
    logDecryptAccessBatch([]);
    expect(waitUntil).not.toHaveBeenCalled();
  });
});
