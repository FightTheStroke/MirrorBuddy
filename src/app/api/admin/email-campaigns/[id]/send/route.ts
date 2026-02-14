/**
 * POST /api/admin/email-campaigns/[id]/send
 *
 * Trigger sending of an email campaign to recipients.
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
import { sendCampaign } from "@/lib/email/campaign-service";
import { logAdminAction, getClientIp } from "@/lib/admin/audit-service";

/**
 * POST /api/admin/email-campaigns/[id]/send
 * Trigger campaign send to recipients
 */

export const revalidate = 0;
export const POST = pipe(
  withSentry("/api/admin/email-campaigns/[id]/send"),
  withCSRF,
  withAdmin,
)(async (ctx: MiddlewareContext) => {
  try {
    const { id } = await ctx.params;

    // Ensure admin user ID is available
    if (!ctx.userId) {
      return NextResponse.json(
        { error: "Admin user ID not found in context" },
        { status: 401 },
      );
    }

    // Trigger campaign send (async operation)
    await sendCampaign(id);

    // Log admin action
    await logAdminAction({
      action: "SEND_EMAIL_CAMPAIGN",
      entityType: "EmailCampaign",
      entityId: id,
      adminId: ctx.userId,
      details: { campaignId: id },
      ipAddress: getClientIp(ctx.req),
    });

    return NextResponse.json({
      success: true,
      message: "Campaign send initiated successfully",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: `Failed to send email campaign: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    );
  }
});
