/**
 * DELETE /api/devices/[id] — revoke (unpair) a robot the user owns.
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
import { revokeDevice } from "@/lib/devices/device-service";

export const revalidate = 0;

export const DELETE = pipe(
  withSentry("/api/devices/[id]"),
  withCSRF,
  withAuth,
  withRateLimit(RATE_LIMITS.GENERAL),
)(async (ctx) => {
  const { id } = await ctx.params;
  const revoked = await revokeDevice(ctx.userId!, id);
  if (!revoked) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
});
