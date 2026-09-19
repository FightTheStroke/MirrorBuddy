import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { waitUntil } from '@vercel/functions';
import * as writer from '@/lib/feature-flags/policy-writer';
import * as flags from '@/lib/feature-flags/feature-flags-service';
import { PolicyWriteCoordinator } from '@/lib/feature-flags/policy-write-coordinator';
import type { PolicyState } from '@/lib/feature-flags/policy-write-types';
import { policyPatch } from '@/lib/feature-flags/policy-write-validation';
import { detectCostSpike } from '../cost-tracking-service';
import {
  handleCostSpike,
  isVoiceAllowed,
  _resetState,
  VOICE_DURATION_LIMITS,
} from '../voice-cost-guards';

vi.mock('@vercel/functions', () => ({ waitUntil: vi.fn() }));
vi.mock('../cost-tracking-service', () => ({
  detectCostSpike: vi.fn().mockResolvedValue(true),
  THRESHOLDS: { SPIKE_MULTIPLIER: 1.5 },
}));

describe('voice episodes and acknowledgement (pure network boundary)', () => {
  let state: PolicyState;
  let coordinator: PolicyWriteCoordinator;
  const persist = vi.fn<(patch: unknown) => Promise<void>>();
  const drain = () => Promise.all(vi.mocked(waitUntil).mock.calls.map(([job]) => job));
  beforeEach(() => {
    vi.useFakeTimers();
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
    vi.spyOn(flags, 'activateKillSwitch').mockResolvedValue({
      persistence: 'confirmed',
      superseded: false,
      scope: 'instance',
      effective: state,
    });
    vi.spyOn(flags, 'deactivateKillSwitch').mockResolvedValue({
      persistence: 'confirmed',
      superseded: false,
      scope: 'instance',
      effective: state,
    });
    vi.spyOn(writer, 'beginFeaturePolicyWrite').mockImplementation((id, patch, source, token) =>
      coordinator.write(`feature:${id}`, policyPatch.parse(patch), source, persist, token),
    );
    vi.spyOn(flags, 'isGlobalKillSwitchActive').mockReturnValue(false);
    vi.spyOn(flags, 'getFlag').mockImplementation(() => ({
      ...state,
      id: 'voice_realtime',
      name: 'Voice',
      description: '',
      updatedAt: new Date(),
    }));
  });
  afterEach(async () => {
    _resetState();
    await drain();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('cooldown expiry permits an attempt, not speech; failure needs admin recovery', async () => {
    await handleCostSpike(10);
    await drain();
    persist.mockRejectedValueOnce(new Error('ack lost'));
    await vi.advanceTimersByTimeAsync(VOICE_DURATION_LIMITS.SPIKE_COOLDOWN_MS);
    await drain();
    expect(isVoiceAllowed().allowed).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    await coordinator.write('feature:voice_realtime', { killSwitch: false }, 'admin', persist)
      .completion;
    expect(isVoiceAllowed().allowed).toBe(true);
  });

  it('replaces the timer on a second spike and fences an old in-flight release', async () => {
    await handleCostSpike(10);
    await drain();
    let resolve!: () => void;
    persist.mockReturnValueOnce(
      new Promise<void>((yes) => {
        resolve = yes;
      }),
    );
    await vi.advanceTimersByTimeAsync(VOICE_DURATION_LIMITS.SPIKE_COOLDOWN_MS);
    expect(isVoiceAllowed().allowed).toBe(false);
    await handleCostSpike(20);
    resolve();
    await drain();
    expect(state.killSwitch).toBe(true);
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(100);
    await handleCostSpike(30);
    expect(vi.getTimerCount()).toBe(1);
    _resetState();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('retains a failed local stop and respects another owner and global protection', async () => {
    persist.mockRejectedValueOnce(new Error('stop ack lost'));
    await handleCostSpike(10);
    await drain();
    expect(state.killSwitch).toBe(true);
    await coordinator.write('feature:voice_realtime', { killSwitch: true }, 'admin', persist)
      .completion;
    await vi.advanceTimersByTimeAsync(VOICE_DURATION_LIMITS.SPIKE_COOLDOWN_MS);
    await drain();
    expect(isVoiceAllowed().allowed).toBe(false);
    await coordinator.write('feature:voice_realtime', { killSwitch: false }, 'admin', persist)
      .completion;
    vi.mocked(flags.isGlobalKillSwitchActive).mockReturnValue(true);
    expect(isVoiceAllowed().allowed).toBe(false);
  });

  it('cancels the first timer, preserves ownership through metadata, and releases only the latest spike', async () => {
    const cooldown = VOICE_DURATION_LIMITS.SPIKE_COOLDOWN_MS;
    await handleCostSpike(10);
    await drain();
    await vi.advanceTimersByTimeAsync(cooldown / 2);
    await handleCostSpike(20);
    await drain();
    await coordinator.write(
      'feature:voice_realtime',
      {
        metadata: { note: 'operator note' },
        updatedBy: 'admin',
      },
      'admin',
      persist,
    ).completion;
    await vi.advanceTimersByTimeAsync(cooldown / 2);
    expect(state.killSwitch).toBe(true);
    expect(
      persist.mock.calls.filter(([patch]) => policyPatch.parse(patch).killSwitch === false),
    ).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(cooldown / 2);
    await drain();
    expect(state.killSwitch).toBe(false);
    expect(isVoiceAllowed().allowed).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([true, false])(
    'never auto-releases unknown protection (known policy: %s)',
    async (known) => {
      state = { ...state, killSwitch: known, safetyKnown: known };
      await handleCostSpike(10);
      await drain();
      await vi.advanceTimersByTimeAsync(VOICE_DURATION_LIMITS.SPIKE_COOLDOWN_MS);
      await drain();
      expect(state.killSwitch).toBe(true);
      expect(isVoiceAllowed().allowed).toBe(false);
      expect(persist).toHaveBeenCalledTimes(1);
    },
  );

  it('does not install an orphan timer when spike detection finishes after reset', async () => {
    let resolve!: (spike: boolean) => void;
    vi.mocked(detectCostSpike).mockReturnValueOnce(
      new Promise<boolean>((yes) => {
        resolve = yes;
      }),
    );
    const detection = handleCostSpike(10);
    _resetState();
    resolve(true);
    expect(await detection).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    expect(persist).not.toHaveBeenCalled();
  });
});
