/**
 * GET /api/admin/email-campaigns/[id]/recipients
 *
 * Get recipients for a specific email campaign.
 * Requires admin authentication.
 *
 * Reference: ADR 0113 (Composable API Handler Pattern)
 */

import { NextResponse } from "next/server";
import {
  pipe,
  withSentry,
  withAdmin,
  type MiddlewareContext,
} from "@/lib/api/middlewares";
import { prisma } from "@/lib/db";

/**
 * GET /api/admin/email-campaigns/[id]/recipients
 * Get all recipients for a campaign
 */
export const GET = pipe(
  withSentry("/api/admin/email-campaigns/[id]/recipients"),
  withAdmin,
)(async (ctx: MiddlewareContext) => {
  try {
    const { id } = await ctx.params;

    // Verify campaign exists
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      );
    }

    // Get all recipients
    const recipients = await prisma.emailRecipient.findMany({
      where: { campaignId: id },
      select: {
        id: true,
        email: true,
        status: true,
        sentAt: true,
        deliveredAt: true,
        openedAt: true,
        resendMessageId: true,
      },
      orderBy: {
        sentAt: "desc",
      },
    });

    return NextResponse.json({ recipients });
  } catch (error) {
    return NextResponse.json(
      {
        error: `Failed to get campaign recipients: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    );
  }
});
