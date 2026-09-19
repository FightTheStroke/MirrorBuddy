import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as persistence from '@/lib/feature-flags/policy-write-persistence';
import * as audit from './audit-service';
import { _resetForTesting, activateKillSwitch } from '@/lib/feature-flags';
import { handleFeaturePolicyMutation, handleFeaturePolicyStop } from './policy-write-actions';

const mutationBodies = [
  { featureId: 'quiz', update: { status: 'disabled' } },
  { featureId: 'quiz', enabled: true, reason: 'incident' },
  { featureId: 'quiz', enabled: false },
  { global: true, enabled: true, reason: 'incident' },
  { global: true, enabled: false },
];

describe('admin acknowledgement HTTP mapping (network boundary only)', () => {
  beforeEach(() => {
    _resetForTesting();
    vi.spyOn(audit, 'logAdminAction').mockResolvedValue();
  });
  afterEach(() => vi.restoreAllMocks());

  it.each(mutationBodies)(
    'waits for confirmation and returns 503 without audit: %j',
    async (body) => {
      let reject!: (error: Error) => void;
      const network = new Promise<void>((_, no) => {
        reject = no;
      });

      vi.spyOn(persistence, 'persistFeaturePolicy').mockReturnValue(network);
      vi.spyOn(persistence, 'persistGlobalPolicy').mockReturnValue(network);
      let settled = false;
      const response = handleFeaturePolicyMutation(body, 'test-admin').then((value) => {
        settled = true;
        return value;
      });
      await Promise.resolve();
      expect(settled).toBe(false);
      expect(audit.logAdminAction).not.toHaveBeenCalled();
      reject(new Error('acknowledgement lost'));
      const result = await response;
      expect(result.status).toBe(503);
      expect(await result.json()).toMatchObject({
        success: false,
        code: 'FLAG_POLICY_WRITE_UNCONFIRMED',
        persistence: 'unconfirmed',
        scope: 'instance',
      });
      expect(audit.logAdminAction).not.toHaveBeenCalled();
    },
  );

  it.each(mutationBodies)(
    'returns concrete confirmed state for every POST branch: %j',
    async (body) => {
      vi.spyOn(persistence, 'persistFeaturePolicy').mockResolvedValue();
      vi.spyOn(persistence, 'persistGlobalPolicy').mockResolvedValue();
      const response = await handleFeaturePolicyMutation(body, 'test-admin');
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        success: true,
        persistence: 'confirmed',
        superseded: false,
        scope: 'instance',
        effective: { killSwitch: 'enabled' in body && body.enabled === true },
      });
      expect(audit.logAdminAction).toHaveBeenCalledTimes(1);
    },
  );

  it('DELETE also awaits and reports a failed stop rather than success', async () => {
    vi.spyOn(persistence, 'persistFeaturePolicy').mockRejectedValue(new Error('stop ack lost'));
    const response = await handleFeaturePolicyStop('quiz', 'incident', 'test-admin');
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      success: false,
      effective: { killSwitch: true },
    });
    expect(audit.logAdminAction).not.toHaveBeenCalled();
  });

  it('DELETE returns concrete confirmed state and audits only after acknowledgement', async () => {
    vi.spyOn(persistence, 'persistFeaturePolicy').mockResolvedValue();
    const response = await handleFeaturePolicyStop('quiz', 'incident', 'test-admin');
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      killSwitch: true,
      persistence: 'confirmed',
      effective: { killSwitch: true },
    });
    expect(audit.logAdminAction).toHaveBeenCalledTimes(1);
  });

  it('reports a superseded release as 409, never as reactivated', async () => {
    const persist = vi.spyOn(persistence, 'persistFeaturePolicy').mockResolvedValue();
    await activateKillSwitch('quiz', 'first');
    let resolve!: () => void;
    persist.mockReturnValueOnce(
      new Promise<void>((yes) => {
        resolve = yes;
      }),
    );
    const response = handleFeaturePolicyMutation(
      { featureId: 'quiz', enabled: false },
      'test-admin',
    );
    await Promise.resolve();
    const stop = activateKillSwitch('quiz', 'new incident');
    resolve();
    expect((await response).status).toBe(409);
    await stop;
    expect(audit.logAdminAction).not.toHaveBeenCalled();
  });

  it.each([null, {}, { featureId: 'quiz', update: null }, { global: true, enabled: 'false' }])(
    'rejects invalid input without success shape',
    async (body) => {
      expect((await handleFeaturePolicyMutation(body, 'test-admin')).status).toBe(400);
    },
  );
});
