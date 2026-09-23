import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { waitUntil } from '@vercel/functions';

vi.mock('@vercel/functions', () => ({ waitUntil: vi.fn() }));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  },
}));

vi.mock('@/lib/db', async () => {
  const { createMockPrisma } = await import('@/test/mocks/prisma');
  return { prisma: createMockPrisma() };
});

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/db';
import {
  isFeatureEnabled,
  initializeFlags,
  isUsingFallbackDefaults,
  _resetForTesting,
  reloadFlags,
  updateFlag,
  setGlobalKillSwitch,
} from '../feature-flags-service';

const dbFlag = {
  id: 'quiz',
  name: 'Quiz Generation',
  description: 'AI-generated quizzes from content',
  status: 'enabled',
  enabledPercentage: 100,
  killSwitch: true,
  killSwitchReason: 'incident',
  metadata: null,
  updatedAt: new Date('2026-09-16T00:00:00.000Z'),
  updatedBy: 'admin',
};

function mockDatabase(flags: unknown[], killSwitch = false): void {
  vi.mocked(prisma.globalConfig.findUnique).mockResolvedValue({
    id: 'global',
    killSwitch,
    killSwitchReason: killSwitch ? 'incident' : null,
  } as never);
  vi.mocked(prisma.featureFlag.findMany).mockResolvedValue(flags as never);
  vi.mocked(prisma.featureFlag.upsert).mockImplementation((async (args: {
    create: Record<string, unknown>;
  }) => ({ ...args.create, updatedAt: new Date() })) as never);
}

describe('feature flag startup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetForTesting();
  });

  afterEach(() => vi.restoreAllMocks());

  it('retains the last database kill switch when a reload fails', async () => {
    mockDatabase([dbFlag]);
    await initializeFlags();
    vi.mocked(prisma.globalConfig.findUnique).mockRejectedValue(new Error('db down'));

    await reloadFlags();

    expect(isFeatureEnabled('quiz').reason).toBe('kill_switch');
    expect(isUsingFallbackDefaults()).toBe(false);
  });

  it('does not replace global policy with a partially loaded snapshot', async () => {
    mockDatabase([dbFlag], true);
    await initializeFlags();
    mockDatabase([], false);
    vi.mocked(prisma.featureFlag.findMany).mockRejectedValue(new Error('db down'));

    await reloadFlags();

    expect(isFeatureEnabled('flashcards').reason).toBe('kill_switch');
  });

  it('shares one database initialization across concurrent callers', async () => {
    mockDatabase([dbFlag]);

    await Promise.all([initializeFlags(), initializeFlags(), initializeFlags()]);

    expect(prisma.globalConfig.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.featureFlag.findMany).toHaveBeenCalledTimes(1);
  });

  it('retries a failed startup load on an active read after five seconds', async () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(1_000);
    vi.mocked(prisma.globalConfig.findUnique).mockRejectedValue(new Error('db down'));
    await initializeFlags();
    mockDatabase([dbFlag]);
    clock.mockReturnValue(5_999);
    isFeatureEnabled('quiz');
    expect(prisma.featureFlag.findMany).not.toHaveBeenCalled();

    clock.mockReturnValue(6_000);
    isFeatureEnabled('quiz');
    isFeatureEnabled('quiz');
    expect(waitUntil).toHaveBeenCalledTimes(1);
    await vi.mocked(waitUntil).mock.calls[0][0];
    await vi.waitFor(() => expect(isUsingFallbackDefaults()).toBe(false));

    expect(isFeatureEnabled('quiz').reason).toBe('kill_switch');
  });

  it('does not periodically overwrite a loaded policy; explicit reload still works', async () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(1_000);
    mockDatabase([{ ...dbFlag, killSwitch: false }]);
    await initializeFlags();
    mockDatabase([dbFlag]);
    clock.mockReturnValue(30_999);
    isFeatureEnabled('quiz');
    expect(prisma.featureFlag.findMany).toHaveBeenCalledTimes(1);

    clock.mockReturnValue(31_000);
    isFeatureEnabled('quiz');
    expect(prisma.featureFlag.findMany).toHaveBeenCalledTimes(1);
    expect(waitUntil).not.toHaveBeenCalled();
    await reloadFlags();

    expect(isFeatureEnabled('quiz').reason).toBe('kill_switch');
    expect(prisma.featureFlag.findMany).toHaveBeenCalledTimes(2);
  });

  it.each(['flag', 'global'] as const)(
    'keeps a failed local %s stop across recovery',
    async (kind) => {
      mockDatabase([{ ...dbFlag, killSwitch: false }]);
      if (kind === 'flag') {
        vi.mocked(prisma.$transaction).mockRejectedValueOnce(new Error('write failed'));
        await expect(
          updateFlag('quiz', {
            killSwitch: true,
            killSwitchReason: 'incident',
          }),
        ).rejects.toMatchObject({ persistence: 'unconfirmed' });
      } else {
        vi.mocked(prisma.globalConfig.upsert).mockRejectedValueOnce(new Error('write failed'));
        await expect(setGlobalKillSwitch(true, 'incident')).rejects.toMatchObject({
          persistence: 'unconfirmed',
        });
      }
      await initializeFlags();
      await reloadFlags();
      expect(isFeatureEnabled('quiz').reason).toBe('kill_switch');
      expect(isUsingFallbackDefaults()).toBe(false);
    },
  );

  it('loads database kill switches despite a metadata edit during initialization', async () => {
    mockDatabase([dbFlag]);
    let release: (() => void) | undefined;
    const ready = new Promise<void>((resolve) => {
      release = resolve;
    });
    const rows = ready.then(() => [dbFlag]);
    vi.mocked(prisma.featureFlag.findMany).mockReturnValueOnce({
      then: rows.then.bind(rows),
      catch: rows.catch.bind(rows),
      finally: rows.finally.bind(rows),
      [Symbol.toStringTag]: 'PrismaPromise',
    });
    const loading = initializeFlags();
    await updateFlag('quiz', { metadata: { source: 'local' } });
    release?.();
    await loading;
    expect(isFeatureEnabled('quiz').reason).toBe('kill_switch');
    expect(isFeatureEnabled('quiz').flag.metadata).toEqual({ source: 'local' });
    expect(isUsingFallbackDefaults()).toBe(false);
  });

  it('reports that checks before the database load run on fallback defaults', () => {
    expect(isUsingFallbackDefaults()).toBe(true);

    expect(isFeatureEnabled('quiz').enabled).toBe(true);

    expect(isUsingFallbackDefaults()).toBe(true);
    expect(logger.debug).toHaveBeenCalledWith(
      'Feature flags answered from compiled defaults (database policy not loaded)',
    );
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('applies a database kill switch even when a check already ran on defaults', async () => {
    expect(isFeatureEnabled('quiz').enabled).toBe(true);

    mockDatabase([dbFlag]);
    await initializeFlags();

    const result = isFeatureEnabled('quiz');
    expect(result.enabled).toBe(false);
    expect(result.reason).toBe('kill_switch');
    expect(isUsingFallbackDefaults()).toBe(false);
  });

  it('applies a database global kill switch after a cold-start check', async () => {
    mockDatabase([], true);
    // The first check answers from defaults while it starts the load.
    expect(isFeatureEnabled('quiz').enabled).toBe(true);

    await initializeFlags();

    expect(isFeatureEnabled('quiz').reason).toBe('kill_switch');
  });

  it('keeps serving defaults and reports an unavailable database exactly once', async () => {
    const failure = new Error('Connection terminated due to connection timeout');
    vi.mocked(prisma.globalConfig.findUnique).mockRejectedValue(failure);

    await initializeFlags();
    await initializeFlags();

    expect(isFeatureEnabled('quiz').enabled).toBe(true);
    expect(isUsingFallbackDefaults()).toBe(true);
    expect(vi.mocked(logger.error).mock.calls).toHaveLength(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('recovers the database policy on a retry after a failed load', async () => {
    vi.mocked(prisma.globalConfig.findUnique).mockRejectedValue(new Error('db down'));
    await initializeFlags();
    expect(isFeatureEnabled('quiz').enabled).toBe(true);

    vi.clearAllMocks();
    mockDatabase([dbFlag]);
    await initializeFlags();

    expect(isFeatureEnabled('quiz').enabled).toBe(false);
  });

  it('does not reload the database policy once it is loaded', async () => {
    mockDatabase([dbFlag]);
    await initializeFlags();
    await initializeFlags();

    expect(vi.mocked(prisma.featureFlag.findMany).mock.calls).toHaveLength(1);
  });
});
