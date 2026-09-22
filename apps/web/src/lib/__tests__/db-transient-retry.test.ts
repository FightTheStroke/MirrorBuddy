/**
 * App-side retry for a database that is briefly unreachable.
 *
 * On 22 Sep 2026 the Supabase pooler answered `{:error, :nxdomain}` from 10:44Z
 * to 10:51Z. Postgres had been up for 237 days and was serving 12 of its 60
 * connections: nothing was overloaded and nothing restarted, the path in front
 * of the database disappeared. Every request in that window returned an error
 * to a child instead of waiting a second for the path to come back.
 *
 * The retry is deliberately narrow. Masking a real outage would be worse than
 * the outage: a failure that repeats stays visible, and each retry is logged.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { warn, error } = vi.hoisted(() => ({ warn: vi.fn(), error: vi.fn() }));

vi.mock('@mirrorbuddy/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn,
    error,
    child: () => ({ debug: vi.fn(), info: vi.fn(), warn, error }),
  },
}));

vi.mock('@prisma/client', () => ({
  Prisma: { defineExtension: (ext: unknown) => ext },
}));

import {
  isTransientDatabaseError,
  isRetryableOperation,
  createTransientRetry,
} from '../../../../../packages/db/src/transient-retry';

interface RetryExtension {
  query: { $allModels: { $allOperations: (params: unknown) => Promise<unknown> } };
}

const CONNECT_FAILURES = [
  'Failed to connect to database: {:error, :nxdomain}',
  'Failed to connect to database: {:error, :db_connection}',
  'Timed out fetching a new connection from the connection pool',
  'connect ETIMEDOUT 10.0.0.1:5432',
  'connect EHOSTUNREACH 2a05:d018::1:5432',
  'getaddrinfo EAI_AGAIN aws-1-eu-west-1.pooler.supabase.com',
];

describe('isTransientDatabaseError', () => {
  it.each(CONNECT_FAILURES)('recognises "%s" as the database being unreachable', (message) => {
    expect(isTransientDatabaseError(new Error(message))).toBe(true);
  });

  it.each([
    'Unique constraint failed on the fields: (`email`)',
    'relation "User" does not exist',
    'permission denied for table Material',
  ])('leaves "%s" alone', (message) => {
    expect(isTransientDatabaseError(new Error(message))).toBe(false);
  });

  it('ignores a non-error value', () => {
    expect(isTransientDatabaseError({ message: 'nxdomain' })).toBe(false);
  });
});

describe('isRetryableOperation', () => {
  it.each(['findUnique', 'findMany', 'findFirst', 'count', 'aggregate', 'groupBy'])(
    'retries the read %s',
    (operation) => {
      expect(isRetryableOperation(operation)).toBe(true);
    },
  );

  it.each(['create', 'update', 'delete', 'upsert', 'createMany', 'executeRaw'])(
    'never replays the write %s, which may already have reached the database',
    (operation) => {
      expect(isRetryableOperation(operation)).toBe(false);
    },
  );
});

describe('createTransientRetry', () => {
  const run = async (query: () => Promise<unknown>, operation = 'findMany') => {
    const ext = createTransientRetry({ delaysMs: [0, 0] }) as unknown as RetryExtension;
    return ext.query.$allModels.$allOperations({
      model: 'User',
      operation,
      args: {},
      query,
    });
  };

  beforeEach(() => {
    warn.mockClear();
    error.mockClear();
  });

  it('returns the result untouched when the database answers', async () => {
    const query = vi.fn().mockResolvedValue([{ id: 'u1' }]);
    await expect(run(query)).resolves.toEqual([{ id: 'u1' }]);
    expect(query).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
  });

  it('retries a read that hit the pooler blip and succeeds', async () => {
    const query = vi
      .fn()
      .mockRejectedValueOnce(new Error('Failed to connect to database: {:error, :nxdomain}'))
      .mockResolvedValue([{ id: 'u1' }]);

    await expect(run(query)).resolves.toEqual([{ id: 'u1' }]);
    expect(query).toHaveBeenCalledTimes(2);
    // A silent retry would hide an outage that is getting worse.
    expect(warn).toHaveBeenCalled();
  });

  it('gives up after the configured attempts and reports the outage', async () => {
    const query = vi
      .fn()
      .mockRejectedValue(new Error('Failed to connect to database: {:error, :nxdomain}'));

    await expect(run(query)).rejects.toThrow('nxdomain');
    expect(query).toHaveBeenCalledTimes(3);
    expect(error).toHaveBeenCalled();
  });

  it('does not retry a write, so a create is never applied twice', async () => {
    const query = vi
      .fn()
      .mockRejectedValue(new Error('Failed to connect to database: {:error, :nxdomain}'));

    await expect(run(query, 'create')).rejects.toThrow('nxdomain');
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('does not retry a genuine query error', async () => {
    const query = vi.fn().mockRejectedValue(new Error('Unique constraint failed'));

    await expect(run(query)).rejects.toThrow('Unique constraint failed');
    expect(query).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
  });

  it('waits between attempts instead of hammering a database that is coming back', async () => {
    const waits: number[] = [];
    const ext = createTransientRetry({
      delaysMs: [200, 600],
      sleep: async (ms: number) => {
        waits.push(ms);
      },
    }) as unknown as RetryExtension;

    const query = vi.fn().mockRejectedValue(new Error('connect ETIMEDOUT 10.0.0.1:5432'));

    await expect(
      ext.query.$allModels.$allOperations({ model: 'User', operation: 'count', args: {}, query }),
    ).rejects.toThrow('ETIMEDOUT');
    expect(waits).toEqual([200, 600]);
  });

  it('stops retrying once the failure itself has eaten the time budget', async () => {
    // A 10s connect timeout retried three times is a 31s hang: measured on
    // 22 Sep against an unroutable host before this budget existed.
    let clock = 0;
    const ext = createTransientRetry({
      delaysMs: [0, 0],
      budgetMs: 3000,
      sleep: async () => undefined,
      now: () => clock,
    }) as unknown as RetryExtension;

    const query = vi.fn().mockImplementation(async () => {
      clock += 10_000;
      throw new Error('Connection terminated due to connection timeout');
    });

    await expect(
      ext.query.$allModels.$allOperations({ model: 'User', operation: 'count', args: {}, query }),
    ).rejects.toThrow('connection timeout');
    expect(query).toHaveBeenCalledTimes(1);
    // The log must say one attempt, not the three that were budgeted for.
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('still unreachable'),
      expect.objectContaining({ attempts: 1 }),
    );
  });

  it('still retries the fast failure the budget is meant to allow', async () => {
    let clock = 0;
    const ext = createTransientRetry({
      delaysMs: [0, 0],
      budgetMs: 3000,
      sleep: async () => undefined,
      now: () => clock,
    }) as unknown as RetryExtension;

    const query = vi
      .fn()
      .mockImplementationOnce(async () => {
        clock += 200;
        throw new Error('Failed to connect to database: {:error, :nxdomain}');
      })
      .mockResolvedValue(7);

    await expect(
      ext.query.$allModels.$allOperations({ model: 'User', operation: 'count', args: {}, query }),
    ).resolves.toBe(7);
    expect(query).toHaveBeenCalledTimes(2);
  });
});
