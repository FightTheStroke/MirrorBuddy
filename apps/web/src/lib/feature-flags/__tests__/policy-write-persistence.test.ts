// @vitest-environment node
import { randomUUID } from 'node:crypto';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { policyTestDatabaseEnabled } from '@/test/policy-test-environment';

const enabled = policyTestDatabaseEnabled();
let prisma: (typeof import('@/lib/db'))['prisma'];
let persistFeaturePolicy: (typeof import('../policy-write-persistence'))['persistFeaturePolicy'];
let readWritablePolicyFlag: (typeof import('../policy-write-persistence'))['readWritablePolicyFlag'];
let beginFeaturePolicyWrite: (typeof import('../policy-writer'))['beginFeaturePolicyWrite'];
let prepareWritablePolicy: (typeof import('../policy-writer'))['prepareWritablePolicy'];
let _resetForTesting: (typeof import('../feature-flags-policy'))['_resetForTesting'];
let getFlag: (typeof import('../feature-flags-policy'))['getFlag'];
let reloadFlags: (typeof import('../feature-flags-policy'))['reloadFlags'];
let id: string;

describe.runIf(enabled)('sparse policy persistence with real PostgreSQL', () => {
  beforeAll(async () => {
    ({ prisma } = await import('@/lib/db'));
    ({ persistFeaturePolicy, readWritablePolicyFlag } =
      await import('../policy-write-persistence'));
    ({ beginFeaturePolicyWrite, prepareWritablePolicy } = await import('../policy-writer'));
    ({ _resetForTesting, getFlag, reloadFlags } = await import('../feature-flags-policy'));
  });
  beforeEach(async () => {
    _resetForTesting();
    id = `policy-write-test-${randomUUID()}`;
    await prisma.featureFlag.create({
      data: {
        id,
        name: 'Policy test',
        description: 'Exact owned fixture',
        status: 'disabled',
        enabledPercentage: 27,
        killSwitch: true,
        killSwitchReason: 'retained stop',
        metadata: { retained: true },
      },
    });
  });
  afterEach(async () => {
    if (!id) return;
    await prisma.featureFlag.deleteMany({ where: { id } });
    expect(await prisma.featureFlag.count({ where: { id } })).toBe(0);
  });

  it('metadata-only writes preserve the actual database stop and unrelated fields', async () => {
    await persistFeaturePolicy(id, { metadata: { note: 'updated' }, updatedBy: 'test-admin' });
    const actual = await prisma.featureFlag.findUniqueOrThrow({ where: { id } });
    expect(actual).toMatchObject({
      killSwitch: true,
      killSwitchReason: 'retained stop',
      status: 'disabled',
      enabledPercentage: 27,
      metadata: { retained: true, note: 'updated' },
    });
  });

  it('merges concurrent metadata updates without dropping either key', async () => {
    await Promise.all([
      persistFeaturePolicy(id, { metadata: { left: 1 } }),
      persistFeaturePolicy(id, { metadata: { right: 2 } }),
    ]);
    expect((await prisma.featureFlag.findUniqueOrThrow({ where: { id } })).metadata).toEqual({
      retained: true,
      left: 1,
      right: 2,
    });
  });

  it('clears the reason only with an explicit acknowledged release', async () => {
    await persistFeaturePolicy(id, { enabledPercentage: 45 });
    expect((await readWritablePolicyFlag(id)).killSwitchReason).toBe('retained stop');
    await persistFeaturePolicy(id, { killSwitch: false });
    expect(await readWritablePolicyFlag(id)).toMatchObject({
      killSwitch: false,
      killSwitchReason: null,
      enabledPercentage: 45,
    });
  });

  it('accepts database-defined flags and rejects unknown IDs without creating them', async () => {
    expect((await readWritablePolicyFlag(id)).id).toBe(id);
    const missing = `${id}-absent`;
    await expect(
      persistFeaturePolicy(missing, { killSwitch: true, killSwitchReason: 'stop' }),
    ).rejects.toThrow('Unknown feature flag');
    expect(await prisma.featureFlag.count({ where: { id: missing } })).toBe(0);
  });

  it('acknowledges a DB-defined flag without releasing local protection early', async () => {
    await prepareWritablePolicy(id);
    const release = beginFeaturePolicyWrite(id, { killSwitch: false }, 'admin');
    expect(getFlag(id)?.killSwitch).toBe(true);
    expect(await release.completion).toMatchObject({
      persistence: 'confirmed',
      effective: { killSwitch: false, killSwitchReason: null },
    });
    expect((await readWritablePolicyFlag(id)).killSwitch).toBe(false);
    await reloadFlags();
    expect(getFlag(id)?.killSwitch).toBe(false);
  });

  it('copies caller metadata and retains a synchronous stop across reload', async () => {
    await prepareWritablePolicy(id);
    const patch = {
      killSwitch: true,
      killSwitchReason: 'new stop',
      metadata: { marker: 'copied' },
    };
    const stop = beginFeaturePolicyWrite(id, patch, 'admin');
    patch.metadata.marker = 'caller changed';
    expect(getFlag(id)?.killSwitchReason).toBe('new stop');
    await stop.completion;
    expect((await readWritablePolicyFlag(id)).metadata?.marker).toBe('copied');
    await reloadFlags();
    expect(getFlag(id)?.killSwitchReason).toBe('new stop');
  });

  it('retains a failed local stop after a real missing-row error and reload', async () => {
    await prisma.featureFlag.update({ where: { id }, data: { killSwitch: false } });
    await prepareWritablePolicy(id);
    await prisma.featureFlag.delete({ where: { id } });
    const stop = beginFeaturePolicyWrite(
      id,
      { killSwitch: true, killSwitchReason: 'keep stop' },
      'admin',
    );
    expect(getFlag(id)?.killSwitch).toBe(true);
    await expect(stop.completion).rejects.toMatchObject({ persistence: 'unconfirmed' });
    await prisma.featureFlag.create({
      data: { id, name: 'Policy test', description: 'Exact owned fixture', killSwitch: false },
    });
    await reloadFlags();
    expect(getFlag(id)).toMatchObject({ killSwitch: true, killSwitchReason: 'keep stop' });
    expect((await readWritablePolicyFlag(id)).killSwitch).toBe(false);
  });

  it.each([null, undefined, {}, { enabledPercentage: NaN }, { killSwitchReason: 'orphan' }])(
    'rejects malformed input without changing the row: %j',
    async (patch) => {
      const before = await prisma.featureFlag.findUniqueOrThrow({ where: { id } });
      await expect(persistFeaturePolicy(id, patch)).rejects.toThrow();
      expect(await prisma.featureFlag.findUniqueOrThrow({ where: { id } })).toEqual(before);
    },
  );
});
