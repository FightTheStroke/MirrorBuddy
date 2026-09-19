import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import * as persistence from '@/lib/feature-flags/policy-write-persistence';
import { _resetForTesting, activateKillSwitch } from '@/lib/feature-flags';
import { updateFeatureFlag } from './control-panel-feature-flags';
import { updateGlobalKillSwitch } from './control-panel-kill-switch';
import { policyWriteFailure } from './policy-write-response';

describe('control-panel adapters share acknowledgement writer', () => {
  beforeEach(() => _resetForTesting());
  afterEach(() => vi.restoreAllMocks());

  it.each(['feature', 'global'] as const)(
    'awaits %s writes and maps unconfirmed protection',
    async (kind) => {
      let reject!: (error: Error) => void;
      const pending = new Promise<void>((_, no) => {
        reject = no;
      });
      vi.spyOn(persistence, 'persistFeaturePolicy').mockReturnValue(pending);
      vi.spyOn(persistence, 'persistGlobalPolicy').mockReturnValue(pending);
      const write =
        kind === 'global'
          ? updateGlobalKillSwitch(true, 'stop', 'admin')
          : updateFeatureFlag('quiz', { killSwitch: true, killSwitchReason: 'stop' }, 'admin');
      let settled = false;
      const response = write.then(() => {
        settled = true;
      }, policyWriteFailure);
      await Promise.resolve();
      expect(settled).toBe(false);
      reject(new Error('network acknowledgement lost'));
      const failure = await response;
      expect(failure?.status).toBe(503);
      expect(await failure?.json()).toMatchObject({
        success: false,
        persistence: 'unconfirmed',
        scope: 'instance',
        effective: { killSwitch: true },
      });
    },
  );

  it('preserves feature and global response shapes with concrete confirmation', async () => {
    vi.spyOn(persistence, 'persistFeaturePolicy').mockResolvedValue();
    vi.spyOn(persistence, 'persistGlobalPolicy').mockResolvedValue();
    expect(await updateFeatureFlag('quiz', { status: 'disabled' }, 'admin')).toMatchObject({
      id: 'quiz',
      status: 'disabled',
      persistence: 'confirmed',
    });
    expect(await updateGlobalKillSwitch(true, 'stop', 'admin')).toMatchObject({
      isEnabled: true,
      reason: 'stop',
      updatedBy: 'admin',
      persistence: 'confirmed',
    });
  });

  it('rejects superseded recovery instead of returning an enabled adapter state', async () => {
    const persist = vi.spyOn(persistence, 'persistFeaturePolicy').mockResolvedValue();
    await activateKillSwitch('quiz', 'first');
    let resolve!: () => void;
    persist.mockReturnValueOnce(
      new Promise<void>((yes) => {
        resolve = yes;
      }),
    );
    const release = updateFeatureFlag('quiz', { killSwitch: false }, 'admin').catch(
      policyWriteFailure,
    );
    await Promise.resolve();
    const stop = activateKillSwitch('quiz', 'second');
    resolve();
    expect(await release).toMatchObject({ status: 409 });
    await stop;
  });
});
