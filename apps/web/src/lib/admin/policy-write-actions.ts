import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getFlag,
  updateFlag,
  activateKillSwitch,
  deactivateKillSwitch,
  setGlobalKillSwitch,
} from '@/lib/feature-flags';
import { policyId, policyPatch } from '@/lib/feature-flags/policy-write-validation';
import { requireConfirmedPolicy } from '@/lib/feature-flags/policy-write-outcome';
import { logAdminAction } from './audit-service';
import { policyWriteFailure } from './policy-write-response';

const request = z.union([
  z.object({ featureId: policyId, update: policyPatch }).strict(),
  z
    .object({
      featureId: policyId,
      global: z.literal(false).optional(),
      enabled: z.boolean(),
      reason: z.string().max(2000).optional(),
    })
    .strict(),
  z
    .object({
      global: z.literal(true),
      enabled: z.boolean(),
      reason: z.string().max(2000).optional(),
    })
    .strict(),
]);

export async function handleFeaturePolicyMutation(input: unknown, adminId: string) {
  try {
    const body = request.parse(input);
    const featureId = 'featureId' in body ? body.featureId : undefined;
    const pending =
      'update' in body
        ? updateFlag(body.featureId, { ...body.update, updatedBy: adminId })
        : 'featureId' in body
          ? body.enabled
            ? activateKillSwitch(body.featureId, body.reason || 'API request', adminId)
            : deactivateKillSwitch(body.featureId, adminId)
          : setGlobalKillSwitch(body.enabled, body.reason || 'API request', adminId);
    const receipt = requireConfirmedPolicy(await pending);
    await logAdminAction({
      action: 'UPDATE_FEATURE_POLICY',
      entityType: 'FeatureFlag',
      entityId: featureId ?? 'global',
      adminId,
      details: { persistence: receipt.persistence, effective: receipt.effective },
    });
    return NextResponse.json({
      success: true,
      ...receipt,
      ...('update' in body
        ? { flag: { ...getFlag(body.featureId), ...receipt.effective } }
        : featureId
          ? { featureId, killSwitch: receipt.effective.killSwitch }
          : { globalKillSwitch: receipt.effective.killSwitch }),
    });
  } catch (error) {
    return policyWriteFailure(error);
  }
}

export async function handleFeaturePolicyStop(id: unknown, reason: string, adminId: string) {
  return handleFeaturePolicyMutation({ featureId: id, enabled: true, reason }, adminId);
}
