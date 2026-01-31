import { NextRequest, NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/auth/session-auth";
import { requireCSRF } from "@/lib/security/csrf";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * POST /api/admin/users/[id]/tier
 * Change a user's tier subscription
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!requireCSRF(request)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  try {
    const auth = await validateAdminAuth();
    if (!auth.authenticated || !auth.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { tierId, notes } = body;

    // Validate required fields
    if (!tierId) {
      return NextResponse.json(
        { error: "tierId is required" },
        { status: 400 },
      );
    }

    const { id: userId } = await params;

    // Check if user exists and get current subscription
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: {
          include: {
            tier: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if tier exists
    const newTier = await prisma.tierDefinition.findUnique({
      where: { id: tierId },
    });

    if (!newTier) {
      return NextResponse.json({ error: "Tier not found" }, { status: 404 });
    }

    // Upsert user subscription
    const subscription = await prisma.userSubscription.upsert({
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
    const auditLog = await prisma.tierAuditLog.create({
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
        },
        notes: notes || null,
      },
    });

    return NextResponse.json({
      success: true,
      subscription,
      auditLogId: auditLog.id,
    });
  } catch (error) {
    logger.error(
      "Error changing user tier",
      { component: "admin-user-tier" },
      error,
    );
    return NextResponse.json(
      { error: "Failed to change tier" },
      { status: 500 },
    );
  }
}
