/**
 * Regression for #1163 (Sentry MIRRORBUDDY-37, "[SlowQuery] WARN").
 *
 * After the fixes of #1157/#1170 the only remaining WARN was exactly one event
 * per new server instance (10 of 10 instances, 2026-09-23 13:35-15:25 UTC): its
 * first query, 1.0-1.45 s, while warm queries take ~20-170 ms. The first query
 * of a process also pays one-time startup (Prisma engine initialisation plus
 * the first TLS/pooler connection): measured locally 67 ms cold vs 0.5 ms warm,
 * connection only ~10 ms of it. Queries started before the stack is warm are
 * logged, not alerted, unless they cross the CRITICAL threshold; warm queries
 * keep the exact previous thresholds.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

const logger = vi.hoisted(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }));
vi.mock('@mirrorbuddy/logger', () => ({ logger }));

type Operation = (ctx: {
  model: string;
  operation: string;
  args: Record<string, unknown>;
  query: (args: unknown) => Promise<unknown>;
}) => Promise<unknown>;

let now = 0;

async function loadMonitor(): Promise<Operation> {
  vi.resetModules();
  vi.spyOn(Prisma, 'defineExtension').mockImplementation(((config: unknown) => config) as never);
  const { createSlowQueryMonitor } =
    await import('../../../../../../packages/db/src/slow-query-monitor');
  const monitor = createSlowQueryMonitor() as unknown as {
    query: { $allModels: { $allOperations: Operation } };
  };
  return monitor.query.$allModels.$allOperations;
}

function query(run: Operation, costMs: number, fail = false) {
  return run({
    model: 'GlobalConfig',
    operation: 'findUnique',
    args: { where: { id: 'global' } },
    query: async () => {
      now += costMs;
      if (fail) throw new Error('db down');
      return { id: 'global' };
    },
  });
}

describe('slow query monitor: one-time startup of a new instance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
  });

  it('logs the first query of a new instance instead of alerting on its startup time', async () => {
    const run = await loadMonitor();

    await query(run, 1446);

    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      '[SlowQuery] Cold start',
      expect.objectContaining({ durationMs: 1446, coldStart: true, model: 'GlobalConfig' }),
    );
  });

  it('still raises CRITICAL when the first query is truly slow', async () => {
    const run = await loadMonitor();

    await query(run, 3200);

    expect(logger.error).toHaveBeenCalledExactlyOnceWith(
      '[SlowQuery] CRITICAL',
      expect.objectContaining({ durationMs: 3200, coldStart: true }),
    );
  });

  it('keeps the previous WARN threshold for every query once the instance is warm', async () => {
    const run = await loadMonitor();
    await query(run, 1100);

    await query(run, 1001);

    expect(logger.warn).toHaveBeenCalledExactlyOnceWith(
      '[SlowQuery] WARN',
      expect.objectContaining({ durationMs: 1001, coldStart: false }),
    );
  });

  it('treats queries started concurrently with the first one as startup too', async () => {
    const run = await loadMonitor();

    await Promise.all([query(run, 1200), query(run, 1100)]);

    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('stays in startup until a query succeeds, so a failed first query does not warm it', async () => {
    const run = await loadMonitor();
    await expect(query(run, 50, true)).rejects.toThrow('db down');

    await query(run, 1300);

    expect(logger.warn).not.toHaveBeenCalled();
    await query(run, 1300);
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });
});
