/**
 * Regression for #1157 / #1167 / #1171 / #1161 / #1168 (Sentry MIRRORBUDDY-2S, -31, -34, -38, -3D).
 *
 * The policy load used to start at instance boot, outside any request. Vercel
 * suspends an instance once its request work is done, so the in-flight
 * connection handshake was frozen and its timers fired on resume: "Connection
 * terminated due to connection timeout", EAUTHTIMEOUT from the pooler, and
 * "[SlowQuery] CRITICAL" durations of eleven minutes. The load must run inside
 * a request, registered with waitUntil, and must not open a write transaction
 * when the policy row already exists.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
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

import { prisma } from '@/lib/db';
import { DEFAULT_FLAGS } from '../default-flags';
import {
  isFeatureEnabled,
  isUsingFallbackDefaults,
  _resetForTesting,
  reloadFlags,
} from '../feature-flags-service';

const storedFlags = Object.entries(DEFAULT_FLAGS).map(([id, config]) => ({
  id,
  ...config,
  killSwitchReason: null,
  metadata: null,
  updatedAt: new Date('2026-09-20T00:00:00.000Z'),
  updatedBy: null,
}));

describe('feature flag policy load lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetForTesting();
    vi.mocked(prisma.globalConfig.findUnique).mockResolvedValue({
      id: 'global',
      killSwitch: true,
      killSwitchReason: 'incident',
    } as never);
    vi.mocked(prisma.featureFlag.findMany).mockResolvedValue(storedFlags as never);
  });

  it('does not reach the database until a request reads a flag', () => {
    expect(prisma.globalConfig.findUnique).not.toHaveBeenCalled();
    expect(prisma.globalConfig.upsert).not.toHaveBeenCalled();
    expect(prisma.featureFlag.findMany).not.toHaveBeenCalled();
  });

  it('loads the policy on the first read, inside the request lifetime', async () => {
    isFeatureEnabled('quiz');
    isFeatureEnabled('flashcards');

    expect(waitUntil).toHaveBeenCalledTimes(1);
    await vi.mocked(waitUntil).mock.calls[0][0];

    expect(isUsingFallbackDefaults()).toBe(false);
    expect(isFeatureEnabled('quiz').reason).toBe('kill_switch');
  });

  it('stays on compiled defaults during the production build', () => {
    vi.stubEnv('NEXT_PHASE', 'phase-production-build');
    try {
      expect(isFeatureEnabled('quiz').enabled).toBe(true);
      expect(waitUntil).not.toHaveBeenCalled();
      expect(prisma.featureFlag.findMany).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('reads an existing policy without opening a write transaction', async () => {
    await reloadFlags();

    expect(prisma.globalConfig.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.featureFlag.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.globalConfig.upsert).not.toHaveBeenCalled();
    expect(prisma.featureFlag.upsert).not.toHaveBeenCalled();
  });

  it('creates the global policy row only when it is missing', async () => {
    vi.mocked(prisma.globalConfig.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.globalConfig.upsert).mockResolvedValue({
      id: 'global',
      killSwitch: false,
      killSwitchReason: null,
    } as never);

    await reloadFlags();

    expect(prisma.globalConfig.upsert).toHaveBeenCalledTimes(1);
    expect(isUsingFallbackDefaults()).toBe(false);
    expect(isFeatureEnabled('quiz').enabled).toBe(true);
  });
});
