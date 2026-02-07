/**
 * POST /api/admin/email-campaigns/[id]/preview
 *
 * Get recipient preview for an email campaign with filtering.
 * Requires admin authentication and CSRF protection.
 *
 * Reference: ADR 0113 (Composable API Handler Pattern)
 */

import { NextResponse } from "next/server";
import {
  pipe,
  withSentry,
  withCSRF,
  withAdmin,
  type MiddlewareContext,
} from "@/lib/api/middlewares";
import {
  getRecipientPreview,
  type RecipientFilters,
} from "@/lib/email/campaign-service";

/**
 * POST /api/admin/email-campaigns/[id]/preview
 * Get recipient preview with count and sample users
 */
export const POST = pipe(
  withSentry("/api/admin/email-campaigns/[id]/preview"),
  withCSRF,
  withAdmin,
)(async (ctx: MiddlewareContext) => {
  // Parse request body
  let body: {
    filters?: RecipientFilters;
  };

  try {
    body = await ctx.req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 },
    );
  }

  try {
    const { id } = await ctx.params;

    // Get filters from request body (defaults to empty object)
    const filters = body.filters || {};

    // Get recipient preview
    const preview = await getRecipientPreview(filters);

    return NextResponse.json({
      campaignId: id,
      preview,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: `Failed to get recipient preview: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    );
  }
});
