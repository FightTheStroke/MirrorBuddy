// ============================================================================
// API ROUTE: Parental gate PIN (Issue #432)
// GET    -> { isSet: boolean }            (status; never returns the hash)
// PUT    -> set/replace the parent PIN    (CSRF + auth)
// POST   -> verify a submitted PIN        (CSRF + auth + rate limit)
// ============================================================================

import { NextResponse } from 'next/server';
import { pipe, withSentry, withCSRF, withAuth, withRateLimit } from '@/lib/api/middlewares';
import { getRequestId } from '@/lib/tracing';
import { safeReadJson } from '@/lib/api/safe-json';
import {
  getParentalPinStatus,
  setParentalPin,
  verifyParentalPin,
  isValidPinFormat,
} from '@/lib/parental-gate/pin-service';

export const revalidate = 0;

export const GET = pipe(
  withSentry('/api/user/parental-pin'),
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;
  const status = await getParentalPinStatus(userId);
  const response = NextResponse.json(status);
  response.headers.set('X-Request-ID', getRequestId(ctx.req));
  return response;
});

export const PUT = pipe(
  withSentry('/api/user/parental-pin'),
  withCSRF,
  withAuth,
)(async (ctx) => {
  const userId = ctx.userId!;
  const body = (await safeReadJson(ctx.req)) as { pin?: unknown } | null;
  const pin = body?.pin;

  if (!isValidPinFormat(pin)) {
    const response = NextResponse.json({ error: 'PIN must be 4 to 6 digits' }, { status: 400 });
    response.headers.set('X-Request-ID', getRequestId(ctx.req));
    return response;
  }

  await setParentalPin(userId, pin);
  const response = NextResponse.json({ isSet: true });
  response.headers.set('X-Request-ID', getRequestId(ctx.req));
  return response;
});

export const POST = pipe(
  withSentry('/api/user/parental-pin'),
  withCSRF,
  withAuth,
  withRateLimit({ maxRequests: 10, windowMs: 60_000 }),
)(async (ctx) => {
  const userId = ctx.userId!;
  const body = (await safeReadJson(ctx.req)) as { pin?: unknown } | null;
  const pin = body?.pin;

  if (!isValidPinFormat(pin)) {
    const response = NextResponse.json({ valid: false }, { status: 400 });
    response.headers.set('X-Request-ID', getRequestId(ctx.req));
    return response;
  }

  const valid = await verifyParentalPin(userId, pin);
  const response = NextResponse.json({ valid });
  response.headers.set('X-Request-ID', getRequestId(ctx.req));
  return response;
});
