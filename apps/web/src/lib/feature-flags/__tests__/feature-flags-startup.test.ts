/**
 * Startup behaviour of the feature flag service on a cold instance.
 *
 * A serverless instance starts with an empty cache. Until it has loaded the
 * database policy, checks fall back to compiled defaults. These tests pin the
 * agreed behaviour: the fallback is provisional, so an emergency kill switch
 * stored in the database still takes effect once the load completes, and a
 * database failure is reported once instead of on every cold start.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

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
  vi.mocked(prisma.globalConfig.upsert).mockResolvedValue({
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

  it('reports that checks before the database load run on fallback defaults', () => {
    expect(isUsingFallbackDefaults()).toBe(true);

    expect(isFeatureEnabled('quiz').enabled).toBe(true);

    expect(isUsingFallbackDefaults()).toBe(true);
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
    expect(isFeatureEnabled('quiz').enabled).toBe(true);

    mockDatabase([], true);
    await initializeFlags();

    expect(isFeatureEnabled('quiz').reason).toBe('kill_switch');
  });

  it('keeps serving defaults and reports an unavailable database exactly once', async () => {
    const failure = new Error('Connection terminated due to connection timeout');
    vi.mocked(prisma.globalConfig.upsert).mockRejectedValue(failure);

    await initializeFlags();
    await initializeFlags();

    expect(isFeatureEnabled('quiz').enabled).toBe(true);
    expect(isUsingFallbackDefaults()).toBe(true);
    expect(vi.mocked(logger.error).mock.calls).toHaveLength(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('recovers the database policy on a retry after a failed load', async () => {
    vi.mocked(prisma.globalConfig.upsert).mockRejectedValue(new Error('db down'));
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
