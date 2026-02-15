/**
 * GET /api/admin/email-campaigns/[id]
 *
 * Get email campaign details with recipient statistics.
 * Requires admin authentication.
 *
 * Reference: ADR 0113 (Composable API Handler Pattern)
 */

import { NextResponse } from 'next/server';
import { pipe, withSentry, withAdminReadOnly, type MiddlewareContext } from '@/lib/api/middlewares';
import { getCampaign } from '@/lib/email/campaign-service';
import { prisma } from '@/lib/db';

/**
 * GET /api/admin/email-campaigns/[id]
 * Get campaign details with recipient statistics
 */

export const revalidate = 0;
export const GET = pipe(
  withSentry('/api/admin/email-campaigns/[id]'),
  withAdminReadOnly,
)(async (ctx: MiddlewareContext) => {
  try {
    const { id } = await ctx.params;

    // Get campaign with template details
    const campaign = await getCampaign(id);

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Get recipient statistics
    const recipients = await prisma.emailRecipient.findMany({
      where: { campaignId: id },
      select: {
        status: true,
        deliveredAt: true,
        openedAt: true,
      },
    });

    // Calculate statistics
    const stats = {
      totalSent: recipients.filter((r) => r.status === 'SENT').length,
      totalFailed: recipients.filter((r) => r.status === 'FAILED').length,
      totalDelivered: recipients.filter((r) => r.deliveredAt !== null).length,
      totalOpened: recipients.filter((r) => r.openedAt !== null).length,
    };

    // Return campaign with stats
    return NextResponse.json({
      campaign: {
        ...campaign,
        recipientStats: stats,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: `Failed to get email campaign: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 },
    );
  }
});
