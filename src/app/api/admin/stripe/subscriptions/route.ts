/**
 * Stripe Subscriptions API Route
 *
 * GET /api/admin/stripe/subscriptions — List subscriptions with filters
 */

import { NextResponse } from 'next/server';
import { pipe, withSentry, withAdmin } from '@/lib/api/middlewares';
import { listSubscriptions } from '@/lib/admin/stripe-subscriptions-service';

export const GET = pipe(
  withSentry('/api/admin/stripe/subscriptions'),
  withAdmin,
)(async (ctx) => {
  const url = ctx.req.nextUrl;
  const status = url.searchParams.get('status') || undefined;
  const email = url.searchParams.get('email') || undefined;
  const limit = parseInt(url.searchParams.get('limit') || '25', 10);
  const startingAfter =
    url.searchParams.get('starting_after') || undefined;

  const result = await listSubscriptions({
    status,
    email,
    limit: Math.min(limit, 100),
    startingAfter,
  });

  return NextResponse.json(result);
});
