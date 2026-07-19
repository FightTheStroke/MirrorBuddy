/**
 * POST /api/devices/pair
 *
 * The robot redeems a 6-digit pairing code for a long-lived device token.
 * Body: { code: string }. Returns { token, deviceId }.
 */
import { NextResponse } from "next/server";
import { pipe, withSentry, withRateLimit } from "@/lib/api/middlewares";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { redeemPairingCode } from "@/lib/devices/device-service";

export const revalidate = 0;

// eslint-disable-next-line local-rules/require-csrf-mutating-routes -- Machine endpoint: the robot authenticates with the one-time pairing code itself and has no browser session or cookies, so cookie-based CSRF does not apply. Brute-force is bounded by the strict DEVICE_PAIR rate limit and the 10-minute code expiry.
export const POST = pipe(
  withSentry("/api/devices/pair"),
  withRateLimit(RATE_LIMITS.DEVICE_PAIR),
)(async (ctx) => {
  let code = "";
  try {
    const body: unknown = await ctx.req.json();
    if (body && typeof (body as { code?: unknown }).code === "string") {
      code = (body as { code: string }).code;
    }
  } catch {
    // Invalid body -> treated as an invalid code below.
  }

  const result = await redeemPairingCode(code);
  if (!result) {
    return NextResponse.json(
      { error: "Invalid or expired code" },
      { status: 400 },
    );
  }
  return NextResponse.json({ token: result.token, deviceId: result.deviceId });
});
