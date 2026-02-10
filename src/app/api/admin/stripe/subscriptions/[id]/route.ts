/**
 * Stripe Subscription Detail API Route
 *
 * PUT /api/admin/stripe/subscriptions/[id] — Cancel or change plan
 * POST /api/admin/stripe/subscriptions/[id] — Issue refund
 */

import { NextResponse } from 'next/server';
import { pipe, withSentry, withCSRF, withAdmin } from '@/lib/api/middlewares';
import {
  cancelSubscription,
  changeSubscriptionPlan,
  issueRefund,
} from '@/lib/admin/stripe-subscriptions-service';
import { logAdminAction, getClientIp } from '@/lib/admin/audit-service';
import { z } from 'zod';

const ActionSchema = z.object({
  action: z.enum(['cancel', 'change_plan']),
  cancelAtPeriodEnd: z.boolean().optional().default(true),
  newPriceId: z.string().optional(),
});

const RefundSchema = z.object({
  chargeId: z.string().min(1),
  amount: z.number().int().positive().optional(),
  reason: z
    .enum(['duplicate', 'fraudulent', 'requested_by_customer'])
    .optional(),
});

export const PUT = pipe(
  withSentry('/api/admin/stripe/subscriptions/[id]'),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const id = (await ctx.params).id;
  const body = await ctx.req.json();
  const validation = ActionSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: validation.error.issues },
      { status: 400 },
    );
  }

  const { action, cancelAtPeriodEnd, newPriceId } = validation.data;

  let subscription;
  if (action === 'cancel') {
    subscription = await cancelSubscription(id, cancelAtPeriodEnd);
  } else if (action === 'change_plan' && newPriceId) {
    subscription = await changeSubscriptionPlan(id, newPriceId);
  } else {
    return NextResponse.json(
      { error: 'newPriceId required for change_plan' },
      { status: 400 },
    );
  }

  await logAdminAction({
    action: action === 'cancel' ? 'CANCEL_SUBSCRIPTION' : 'CHANGE_PLAN',
    entityType: 'StripeSubscription',
    entityId: id,
    adminId: ctx.userId!,
    details: { action, cancelAtPeriodEnd, newPriceId },
    ipAddress: getClientIp(ctx.req),
  });

  return NextResponse.json(subscription);
});

export const POST = pipe(
  withSentry('/api/admin/stripe/subscriptions/[id]'),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const id = (await ctx.params).id;
  const body = await ctx.req.json();
  const validation = RefundSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: validation.error.issues },
      { status: 400 },
    );
  }

  const refund = await issueRefund(validation.data);

  await logAdminAction({
    action: 'ISSUE_REFUND',
    entityType: 'StripeSubscription',
    entityId: id,
    adminId: ctx.userId!,
    details: { refundId: refund.id, amount: refund.amount },
    ipAddress: getClientIp(ctx.req),
  });

  return NextResponse.json(refund, { status: 201 });
});
