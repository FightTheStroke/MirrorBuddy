// ============================================================================
// API ROUTE: GET /api/waitlist/unsubscribe
// Unsubscribe from waitlist using a one-click token link (no auth required).
// Rate-limited: 10 requests per IP per hour.
// ============================================================================

import { NextResponse } from 'next/server';
import { pipe, withSentry, withRateLimit } from '@/lib/api/middlewares';
import { unsubscribe } from '@/lib/waitlist/waitlist-service';

/** 10 requests per IP per hour */
const RATE_LIMIT_CONFIG = { maxRequests: 10, windowMs: 60 * 60 * 1000 } as const;

/** Threshold (ms) to classify an unsubscribedAt timestamp as "just set" vs pre-existing. */
const FRESH_THRESHOLD_MS = 10_000;

export const GET = pipe(
  withSentry('/api/waitlist/unsubscribe'),
  withRateLimit(RATE_LIMIT_CONFIG),
)(async (ctx) => {
  const { searchParams } = new URL(ctx.req.url);
  const token = searchParams.get('token');

  if (!token || token.trim() === '') {
    return NextResponse.redirect(new URL('/waitlist/unsubscribe?status=not_found', ctx.req.url));
  }

  try {
    const entry = await unsubscribe(token.trim());
    const locale = entry.locale ?? 'it';

    // Determine if this was a fresh unsubscribe or already done previously.
    // The service sets unsubscribedAt idempotently (keeps existing value on repeat calls).
    const isAlready =
      entry.unsubscribedAt !== null &&
      Date.now() - new Date(entry.unsubscribedAt).getTime() > FRESH_THRESHOLD_MS;

    const status = isAlready ? 'already' : 'success';
    return NextResponse.redirect(
      new URL(`/${locale}/waitlist/unsubscribe?status=${status}`, ctx.req.url),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message === 'Invalid unsubscribe token') {
      return NextResponse.redirect(new URL('/waitlist/unsubscribe?status=not_found', ctx.req.url));
    }
    // Re-throw unexpected errors so withSentry can handle them
    throw err;
  }
});
