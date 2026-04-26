/**
 * Email Preferences API
 *
 * Public endpoint (no auth required) for managing email preferences via token.
 * Used by preference center page for GDPR-compliant management.
 *
 * GET /api/email/preferences?token=xxx - Get preferences by token
 * POST /api/email/preferences?token=xxx - Update preferences by token
 */

import { NextResponse } from "next/server";
import { pipe, withSentry } from "@/lib/api/middlewares";
import { withRateLimit } from "@/lib/api/middlewares/with-rate-limit";
import {
  getPreferencesByToken,
  updatePreferences,
  type EmailPreferenceUpdate,
} from "@/lib/email/preference-service";
import { logger } from "@/lib/logger";

/**
 * GET /api/email/preferences?token=xxx
 * Get email preferences by unsubscribe token
 */

export const revalidate = 0;
export const GET = pipe(
  withSentry("/api/email/preferences"),
  withRateLimit({
    maxRequests: 30,
    windowMs: 60 * 1000, // 30 per minute
  }),
)(async (ctx) => {
  try {
    const { searchParams } = ctx.req.nextUrl;
    const token = searchParams.get("token");

    // Validate token
    if (!token || token.trim() === "") {
      logger.warn("Preferences fetch attempt without token");
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Fetch preferences
    const preferences = await getPreferencesByToken(token);

    if (!preferences) {
      logger.warn("Preferences token not found", { token });
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    // Return only the preference fields (exclude sensitive data)
    return NextResponse.json({
      preferences: {
        productUpdates: preferences.productUpdates,
        educationalNewsletter: preferences.educationalNewsletter,
        announcements: preferences.announcements,
      },
      updatedAt: preferences.updatedAt,
    });
  } catch (error) {
    logger.error("Error fetching preferences by token", {
      error: String(error),
    });
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 },
    );
  }
});

/**
 * POST /api/email/preferences?token=xxx
 * Update email preferences by unsubscribe token
 */
// eslint-disable-next-line local-rules/require-csrf-mutating-routes -- Public endpoint with token-based auth (unsubscribe), no session cookies
export const POST = pipe(
  withSentry("/api/email/preferences"),
  withRateLimit({
    maxRequests: 10,
    windowMs: 60 * 1000, // 10 per minute
  }),
)(async (ctx) => {
  try {
    const { searchParams } = ctx.req.nextUrl;
    const token = searchParams.get("token");

    // Validate token
    if (!token || token.trim() === "") {
      logger.warn("Preferences update attempt without token");
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Parse request body
    let body: Partial<EmailPreferenceUpdate>;
    try {
      body = await ctx.req.json();
    } catch {
      logger.warn("Invalid JSON body in preferences update");
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    // Validate body contains at least one valid field
    const validFields = [
      "productUpdates",
      "educationalNewsletter",
      "announcements",
    ];
    const hasValidField = Object.keys(body).some((key) =>
      validFields.includes(key),
    );

    if (!hasValidField) {
      logger.warn("No valid preference fields in update request", { body });
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    // Verify token exists
    const preferences = await getPreferencesByToken(token);
    if (!preferences) {
      logger.warn("Preferences token not found for update", { token });
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    // Update preferences
    const updates: EmailPreferenceUpdate = {};
    if (typeof body.productUpdates === "boolean") {
      updates.productUpdates = body.productUpdates;
    }
    if (typeof body.educationalNewsletter === "boolean") {
      updates.educationalNewsletter = body.educationalNewsletter;
    }
    if (typeof body.announcements === "boolean") {
      updates.announcements = body.announcements;
    }

    const updated = await updatePreferences(preferences.userId, updates);

    logger.info("Preferences updated via token", {
      userId: preferences.userId,
      updates,
    });

    return NextResponse.json({
      success: true,
      preferences: {
        productUpdates: updated.productUpdates,
        educationalNewsletter: updated.educationalNewsletter,
        announcements: updated.announcements,
      },
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    logger.error("Error updating preferences by token", {
      error: String(error),
    });
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 },
    );
  }
});
