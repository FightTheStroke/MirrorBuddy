/**
 * Email Unsubscribe API
 *
 * Public endpoint (no auth required) for GDPR-compliant unsubscribe functionality.
 * Validates token and updates email preferences.
 *
 * GET /api/email/unsubscribe?token=xxx&category=yyy
 * - token: Required unsubscribe token
 * - category: Optional specific category (productUpdates, educationalNewsletter, announcements)
 * - If no category: unsubscribe from all categories
 */

import { NextResponse } from "next/server";
import { pipe, withSentry } from "@/lib/api/middlewares";
import { withRateLimit } from "@/lib/api/middlewares/with-rate-limit";
import {
  getPreferencesByToken,
  unsubscribeByToken,
  type EmailCategory,
} from "@/lib/email/preference-service";
import { logger } from "@/lib/logger";

const VALID_CATEGORIES: EmailCategory[] = [
  "productUpdates",
  "educationalNewsletter",
  "announcements",
];

/**
 * GET /api/email/unsubscribe?token=xxx&category=yyy
 * Public endpoint for unsubscribing from email communications
 */
export const GET = pipe(
  withSentry("/api/email/unsubscribe"),
  withRateLimit({
    maxRequests: 10,
    windowMs: 60 * 1000, // 10 per minute
  }),
)(async (ctx) => {
  try {
    const { searchParams } = ctx.req.nextUrl;
    const token = searchParams.get("token");
    const category = searchParams.get("category") as EmailCategory | null;

    // Validate token presence
    if (!token || token.trim() === "") {
      logger.warn("Unsubscribe attempt without token");
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Validate category if provided
    if (category && !VALID_CATEGORIES.includes(category)) {
      logger.warn("Invalid unsubscribe category", { category });
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    // Verify token exists
    const preferences = await getPreferencesByToken(token);
    if (!preferences) {
      logger.warn("Unsubscribe token not found", { token });
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    // Perform unsubscribe
    const updated = await unsubscribeByToken(token, category ?? undefined);

    if (!updated) {
      logger.error("Failed to unsubscribe (service returned null)", {
        token,
        category,
      });
      return NextResponse.json(
        { error: "Failed to unsubscribe" },
        { status: 500 },
      );
    }

    logger.info("User unsubscribed successfully", {
      userId: preferences.userId,
      category: category || "all",
    });

    return NextResponse.json({
      success: true,
      message: category
        ? `Successfully unsubscribed from ${category}`
        : "Successfully unsubscribed from all email categories",
    });
  } catch (error) {
    logger.error("Error in unsubscribe endpoint", {
      error: String(error),
    });
    return NextResponse.json(
      { error: "Failed to unsubscribe" },
      { status: 500 },
    );
  }
});
