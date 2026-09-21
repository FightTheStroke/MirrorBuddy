import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { waitUntil } from '@vercel/functions';
import { logger } from '@/lib/logger';
import * as writer from '@/lib/feature-flags/policy-writer';
import { PolicyWriteCoordinator } from '@/lib/feature-flags/policy-write-coordinator';
import type { PolicyState } from '@/lib/feature-flags/policy-write-types';
import { policyPatch } from '@/lib/feature-flags/policy-write-validation';
import {
  degradeFeature,
  recoverFeature,
  getFallbackBehavior,
  getRecentEvents,
  recordHealthCheck,
  _resetState,
} from '../degradation-service';

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
vi.mock('@/lib/feature-flags', () => ({
  activateKillSwitch: vi.fn(),
  deactivateKillSwitch: vi.fn(),
  setFlagStatus: vi.fn(),
}));

describe('degradation caller against the real acknowledgement state machine', () => {
  let state: PolicyState;
  let coordinator: PolicyWriteCoordinator;
  const persist = vi.fn<(patch: unknown) => Promise<void>>();
  const drain = async () => {
    await Promise.all(vi.mocked(waitUntil).mock.calls.map(([pending]) => pending));
  };
  beforeEach(() => {
    vi.clearAllMocks();
    _resetState();
    state = { killSwitch: false, status: 'enabled', enabledPercentage: 100 };
    coordinator = new PolicyWriteCoordinator(
      () => state,
      (_, patch) => {
        state = { ...state, ...patch };
      },
    );
    persist.mockResolvedValue();
    vi.spyOn(writer, 'beginFeaturePolicyWrite').mockImplementation((id, patch, source, token) =>
      coordinator.write(`feature:${id}`, policyPatch.parse(patch), source, persist, token),
    );
  });
  afterEach(async () => {
    await drain();
    vi.restoreAllMocks();
  });

  it('retains fallback on failure, retries only explicitly, and makes one recovery write', async () => {
    degradeFeature('voice_realtime', 'disable', 'incident');
    expect(state.killSwitch).toBe(true);
    await drain();
    persist.mockRejectedValueOnce(new Error('lost acknowledgement'));
    await recoverFeature('voice_realtime', 'healthy');
    expect(getFallbackBehavior('voice_realtime')).toBe('disable');
    expect(getRecentEvents().filter((event) => event.newState === 'enabled')).toHaveLength(0);
    const attempts = persist.mock.calls.length;
    for (let i = 0; i < 30; i++) recordHealthCheck('azure-realtime', true, 1);
    await drain();
    expect(persist).toHaveBeenCalledTimes(attempts);
    expect(logger.error).toHaveBeenCalledTimes(1);
    await recoverFeature('voice_realtime', 'explicit retry');
    expect(getFallbackBehavior('voice_realtime')).toBeNull();
    expect(persist.mock.calls.at(-1)?.[0]).toMatchObject({ killSwitch: false, status: 'enabled' });
  });

  it('deduplicates pending recovery and never announces recovery after a new stop', async () => {
    degradeFeature('voice_realtime', 'disable', 'first');
    await drain();
    let release!: () => void;
    persist.mockReturnValueOnce(
      new Promise<void>((yes) => {
        release = yes;
      }),
    );
    const pending = recoverFeature('voice_realtime', 'healthy');
    const duplicate = recoverFeature('voice_realtime', 'healthy again');
    await Promise.resolve();
    degradeFeature('voice_realtime', 'disable', 'new incident');
    release();
    await Promise.all([pending, duplicate]);
    await drain();
    expect(state.killSwitch).toBe(true);
    expect(getFallbackBehavior('voice_realtime')).toBe('disable');
    expect(getRecentEvents().filter((event) => event.newState === 'enabled')).toHaveLength(0);
  });

  it('preserves ownership through metadata but cannot clear an admin stop', async () => {
    degradeFeature('voice_realtime', 'disable', 'first');
    await drain();
    await coordinator.write(
      'feature:voice_realtime',
      { metadata: { note: 'edited' } },
      'admin',
      persist,
    ).completion;
    await recoverFeature('voice_realtime', 'healthy');
    expect(state.killSwitch).toBe(false);
    degradeFeature('voice_realtime', 'disable', 'second');
    await drain();
    await coordinator.write('feature:voice_realtime', { killSwitch: true }, 'admin', persist)
      .completion;
    await recoverFeature('voice_realtime', 'healthy');
    expect(state.killSwitch).toBe(true);
    expect(getFallbackBehavior('voice_realtime')).toBe('disable');
  });

  it('handles a failed stop once and keeps fallback until recovery is confirmed', async () => {
    persist.mockRejectedValueOnce(new Error('stop acknowledgement lost'));
    degradeFeature('voice_realtime', 'disable', 'incident');
    expect(state.killSwitch).toBe(true);
    await drain();
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(getFallbackBehavior('voice_realtime')).toBe('disable');
    let resolve!: () => void;
    persist.mockReturnValueOnce(
      new Promise<void>((yes) => {
        resolve = yes;
      }),
    );
    const pending = recoverFeature('voice_realtime', 'retry');
    await Promise.resolve();
    expect(getFallbackBehavior('voice_realtime')).toBe('disable');
    resolve();
    await pending;
    expect(getFallbackBehavior('voice_realtime')).toBeNull();
    expect(state.killSwitch).toBe(false);
  });
});
