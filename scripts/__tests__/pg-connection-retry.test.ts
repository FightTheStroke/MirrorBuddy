/**
 * Transient connection retry tests
 *
 * On 22 Sep 2026 the Supabase pooler answered `{:error, :nxdomain}` for about
 * seven minutes while Postgres itself had been up for 237 days. Every client
 * that touched the database in that window failed at once, including the
 * promotion gate, which turned a provider blip into a blocked release.
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi } from 'vitest';
import { isTransientConnectionError, connectWithRetry } from '../lib/pg-connection';

describe('isTransientConnectionError', () => {
  it.each([
    'Failed to connect to database: {:error, :nxdomain}',
    'Failed to connect to database: {:error, :db_connection}',
    'Connection terminated unexpectedly',
    'Connection terminated due to connection timeout',
    'timeout expired',
    'connect ETIMEDOUT 10.0.0.1:5432',
    'read ECONNRESET',
    'getaddrinfo EAI_AGAIN aws-1-eu-west-1.pooler.supabase.com',
  ])('treats "%s" as worth retrying', (message) => {
    expect(isTransientConnectionError(new Error(message))).toBe(true);
  });

  it.each([
    'password authentication failed for user "postgres"',
    'relation "_prisma_migrations" does not exist',
    'permission denied for table User',
  ])('does not retry "%s"', (message) => {
    expect(isTransientConnectionError(new Error(message))).toBe(false);
  });

  it('does not retry a non-error value', () => {
    expect(isTransientConnectionError('nxdomain')).toBe(false);
  });
});

describe('connectWithRetry', () => {
  it('returns the client on the first successful connect', async () => {
    const client = { connect: vi.fn().mockResolvedValue(undefined) };
    const make = vi.fn().mockReturnValue(client);

    const result = await connectWithRetry(make as never, { attempts: 3, delayMs: 0 });

    expect(result).toBe(client);
    expect(make).toHaveBeenCalledTimes(1);
  });

  it('retries a transient failure with a fresh client and succeeds', async () => {
    const failing = {
      connect: vi
        .fn()
        .mockRejectedValue(new Error('Failed to connect to database: {:error, :nxdomain}')),
      end: vi.fn().mockResolvedValue(undefined),
    };
    const working = { connect: vi.fn().mockResolvedValue(undefined) };
    const make = vi.fn().mockReturnValueOnce(failing).mockReturnValueOnce(working);
    const sleep = vi.fn().mockResolvedValue(undefined);

    const result = await connectWithRetry(make as never, { attempts: 3, delayMs: 500, sleep });

    expect(result).toBe(working);
    expect(make).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(500);
    // A half-open client left behind would hold a socket for the whole run.
    expect(failing.end).toHaveBeenCalled();
  });

  it('gives up after the last attempt and rethrows the transient error', async () => {
    const error = new Error('Connection terminated unexpectedly');
    const make = vi.fn(() => ({
      connect: vi.fn().mockRejectedValue(error),
      end: vi.fn().mockResolvedValue(undefined),
    }));

    await expect(
      connectWithRetry(make as never, { attempts: 2, delayMs: 0, sleep: async () => undefined }),
    ).rejects.toThrow('Connection terminated unexpectedly');
    expect(make).toHaveBeenCalledTimes(2);
  });

  it('fails immediately on a credential error instead of hammering the database', async () => {
    const make = vi.fn(() => ({
      connect: vi
        .fn()
        .mockRejectedValue(new Error('password authentication failed for user "postgres"')),
      end: vi.fn().mockResolvedValue(undefined),
    }));

    await expect(
      connectWithRetry(make as never, { attempts: 5, delayMs: 0, sleep: async () => undefined }),
    ).rejects.toThrow('password authentication failed');
    expect(make).toHaveBeenCalledTimes(1);
  });

  it('backs off progressively so a restarting pooler is given time', async () => {
    const delays: number[] = [];
    const make = vi.fn(() => ({
      connect: vi.fn().mockRejectedValue(new Error('timeout expired')),
      end: vi.fn().mockResolvedValue(undefined),
    }));

    await expect(
      connectWithRetry(make as never, {
        attempts: 4,
        delayMs: 100,
        sleep: async (ms: number) => {
          delays.push(ms);
        },
      }),
    ).rejects.toThrow('timeout expired');

    expect(delays).toEqual([100, 200, 300]);
  });
});
