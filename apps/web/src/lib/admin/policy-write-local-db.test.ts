// @vitest-environment node
import { randomUUID } from 'node:crypto';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest';
import { policyTestDatabaseEnabled } from '@/test/policy-test-environment';

const enabled = policyTestDatabaseEnabled();
let prisma: (typeof import('@/lib/db'))['prisma'];
let logger: (typeof import('@/lib/logger'))['logger'];
let _resetForTesting: (typeof import('@/lib/feature-flags'))['_resetForTesting'];
let getFlag: (typeof import('@/lib/feature-flags'))['getFlag'];
let updateFlag: (typeof import('@/lib/feature-flags'))['updateFlag'];
let prepareWritablePolicy: (typeof import('@/lib/feature-flags/policy-writer'))['prepareWritablePolicy'];
let updateFeatureFlag: (typeof import('./control-panel-feature-flags'))['updateFeatureFlag'];
let handleFeaturePolicyMutation: (typeof import('./policy-write-actions'))['handleFeaturePolicyMutation'];
let handleFeaturePolicyStop: (typeof import('./policy-write-actions'))['handleFeaturePolicyStop'];
let id: string;
let adminId: string;
let errorLog: MockInstance<typeof logger.error>;
let transactions: MockInstance<typeof prisma.$transaction>;

function safeCause(input: unknown) {
  if (!(input instanceof Error)) return { name: 'UnknownError' };
  const cause = input.cause;
  return {
    name: input.name,
    code: 'code' in input && typeof input.code === 'string' ? input.code : null,
    codePresent: 'code' in input,
    codeType: 'code' in input ? typeof input.code : 'absent',
    kind:
      typeof cause === 'object' &&
      cause !== null &&
      'kind' in cause &&
      typeof cause.kind === 'string'
        ? cause.kind
        : null,
    originalCode:
      typeof cause === 'object' &&
      cause !== null &&
      'originalCode' in cause &&
      typeof cause.originalCode === 'string'
        ? cause.originalCode
        : null,
  };
}

describe.runIf(enabled)('caller persistence with exact owned PostgreSQL fixtures', () => {
  beforeAll(async () => {
    ({ prisma } = await import('@/lib/db'));
    ({ logger } = await import('@/lib/logger'));
    ({ _resetForTesting, getFlag, updateFlag } = await import('@/lib/feature-flags'));
    ({ prepareWritablePolicy } = await import('@/lib/feature-flags/policy-writer'));
    ({ updateFeatureFlag } = await import('./control-panel-feature-flags'));
    ({ handleFeaturePolicyMutation, handleFeaturePolicyStop } =
      await import('./policy-write-actions'));
  });
  beforeEach(async () => {
    errorLog = vi.spyOn(logger, 'error').mockImplementation(() => {});
    transactions = vi.spyOn(prisma, '$transaction');
    _resetForTesting();
    id = `policy-caller-${randomUUID()}`;
    adminId = `policy-admin-${randomUUID()}`;
    await prisma.featureFlag.create({
      data: {
        id,
        name: 'Owned caller policy',
        description: 'Caller integration fixture',
        status: 'enabled',
        enabledPercentage: 63,
        killSwitch: true,
        killSwitchReason: 'existing incident',
        metadata: { retained: true },
      },
    });
  });
  afterEach(async () => {
    try {
      if (!id || !adminId) return;
      const results = await Promise.allSettled(
        transactions.mock.results.map((result) => result.value),
      );
      const failures = results.filter((result) => result.status === 'rejected');
      if (failures.length) {
        process.stdout.write(
          `POLICY_TRANSACTION_OBSERVATION ${JSON.stringify({
            calls: results.length,
            failures: failures.map((result) => safeCause(result.reason)),
          })}\n`,
        );
      }
      await prisma.adminAuditLog.deleteMany({ where: { adminId } });
      await prisma.featureFlag.deleteMany({ where: { id } });
      expect(await prisma.featureFlag.count({ where: { id } })).toBe(0);
      expect(await prisma.adminAuditLog.count({ where: { adminId } })).toBe(0);
    } finally {
      errorLog?.mockRestore();
      transactions?.mockRestore();
    }
  });

  it('routes a DB-defined flag through both adapters without persisting unrelated fields', async () => {
    const result = await updateFeatureFlag(id, { status: 'degraded' }, adminId);
    expect(result).toMatchObject({
      id,
      status: 'degraded',
      killSwitch: true,
      persistence: 'confirmed',
    });
    const response = await handleFeaturePolicyMutation(
      {
        featureId: id,
        update: { metadata: { note: 'acknowledged' } },
      },
      adminId,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      persistence: 'confirmed',
      flag: { id, killSwitch: true },
    });
    expect(await prisma.featureFlag.findUniqueOrThrow({ where: { id } })).toMatchObject({
      status: 'degraded',
      enabledPercentage: 63,
      killSwitch: true,
      killSwitchReason: 'existing incident',
      metadata: { retained: true, note: 'acknowledged' },
    });
    expect(await prisma.adminAuditLog.count({ where: { adminId } })).toBe(1);
  });

  it('handles DELETE-style stop then confirmed release with real audit and no intent Promise', async () => {
    const stop = await handleFeaturePolicyStop(id, 'new incident', adminId);
    expect(stop.status).toBe(200);
    const release = await handleFeaturePolicyMutation({ featureId: id, enabled: false }, adminId);
    expect(release.status, JSON.stringify(safeCause(errorLog.mock.calls.at(-1)?.[2]))).toBe(200);
    expect(await release.json()).toMatchObject({
      success: true,
      persistence: 'confirmed',
      killSwitch: false,
      effective: { killSwitch: false, killSwitchReason: null },
    });
    expect(
      (await prisma.featureFlag.findUniqueOrThrow({ where: { id } })).killSwitchReason,
    ).toBeNull();
    expect(await prisma.adminAuditLog.count({ where: { adminId } })).toBe(2);
  });

  it('returns 503 on a real missing-row write, retains protection, and creates no success audit', async () => {
    await prepareWritablePolicy(id);
    await prisma.featureFlag.delete({ where: { id } });
    const response = await handleFeaturePolicyMutation({ featureId: id, enabled: false }, adminId);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      success: false,
      code: 'FLAG_POLICY_WRITE_UNCONFIRMED',
      persistence: 'unconfirmed',
      scope: 'instance',
      effective: { killSwitch: true },
    });
    expect(getFlag(id)?.killSwitch).toBe(true);
    expect(await prisma.adminAuditLog.count({ where: { adminId } })).toBe(0);
    expect(logger.error).toHaveBeenCalledExactlyOnceWith(
      'Admin policy persistence unconfirmed',
      { code: 'FLAG_POLICY_WRITE_UNCONFIRMED' },
      expect.any(Error),
    );
    expect(safeCause(errorLog.mock.calls[0]?.[2])).toEqual({
      name: 'Error',
      code: null,
      codePresent: false,
      codeType: 'absent',
      kind: null,
      originalCode: null,
    });
  });

  it('returns 404 for an unknown DB flag without creating it', async () => {
    await prisma.featureFlag.delete({ where: { id } });
    expect((await handleFeaturePolicyStop(id, 'unknown', adminId)).status).toBe(404);
    await expect(updateFlag(id, { status: 'disabled' })).rejects.toThrow('Unknown feature flag');
    expect(await prisma.featureFlag.count({ where: { id } })).toBe(0);
  });
});
