import { getFlag, policyWrites, registerWritablePolicyFlag } from './feature-flags-policy';
import {
  persistFeaturePolicy,
  persistGlobalPolicy,
  readWritablePolicyFlag,
} from './policy-write-persistence';
import { policyId, policyPatch } from './policy-write-validation';
import type {
  PolicyActivationToken,
  PolicyWriteOperation,
  PolicyWriteSource,
} from './policy-write-types';

export async function prepareWritablePolicy(id: unknown): Promise<void> {
  const featureId = policyId.parse(id);
  if (!getFlag(featureId)) registerWritablePolicyFlag(await readWritablePolicyFlag(featureId));
}

function validateSource(source: PolicyWriteSource): void {
  if (!['admin', 'degradation', 'voice-cost'].includes(source)) {
    throw new TypeError('A policy write source is required');
  }
}

export function beginFeaturePolicyWrite(
  id: unknown,
  input: unknown,
  source: PolicyWriteSource,
  token?: PolicyActivationToken,
): PolicyWriteOperation {
  const featureId = policyId.parse(id);
  const patch = policyPatch.parse(input);
  validateSource(source);
  if (!getFlag(featureId))
    throw new Error('Unknown feature flag; prepare its database policy first');
  return policyWrites.write(
    `feature:${featureId}`,
    patch,
    source,
    (update) => persistFeaturePolicy(featureId, update),
    token,
  );
}

export function beginGlobalPolicyWrite(
  input: unknown,
  source: PolicyWriteSource,
  token?: PolicyActivationToken,
): PolicyWriteOperation {
  const patch = policyPatch.parse(input);
  validateSource(source);
  if (
    patch.killSwitch === undefined ||
    patch.status !== undefined ||
    patch.enabledPercentage !== undefined ||
    patch.metadata !== undefined
  ) {
    throw new TypeError('Only global kill switch, reason and actor are supported');
  }
  return policyWrites.write('global', patch, source, persistGlobalPolicy, token);
}
