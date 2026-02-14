/**
 * Real-time User Activity Tracking Endpoint
 *
 * Records user activity to the database for serverless-safe metrics.
 * Called by client-side tracking hook on page navigation.
 *
 * POST /api/telemetry/activity
 * Body: { route: string }
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';
import { pipe, withSentry } from '@/lib/api/middlewares';
import { safeReadJson } from '@/lib/api/safe-json';
import { AUTH_COOKIE_NAME, VISITOR_COOKIE_NAME } from '@/lib/auth';

export const revalidate = 0;
// eslint-disable-next-line local-rules/require-csrf-mutating-routes -- public telemetry endpoint, accepts anonymous users
export const POST = pipe(withSentry('/api/telemetry/activity'))(async (ctx) => {
  // E2E tests generate a lot of navigation events. Writing each one to the DB can
  // exhaust the connection pool and cause unrelated tests to fail.
  if (process.env.E2E_TESTS === '1') {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const body = await safeReadJson(ctx.req);

  const route =
    body &&
    typeof body === 'object' &&
    'route' in body &&
    typeof (body as { route?: unknown }).route === 'string'
      ? (body as { route: string }).route
      : '/';

  // Get user identification from cookies for classification (not authentication)
  // This endpoint accepts all users (logged, trial, anonymous) and classifies them
  const cookieStore = await cookies();
  // eslint-disable-next-line local-rules/prefer-validate-auth -- Classification only, not authentication. Accepts all user types.
  const userCookie = cookieStore.get(AUTH_COOKIE_NAME);
  const visitorCookie = cookieStore.get(VISITOR_COOKIE_NAME);

  // Determine user type and identifier
  const isAuthenticated = !!userCookie?.value;
  const hasTrialSession = !!visitorCookie?.value;

  const userType = isAuthenticated ? 'logged' : hasTrialSession ? 'trial' : 'anonymous';

  const identifier =
    userCookie?.value || visitorCookie?.value || ctx.req.headers.get('x-request-id') || 'unknown';

  // F-06: Detect test sessions (ADR 0065)
  // E2E tests use identifiers starting with "e2e-test-"
  const isTestData = identifier.startsWith('e2e-test-');

  // Record activity in database
  await prisma.userActivity.create({
    data: {
      identifier,
      userType,
      route,
      isTestData,
    },
  });

  return NextResponse.json({ ok: true }, { status: 200 });
});
