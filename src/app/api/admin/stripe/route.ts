/**
 * Stripe Admin API Route
 *
 * GET /api/admin/stripe — Dashboard data + payment settings
 * POST /api/admin/stripe — Update payment settings (kill switch)
 */

import { NextResponse } from 'next/server';
import { pipe, withSentry, withCSRF, withAdmin } from '@/lib/api/middlewares';
import { getDashboardData } from '@/lib/admin/stripe-admin-service';
import {
  getPaymentSettings,
  updatePaymentSettings,
} from '@/lib/admin/stripe-settings-service';
import { logAdminAction, getClientIp } from '@/lib/admin/audit-service';
import { z } from 'zod';


export const revalidate = 0;
const SettingsSchema = z.object({
  paymentsEnabled: z.boolean(),
});

export const GET = pipe(
  withSentry('/api/admin/stripe'),
  withAdmin,
)(async (_ctx) => {
  const [dashboard, settings] = await Promise.all([
    getDashboardData(),
    getPaymentSettings(),
  ]);

  return NextResponse.json({ ...dashboard, settings });
});

export const POST = pipe(
  withSentry('/api/admin/stripe'),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const body = await ctx.req.json();
  const validation = SettingsSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: validation.error.issues },
      { status: 400 },
    );
  }

  const settings = await updatePaymentSettings(
    validation.data.paymentsEnabled,
    ctx.userId!,
  );

  await logAdminAction({
    action: 'UPDATE_PAYMENT_SETTINGS',
    entityType: 'GlobalConfig',
    entityId: 'global',
    adminId: ctx.userId!,
    details: { paymentsEnabled: validation.data.paymentsEnabled },
    ipAddress: getClientIp(ctx.req),
  });

  return NextResponse.json(settings);
});
