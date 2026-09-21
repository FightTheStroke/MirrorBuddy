import type { FeatureFlagStatus } from './types';

export interface PolicyState {
  safetyKnown?: boolean;
  killSwitch: boolean;
  killSwitchReason?: string | null;
  status: FeatureFlagStatus;
  enabledPercentage: number;
  metadata?: Record<string, unknown>;
  updatedBy?: string;
}

export type PolicyPatch = Partial<Omit<PolicyState, 'safetyKnown'>>;
export type PolicyWriteSource = 'admin' | 'degradation' | 'voice-cost';

export interface PolicyActivationToken {
  readonly key: string;
  readonly source: PolicyWriteSource;
  readonly generation: number;
}

export interface PolicyWriteReceipt {
  persistence: 'confirmed' | 'skipped';
  superseded: boolean;
  scope: 'instance';
  effective: PolicyState;
}

export interface PolicyWriteOperation {
  activation?: PolicyActivationToken;
  completion: Promise<PolicyWriteReceipt>;
}

export class PolicyWriteError extends Error {
  readonly code = 'FLAG_POLICY_WRITE_UNCONFIRMED';
  readonly persistence = 'unconfirmed';
  readonly scope = 'instance';

  constructor(
    readonly effective: PolicyState,
    cause: unknown,
  ) {
    super('Feature policy persistence could not be confirmed', { cause });
    this.name = 'PolicyWriteError';
  }
}

export function restrictivePatch(state: PolicyState, patch: PolicyPatch): PolicyPatch {
  return {
    ...(patch.killSwitch === true && {
      killSwitch: true,
      killSwitchReason: patch.killSwitchReason,
    }),
    ...((patch.status === 'disabled' ||
      (patch.status === 'degraded' &&
        state.status === 'enabled' &&
        state.enabledPercentage === 100 &&
        (patch.enabledPercentage === undefined || patch.enabledPercentage === 100))) && {
      status: patch.status,
    }),
    ...(patch.enabledPercentage !== undefined &&
      patch.enabledPercentage < state.enabledPercentage && {
        enabledPercentage: patch.enabledPercentage,
      }),
  };
}

export function isBlocked(state: PolicyState): boolean {
  return state.killSwitch || state.status !== 'enabled' || state.enabledPercentage < 100;
}
