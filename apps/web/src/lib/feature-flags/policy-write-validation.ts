import { z } from 'zod';

export const policyId = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[a-zA-Z0-9_-]+$/);
const status = z.enum(['enabled', 'disabled', 'degraded']);
const metadata = z.record(z.string(), z.json());

export const policyPatch = z
  .object({
    killSwitch: z.boolean().optional(),
    killSwitchReason: z.string().max(2_000).nullable().optional(),
    status: status.optional(),
    enabledPercentage: z
      .number()
      .finite()
      .transform((value) => Math.trunc(Math.min(100, Math.max(0, value))))
      .optional(),
    metadata: metadata.optional(),
    updatedBy: z.string().min(1).max(200).optional(),
  })
  .strict()
  .superRefine((patch, ctx) => {
    if (patch.killSwitchReason !== undefined && patch.killSwitch === undefined) {
      ctx.addIssue({ code: 'custom', message: 'A stop reason requires an explicit kill switch' });
    }
    if (patch.killSwitch === true && !patch.killSwitchReason) {
      ctx.addIssue({ code: 'custom', message: 'A stop reason is required' });
    }
    if (
      patch.killSwitch === undefined &&
      patch.status === undefined &&
      patch.enabledPercentage === undefined &&
      !Object.keys(patch.metadata ?? {}).length
    ) {
      ctx.addIssue({ code: 'custom', message: 'At least one policy field is required' });
    }
  })
  .transform((patch) =>
    patch.killSwitch === false ? { ...patch, killSwitchReason: null } : patch,
  );

export const storedPolicyFlag = z
  .object({
    id: policyId,
    name: z.string(),
    description: z.string(),
    status,
    enabledPercentage: z.number().int().min(0).max(100),
    killSwitch: z.boolean(),
    killSwitchReason: z.string().nullable(),
    metadata: metadata.nullable(),
    updatedBy: z.string().nullable(),
    updatedAt: z.date(),
  })
  .transform((flag) => ({
    ...flag,
    metadata: flag.metadata ?? undefined,
    updatedBy: flag.updatedBy ?? undefined,
  }));
