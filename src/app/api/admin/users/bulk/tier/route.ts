import { NextRequest, NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/auth/session-auth";
import { requireCSRF } from "@/lib/security/csrf";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

interface BulkTierChangeResult {
  userId: string;
  success: boolean;
  error?: string;
}

interface BulkTierChangeSummary {
  total: number;
  successful: number;
  failed: number;
}

/**
 * POST /api/admin/users/bulk/tier
 * Change tier for multiple users at once
 */
export async function POST(request: NextRequest) {
  // CSRF protection
  if (!requireCSRF(request)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  try {
    const auth = await validateAdminAuth();
    if (!auth.authenticated || !auth.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { userIds, tierId, notes } = body;

    // Validate required fields
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: "userIds array is required and cannot be empty" },
        { status: 400 },
      );
    }

    if (!tierId) {
      return NextResponse.json(
        { error: "tierId is required" },
        { status: 400 },
      );
    }

    // Check if tier exists
    const newTier = await prisma.tierDefinition.findUnique({
      where: { id: tierId },
    });

    if (!newTier) {
      return NextResponse.json({ error: "Tier not found" }, { status: 404 });
    }

    // Get all users with their current subscriptions
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      include: {
        subscription: {
          include: {
            tier: true,
          },
        },
      },
    });

    // Process each user's tier change
    const results: BulkTierChangeResult[] = [];
    const summary: BulkTierChangeSummary = {
      total: userIds.length,
      successful: 0,
      failed: 0,
    };

    for (const userId of userIds) {
      try {
        const user = users.find((u) => u.id === userId);

        if (!user) {
          results.push({
            userId,
            success: false,
            error: "User not found",
          });
          summary.failed++;
          continue;
        }

        // Upsert user subscription
        await prisma.userSubscription.upsert({
          where: { userId },
          create: {
            userId,
            tierId,
            status: "ACTIVE",
          },
          update: {
            tierId,
            status: "ACTIVE",
          },
        });

        // Create audit log entry
        await prisma.tierAuditLog.create({
          data: {
            userId,
            adminId: auth.userId || "unknown",
            action: "TIER_CHANGE",
            changes: {
              from: user.subscription
                ? {
                    tierId: user.subscription.tierId,
                    tierCode: user.subscription.tier?.code,
                    tierName: user.subscription.tier?.name,
                  }
                : null,
              to: {
                tierId: newTier.id,
                tierCode: newTier.code,
                tierName: newTier.name,
              },
              notes: notes || null,
              bulkOperation: true,
            },
          },
        });

        results.push({
          userId,
          success: true,
        });
        summary.successful++;
      } catch (error) {
        // Use structured logging instead of format string with user input
        logger.error(
          "Error changing tier for user",
          { userId },
          error instanceof Error ? error : undefined,
        );
        results.push({
          userId,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        summary.failed++;
      }
    }

    return NextResponse.json({
      success: true,
      summary,
      results,
    });
  } catch (error) {
    logger.error(
      "Error in bulk tier change",
      { component: "admin-bulk-tier" },
      error,
    );
    return NextResponse.json(
      { error: "Failed to process bulk tier change" },
      { status: 500 },
    );
  }
}
