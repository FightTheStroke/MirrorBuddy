import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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

export async function POST(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateLimitResult = await checkRateLimitAsync(
    `trial:verify:${clientId}`,
    RATE_LIMITS.COPPA,
  );
  if (!rateLimitResult.success) {
    logger.warn("Trial verification rate limited", { clientId });
    return rateLimitResponse(rateLimitResult);
  }

  try {
    const body = await request.json();
    const parsed = VerifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { sessionId, code } = parsed.data;
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
}
