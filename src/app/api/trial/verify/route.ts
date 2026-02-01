import { NextResponse } from "next/server";
import { z } from "zod";
import { pipe, withSentry } from "@/lib/api/middlewares";
import { logger } from "@/lib/logger";
import {
  checkRateLimitAsync,
  getClientIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import { verifyTrialEmailCode } from "@/lib/trial/trial-service";

const VerifySchema = z.object({
  sessionId: z.string().min(1),
  code: z.string().min(4).max(12),
});

// eslint-disable-next-line local-rules/require-csrf-mutating-routes -- public verification endpoint, rate-limited, no cookie auth
export const POST = pipe(withSentry("/api/trial/verify"))(async (ctx) => {
  const clientId = getClientIdentifier(ctx.req);
  const rateLimitResult = await checkRateLimitAsync(
    `trial:verify:${clientId}`,
    RATE_LIMITS.COPPA,
  );
  if (!rateLimitResult.success) {
    logger.warn("Trial verification rate limited", { clientId });
    return rateLimitResponse(rateLimitResult);
  }

  const body = await ctx.req.json();
  const parsed = VerifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { sessionId, code } = parsed.data;

  try {
    const result = await verifyTrialEmailCode(sessionId, code);

    return NextResponse.json({
      success: true,
      emailVerifiedAt: result.session.emailVerifiedAt,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Verification failed";
    const status = message.includes("Invalid")
      ? 400
      : message.includes("expired")
        ? 410
        : message.includes("not found")
          ? 404
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
});
