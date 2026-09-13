/**
 * Real-time User Activity Tracking Endpoint
 *
 * Records user activity to the database for serverless-safe metrics.
 * Called by client-side tracking hook on page navigation.
 *
 * POST /api/telemetry/activity
 * Body: { route: string, activityId: string }
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { pipe, withSentry, withCSRF, withAuth } from '@/lib/api/middlewares';
import { safeReadJson } from '@/lib/api/safe-json';
import { activityPayloadSchema } from '@/lib/telemetry/ingestion-contract';
import {
  canCollectOptionalAnalytics,
  optionalAnalyticsDenied,
} from '@/lib/telemetry/optional-analytics-server';

export const revalidate = 0;

export const POST = pipe(
  withSentry('/api/telemetry/activity'),
  withCSRF,
  withAuth,
)(async (ctx) => {
  if (!(await canCollectOptionalAnalytics(ctx.userId))) return optionalAnalyticsDenied();
  const parsed = activityPayloadSchema.safeParse(await safeReadJson(ctx.req));
  if (!parsed.success)
    return NextResponse.json({ error: 'Invalid activity payload' }, { status: 400 });
  const { route, activityId } = parsed.data;
  // An ephemeral, consent-scoped random ID; never read or copy authentication cookies.
  const identifier = `activity_${activityId}`;

  // Record activity in database
  await prisma.userActivity.create({
    data: {
      identifier,
      userType: 'logged',
      route,
      isTestData: process.env.E2E_TESTS === '1' || ctx.userId?.startsWith('e2e-test-') === true,
    },
  });

  return NextResponse.json({ ok: true }, { status: 200 });
});
