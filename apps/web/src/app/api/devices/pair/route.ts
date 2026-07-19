/**
 * POST /api/devices/pair
 *
 * The robot redeems a 6-digit pairing code for a long-lived device token.
 * Body: { code: string }. Returns { token, deviceId }.
 */
import { NextResponse } from "next/server";
import { pipe, withSentry, withRateLimit } from "@/lib/api/middlewares";
import { RATE_LIMITS, checkRateLimitAsync } from "@/lib/rate-limit";
import { redeemPairingCode } from "@/lib/devices/device-service";

export const revalidate = 0;

// SECURITY: machine endpoint. The robot authenticates with the one-time pairing
// code itself and has no browser session or cookies, so cookie-based CSRF does not
// apply. Brute-force is bounded by (1) the strict per-IP DEVICE_PAIR rate limit,
// (2) a global DEVICE_PAIR_GLOBAL ceiling that holds even if per-IP keying is
// defeated by a spoofed proxy header, and (3) the code's 10-minute expiry. Codes
// are single-use and stored only as sha256 hashes; redemption is atomic.
export const POST = pipe(
  withSentry("/api/devices/pair"),
  withRateLimit(RATE_LIMITS.DEVICE_PAIR),
)(async (ctx) => {
  // Deployment-independent global brute-force ceiling (constant key, all clients).
  const global = await checkRateLimitAsync("device-pair:global", RATE_LIMITS.DEVICE_PAIR_GLOBAL);
  if (!global.success) {
    return NextResponse.json({ error: "Too many attempts, try again later" }, { status: 429 });
  }

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
