/**
 * GET /api/admin/email-campaigns
 * POST /api/admin/email-campaigns
 *
 * Admin endpoints for managing email campaigns.
 * Requires admin authentication and CSRF protection (mutations only).
 *
 * Reference: ADR 0113 (Composable API Handler Pattern)
 */

import { NextResponse } from "next/server";
import { pipe, withSentry, withCSRF, withAdmin } from "@/lib/api/middlewares";
import {
  listCampaigns,
  createCampaign,
  type RecipientFilters,
  type CampaignListFilters,
} from "@/lib/email/campaign-service";
import { logAdminAction, getClientIp } from "@/lib/admin/audit-service";

/**
 * GET /api/admin/email-campaigns
 * List all email campaigns with optional status filter
 */

export const revalidate = 0;
export const GET = pipe(
  withSentry("/api/admin/email-campaigns"),
  withAdmin,
)(async (ctx) => {
  try {
    const { searchParams } = new URL(ctx.req.url);
    const status = searchParams.get("status");

    const filters: CampaignListFilters = {};
    if (status && ["DRAFT", "SENDING", "SENT", "FAILED"].includes(status)) {
      filters.status = status as "DRAFT" | "SENDING" | "SENT" | "FAILED";
    }

    const campaigns = await listCampaigns(filters);

    return NextResponse.json({ campaigns });
  } catch (error) {
    return NextResponse.json(
      {
        error: `Failed to list email campaigns: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    );
  }
});

/**
 * POST /api/admin/email-campaigns
 * Create a new email campaign in DRAFT status
 */
export const POST = pipe(
  withSentry("/api/admin/email-campaigns"),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  // Parse request body
  let body: {
    name?: string;
    templateId?: string;
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

  // Validate required fields
  if (!body.name || !body.templateId) {
    return NextResponse.json(
      {
        error: "Missing required fields: name and templateId are required",
      },
      { status: 400 },
    );
  }

  // Filters default to empty object if not provided
  const filters = body.filters || {};

  // Ensure admin user ID is available
  if (!ctx.userId) {
    return NextResponse.json(
      { error: "Admin user ID not found in context" },
      { status: 401 },
    );
  }

  try {
    // Create campaign
    const campaign = await createCampaign(
      body.name,
      body.templateId,
      filters,
      ctx.userId,
    );

    // Log admin action
    await logAdminAction({
      action: "CREATE_EMAIL_CAMPAIGN",
      entityType: "EmailCampaign",
      entityId: campaign.id,
      adminId: ctx.userId,
      details: { name: campaign.name, templateId: campaign.templateId },
      ipAddress: getClientIp(ctx.req),
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: `Failed to create email campaign: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    );
  }
});
