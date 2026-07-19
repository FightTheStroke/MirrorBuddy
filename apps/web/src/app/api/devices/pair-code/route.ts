/**
 * POST /api/devices/pair-code
 *
 * Authenticated user generates a short-lived 6-digit pairing code to bind a
 * Reachy Mini robot to their MirrorBuddy account. Body: { label?: string }.
 */
import { NextResponse } from "next/server";
import {
  pipe,
  withSentry,
  withCSRF,
  withAuth,
  withRateLimit,
} from "@/lib/api/middlewares";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { createPairingCode } from "@/lib/devices/device-service";

export const revalidate = 0;

export const POST = pipe(
  withSentry("/api/devices/pair-code"),
  withCSRF,
  withAuth,
  withRateLimit(RATE_LIMITS.DEVICE_PAIR_CODE),
)(async (ctx) => {
  const userId = ctx.userId!;

  let label: string | undefined;
  try {
    const body: unknown = await ctx.req.json();
    if (body && typeof (body as { label?: unknown }).label === "string") {
      label = (body as { label: string }).label;
    }
  } catch {
    // No/invalid body is fine — label is optional.
  }

  const { code, expiresAt } = await createPairingCode(userId, label);
  return NextResponse.json({ code, expiresAt: expiresAt.toISOString() });
});
