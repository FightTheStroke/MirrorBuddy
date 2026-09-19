import { prisma } from '@/lib/db';
import { DEFAULT_FLAGS } from './default-flags';
import { policyId, policyPatch, storedPolicyFlag } from './policy-write-validation';

function isRolledBackConflict(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  if ('code' in error) return error.code === 'P2034';
  if (!('name' in error) || error.name !== 'DriverAdapterError' || !('cause' in error)) {
    return false;
  }
  const cause = error.cause;
  return (
    typeof cause === 'object' &&
    cause !== null &&
    'kind' in cause &&
    cause.kind === 'TransactionWriteConflict' &&
    'originalCode' in cause &&
    cause.originalCode === '40001'
  );
}

export async function readWritablePolicyFlag(id: unknown) {
  const featureId = policyId.parse(id);
  const row = await prisma.featureFlag.findUnique({ where: { id: featureId } });
  if (!row) throw new Error('Unknown feature flag');
  return storedPolicyFlag.parse(row);
}

export async function persistFeaturePolicy(id: unknown, input: unknown): Promise<void> {
  const featureId = policyId.parse(id);
  const patch = policyPatch.parse(input);
  for (let attempt = 0; ; attempt++) {
    try {
      await prisma.$transaction(
        async (tx) => {
          const existing = await tx.featureFlag.findUnique({ where: { id: featureId } });
          const defaults = Object.entries(DEFAULT_FLAGS).find(([key]) => key === featureId)?.[1];
          if (!existing && !defaults) throw new Error('Unknown feature flag');
          const current = existing && storedPolicyFlag.parse(existing);
          const data = {
            ...(patch.status !== undefined && { status: patch.status }),
            ...(patch.enabledPercentage !== undefined && {
              enabledPercentage: patch.enabledPercentage,
            }),
            ...(patch.killSwitch !== undefined && {
              killSwitch: patch.killSwitch,
              killSwitchReason: patch.killSwitch ? patch.killSwitchReason : null,
            }),
            ...(patch.updatedBy !== undefined && { updatedBy: patch.updatedBy }),
            ...(patch.metadata !== undefined && {
              metadata: { ...current?.metadata, ...patch.metadata },
            }),
          };
          if (existing) {
            await tx.featureFlag.update({ where: { id: featureId }, data });
          } else if (defaults) {
            await tx.featureFlag.create({
              data: {
                id: featureId,
                name: defaults.name,
                description: defaults.description,
                status: defaults.status,
                enabledPercentage: defaults.enabledPercentage,
                killSwitch: defaults.killSwitch,
                ...data,
              },
            });
          }
        },
        { isolationLevel: 'Serializable' },
      );
      return;
    } catch (error) {
      if (attempt < 2 && isRolledBackConflict(error)) {
        await new Promise((resolve) => setTimeout(resolve, 10 * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }
}

export async function persistGlobalPolicy(input: unknown): Promise<void> {
  const patch = policyPatch.parse(input);
  if (
    patch.killSwitch === undefined ||
    patch.status !== undefined ||
    patch.enabledPercentage !== undefined ||
    patch.metadata !== undefined
  ) {
    throw new TypeError('Only global kill switch, reason and actor are supported');
  }
  const data = {
    killSwitch: patch.killSwitch,
    killSwitchReason: patch.killSwitch ? patch.killSwitchReason : null,
    ...(patch.updatedBy !== undefined && { updatedBy: patch.updatedBy }),
  };
  await prisma.globalConfig.upsert({
    where: { id: 'global' },
    create: { id: 'global', ...data },
    update: data,
  });
}
