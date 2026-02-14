/**
 * Stripe Webhook Event Detail API Route
 *
 * POST /api/admin/stripe/webhooks/[id] — Retry webhook event
 */

import { NextResponse } from 'next/server';
import { pipe, withSentry, withCSRF, withAdmin } from '@/lib/api/middlewares';
import {
  getEventDetail,
  retryEvent,
} from '@/lib/admin/stripe-webhooks-service';
import { logAdminAction, getClientIp } from '@/lib/admin/audit-service';


export const revalidate = 0;
export const GET = pipe(
  withSentry('/api/admin/stripe/webhooks/[id]'),
  withAdmin,
)(async (ctx) => {
  const id = (await ctx.params).id;
  const event = await getEventDetail(id);
  return NextResponse.json(event);
});

export const POST = pipe(
  withSentry('/api/admin/stripe/webhooks/[id]'),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const id = (await ctx.params).id;

  await retryEvent(id);

  await logAdminAction({
    action: 'RETRY_WEBHOOK',
    entityType: 'StripeWebhookEvent',
    entityId: id,
    adminId: ctx.userId!,
    ipAddress: getClientIp(ctx.req),
  });

  return NextResponse.json({ retried: true });
});
