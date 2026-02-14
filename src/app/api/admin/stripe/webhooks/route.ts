/**
 * Stripe Webhooks API Route
 *
 * GET /api/admin/stripe/webhooks — List recent webhook events
 */

import { NextResponse } from 'next/server';
import { pipe, withSentry, withAdmin } from '@/lib/api/middlewares';
import { listWebhookEvents } from '@/lib/admin/stripe-webhooks-service';


export const revalidate = 0;
export const GET = pipe(
  withSentry('/api/admin/stripe/webhooks'),
  withAdmin,
)(async (ctx) => {
  const url = ctx.req.nextUrl;
  const limit = parseInt(url.searchParams.get('limit') || '25', 10);
  const startingAfter =
    url.searchParams.get('starting_after') || undefined;
  const type = url.searchParams.get('type') || undefined;

  const result = await listWebhookEvents({
    limit: Math.min(limit, 100),
    startingAfter,
    type,
  });

  return NextResponse.json(result);
});
