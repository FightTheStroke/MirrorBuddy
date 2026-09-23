/**
 * POST /api/devices/pair-code
 *
 * Authenticated user generates a short-lived 6-digit pairing code to bind a
 * Reachy Mini robot to their MirrorBuddy account. Body: { label?: string }.
 */
import { NextResponse } from 'next/server';
import { pipe, withSentry, withCSRF, withAuth, withRateLimit } from '@/lib/api/middlewares';
import { RATE_LIMITS } from '@/lib/rate-limit';
import { createPairingCode } from '@/lib/devices/device-service';
import { isDevicePairingUnavailable } from '@/lib/devices/pairing-pepper';

export const revalidate = 0;

const PAIRING_UNAVAILABLE = { error: 'Device pairing is temporarily unavailable' };

export const POST = pipe(
  withSentry('/api/devices/pair-code'),
  withCSRF,
  withAuth,
  withRateLimit(RATE_LIMITS.DEVICE_PAIR_CODE),
)(async (ctx) => {
  const userId = ctx.userId!;

  let label: string | undefined;
  try {
    const body: unknown = await ctx.req.json();
    if (body && typeof (body as { label?: unknown }).label === 'string') {
      label = (body as { label: string }).label;
    }
  } catch {
    // No/invalid body is fine — label is optional.
  }

  let pairing: Awaited<ReturnType<typeof createPairingCode>>;
  try {
    pairing = await createPairingCode(userId, label);
  } catch (error) {
    if (isDevicePairingUnavailable(error)) {
      return NextResponse.json(PAIRING_UNAVAILABLE, { status: 503 });
    }
    throw error;
  }
  const { code, expiresAt } = pairing;
  return NextResponse.json({ code, expiresAt: expiresAt.toISOString() });
});
