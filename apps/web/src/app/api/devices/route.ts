/**
 * GET /api/devices — list the authenticated user's paired robots (no secrets).
 */
import { NextResponse } from "next/server";
import { pipe, withSentry, withAuth, withRateLimit } from "@/lib/api/middlewares";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { listDevices } from "@/lib/devices/device-service";

export const revalidate = 0;

export const GET = pipe(
  withSentry("/api/devices"),
  withAuth,
  withRateLimit(RATE_LIMITS.GENERAL),
)(async (ctx) => {
  const devices = await listDevices(ctx.userId!);
  return NextResponse.json({ devices });
});
