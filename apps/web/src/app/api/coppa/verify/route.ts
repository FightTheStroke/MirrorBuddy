/**
 * API Route: COPPA Parental Consent Verification
 *
 * POST /api/coppa/verify - Verify parental consent with code
 * GET /api/coppa/verify - Check consent status
 *
 * COPPA compliance for children under 13
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import {
  verifyParentalConsent,
  denyParentalConsentByCode,
  checkCoppaStatus,
} from "@/lib/compliance/server";
import {
  checkRateLimitAsync,
  getClientIdentifier,
  rateLimitResponse,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import { pipe, withSentry, withAuth } from "@/lib/api/middlewares";


export const revalidate = 0;
const VerifySchema = z.object({
  code: z.string().length(6),
  action: z.enum(["approve", "deny"]).default("approve"),
});

/**
 * GET /api/coppa/verify
 * Check COPPA consent status for the current user
 */
export const GET = pipe(
  withSentry("/api/coppa/verify"),
  withAuth,
)(async (ctx) => {
  try {
    const status = await checkCoppaStatus(ctx.userId!);

    return NextResponse.json({
      success: true,
      coppa: {
        requiresConsent: status.requiresConsent,
        consentGranted: status.consentGranted,
        consentPending: status.consentPending,
        age: status.age,
      },
    });
  } catch (error) {
    logger.error("COPPA status check error", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to check COPPA status" },
      { status: 500 },
    );
  }
});

/**
 * POST /api/coppa/verify
 * Verify or deny parental consent with verification code
 *
 * Note: No CSRF required - code-based verification from email link
 */
// eslint-disable-next-line local-rules/require-csrf-mutating-routes -- code-based verification from email
export const POST = pipe(withSentry("/api/coppa/verify"))(async (ctx) => {
  // Rate limit COPPA verification attempts (5 per hour - email costs, strict)
  const clientId = getClientIdentifier(ctx.req);
  const rateLimitResult = await checkRateLimitAsync(
    `coppa:verify:${clientId}`,
    RATE_LIMITS.COPPA,
  );
  if (!rateLimitResult.success) {
    logger.warn("COPPA verification rate limited", { clientId });
    return rateLimitResponse(rateLimitResult);
  }

  try {
    const body = await ctx.req.json();

    const parseResult = VerifySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.issues },
        { status: 400 },
      );
    }

    const { code, action } = parseResult.data;

    // Get IP address for audit logging
    const ipAddress =
      ctx.req.headers.get("x-forwarded-for")?.split(",")[0] ||
      ctx.req.headers.get("x-real-ip") ||
      "unknown";

    if (action === "approve") {
      const result = await verifyParentalConsent(code, ipAddress);

      if (!result.success) {
        return NextResponse.json(
          {
            error: result.error,
            message: getErrorMessage(result.error || "Unknown error"),
          },
          { status: 400 },
        );
      }

      logger.info("COPPA consent verified", {
        userId: result.userId,
        ipAddress,
      });

      return NextResponse.json({
        success: true,
        message:
          "Consenso confermato! Il tuo bambino può ora accedere a MirrorBuddy.",
        userId: result.userId,
      });
    } else {
      // Deny action - directly deny without granting first
      const result = await denyParentalConsentByCode(code, ipAddress);

      if (!result.success) {
        return NextResponse.json(
          {
            error: result.error,
            message: getErrorMessage(result.error || "Unknown error"),
          },
          { status: 400 },
        );
      }

      logger.info("COPPA consent denied by parent", {
        userId: result.userId,
        ipAddress,
      });

      return NextResponse.json({
        success: true,
        message: "Consenso negato. L'account verrà limitato.",
      });
    }
  } catch (error) {
    logger.error("COPPA verification error", { error: String(error) });
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
});

function getErrorMessage(error: string): string {
  switch (error) {
    case "Invalid verification code":
      return "Codice di verifica non valido. Controlla il codice ricevuto via email.";
    case "Verification code expired":
      return "Il codice di verifica è scaduto. Richiedi un nuovo codice.";
    default:
      return "Si è verificato un errore. Riprova più tardi.";
  }
}
