/**
 * GET /api/devices/me
 *
 * The robot fetches the paired child's profile scope using its device token,
 * passed as `Authorization: Bearer <token>`. Read-only; no session/CSRF.
 */
import { NextResponse } from "next/server";
import { pipe, withSentry, withRateLimit } from "@/lib/api/middlewares";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { getDeviceProfile } from "@/lib/devices/device-service";

export const revalidate = 0;

export const GET = pipe(
  withSentry("/api/devices/me"),
  withRateLimit(RATE_LIMITS.DEVICE_ME),
)(async (ctx) => {
  const header = ctx.req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    return NextResponse.json({ error: "Missing device token" }, { status: 401 });
  }

  const profile = await getDeviceProfile(token);
  if (!profile) {
    return NextResponse.json({ error: "Invalid device token" }, { status: 401 });
  }
  return NextResponse.json({ profile });
});
