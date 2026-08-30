import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const findMany = vi.fn();

vi.mock('@/lib/db', () => ({
  prisma: { user: { findMany: (...args: unknown[]) => findMany(...args) } },
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

import { getAdminRecipients } from '../admin-recipients';

const ORIGINAL = process.env.ADMIN_EMAIL;

beforeEach(() => {
  findMany.mockReset();
  process.env.ADMIN_EMAIL = 'configured@example.org';
});

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.ADMIN_EMAIL;
  else process.env.ADMIN_EMAIL = ORIGINAL;
});

describe('getAdminRecipients', () => {
  it('returns every administrator recorded in the database', async () => {
    findMany.mockResolvedValue([{ email: 'one@example.org' }, { email: 'two@example.org' }]);

    const recipients = await getAdminRecipients();

    expect(recipients).toContain('one@example.org');
    expect(recipients).toContain('two@example.org');
  });

  it('asks only for active, non-test administrators', async () => {
    findMany.mockResolvedValue([]);

    await getAdminRecipients();

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { role: 'ADMIN', disabled: false, isTestData: false },
      }),
    );
  });

  it('always keeps the configured address reachable', async () => {
    findMany.mockResolvedValue([{ email: 'one@example.org' }]);

    expect(await getAdminRecipients()).toContain('configured@example.org');
  });

  it('never sends the same person twice', async () => {
    findMany.mockResolvedValue([
      { email: 'Configured@Example.org' },
      { email: 'configured@example.org' },
    ]);

    expect(await getAdminRecipients()).toEqual(['configured@example.org']);
  });

  it('drops rows with no usable address instead of emailing null', async () => {
    findMany.mockResolvedValue([
      { email: null },
      { email: 'not-an-address' },
      { email: 'good@example.org' },
    ]);

    const recipients = await getAdminRecipients();

    expect(recipients).toEqual(['good@example.org', 'configured@example.org']);
  });

  it('falls back to the configured address when the database is unreachable', async () => {
    findMany.mockRejectedValue(new Error('connection refused'));

    expect(await getAdminRecipients()).toEqual(['configured@example.org']);
  });

  it('returns empty rather than throwing when nothing is configured at all', async () => {
    delete process.env.ADMIN_EMAIL;
    findMany.mockResolvedValue([]);

    expect(await getAdminRecipients()).toEqual([]);
  });
});
