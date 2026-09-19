import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as persistence from '../policy-write-persistence';
import {
  _resetForTesting,
  activateKillSwitch,
  deactivateKillSwitch,
  getFlag,
  isGlobalKillSwitchActive,
  setGlobalKillSwitch,
  updateFlag,
} from '../feature-flags-service';

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

describe('public policy writer acknowledgement boundary', () => {
  beforeEach(() => _resetForTesting());
  afterEach(() => vi.restoreAllMocks());

  it('protects synchronously and rejects an unconfirmed feature stop', async () => {
    const network = deferred();
    vi.spyOn(persistence, 'persistFeaturePolicy').mockReturnValue(network.promise);
    const pending = activateKillSwitch('quiz', 'incident');
    expect(getFlag('quiz')?.killSwitch).toBe(true);
    const rejected = expect(pending).rejects.toMatchObject({
      code: 'FLAG_POLICY_WRITE_UNCONFIRMED',
      effective: { killSwitch: true },
    });
    network.reject(new Error('lost acknowledgement'));
    await rejected;
  });

  it('protects globally before acknowledgement and retains failed protection', async () => {
    const network = deferred();
    vi.spyOn(persistence, 'persistGlobalPolicy').mockReturnValue(network.promise);
    const pending = setGlobalKillSwitch(true, 'incident');
    expect(isGlobalKillSwitchActive()).toBe(true);
    const rejected = expect(pending).rejects.toMatchObject({ persistence: 'unconfirmed' });
    network.reject(new Error('lost acknowledgement'));
    await rejected;
    expect(isGlobalKillSwitchActive()).toBe(true);
  });

  it('never allows a pending release to beat a newer stop', async () => {
    const persist = vi.spyOn(persistence, 'persistFeaturePolicy').mockResolvedValue();
    await activateKillSwitch('quiz', 'first');
    const network = deferred();
    persist.mockReturnValueOnce(network.promise);
    const release = deactivateKillSwitch('quiz');
    await Promise.resolve();
    expect(getFlag('quiz')?.killSwitch).toBe(true);
    const stop = activateKillSwitch('quiz', 'new incident');
    network.resolve();
    expect(await release).toMatchObject({ persistence: 'confirmed', superseded: true });
    expect(await stop).toMatchObject({ effective: { killSwitch: true } });
  });

  it('returns concrete confirmed policy and only persists supplied fields', async () => {
    const persist = vi.spyOn(persistence, 'persistFeaturePolicy').mockResolvedValue();
    const result = await updateFlag('quiz', { status: 'disabled' });
    expect(result).toMatchObject({
      persistence: 'confirmed',
      superseded: false,
      effective: { status: 'disabled' },
    });
    expect(persist).toHaveBeenCalledWith('quiz', { status: 'disabled' });
  });

  it('keeps a global release blocked while pending and after failed acknowledgement', async () => {
    const persist = vi.spyOn(persistence, 'persistGlobalPolicy').mockResolvedValue();
    await setGlobalKillSwitch(true, 'incident');
    const network = deferred();
    persist.mockReturnValueOnce(network.promise);
    const release = setGlobalKillSwitch(false);
    expect(isGlobalKillSwitchActive()).toBe(true);
    const failure = expect(release).rejects.toMatchObject({
      persistence: 'unconfirmed',
      effective: { killSwitch: true },
    });
    network.reject(new Error('release acknowledgement lost'));
    await failure;
    expect(isGlobalKillSwitchActive()).toBe(true);
  });
});
