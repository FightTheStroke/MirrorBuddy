import { pipe, withSentry, withCSRF, withAdmin, withAdminReadOnly } from '@/lib/api/middlewares';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { subscriptionTelemetry } from '@/lib/analytics/subscription-telemetry';

export const revalidate = 0;
export const GET = pipe(
  withSentry('/api/admin/subscriptions/[id]'),
  withAdminReadOnly,
)(async (ctx) => {
  const { id: subscriptionId } = await ctx.params;
  const subscription = await prisma.userSubscription.findUnique({
    where: { id: subscriptionId },
    include: { tier: true },
  });
  if (!subscription) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
  }
  return NextResponse.json(subscription);
});

export const PUT = pipe(
  withSentry('/api/admin/subscriptions/[id]'),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const body = await ctx.req.json();
  const { id: subscriptionId } = await ctx.params;
  const { status, expiresAt, overrideLimits, overrideFeatures, notes } = body;
  if (!status && !expiresAt && !overrideLimits && !overrideFeatures) {
    return NextResponse.json({ error: 'At least one field must be provided' }, { status: 400 });
  }
  const existing = await prisma.userSubscription.findUnique({
    where: { id: subscriptionId },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
  }
  const updateData: Record<string, unknown> = {};
  if (status) updateData.status = status;
  if (expiresAt) updateData.expiresAt = new Date(expiresAt);
  if (overrideLimits !== undefined) updateData.overrideLimits = overrideLimits;
  if (overrideFeatures !== undefined) updateData.overrideFeatures = overrideFeatures;
  if (notes !== undefined) updateData.notes = notes;
  const subscription = await prisma.userSubscription.update({
    where: { id: subscriptionId },
    data: updateData,
    include: { tier: true },
  });
  if (status && status !== existing.status) {
    subscriptionTelemetry.track({
      type: 'subscription.cancelled',
      userId: subscription.userId,
      tierId: subscription.tierId,
      previousTierId: null,
      timestamp: new Date(),
      metadata: {
        subscriptionId: subscription.id,
        previousStatus: existing.status,
        newStatus: subscription.status,
        adminId: ctx.userId || 'unknown',
      },
    });
  }
  return NextResponse.json(subscription);
});

export const DELETE = pipe(
  withSentry('/api/admin/subscriptions/[id]'),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const { id: subscriptionId } = await ctx.params;
  const subscription = await prisma.userSubscription.findUnique({
    where: { id: subscriptionId },
  });
  if (!subscription) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
  }
  await prisma.userSubscription.delete({ where: { id: subscriptionId } });
  subscriptionTelemetry.track({
    type: 'subscription.cancelled',
    userId: subscription.userId,
    tierId: subscription.tierId,
    previousTierId: null,
    timestamp: new Date(),
    metadata: {
      subscriptionId: subscription.id,
      status: subscription.status,
      reason: 'admin_deletion',
      adminId: ctx.userId || 'unknown',
    },
  });
  return NextResponse.json({ success: true });
});
