import { NextRequest, NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/auth/session-auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { tierService } from "@/lib/tier/tier-service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/tiers/[id]
 * Get a single tier by ID
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await validateAdminAuth();
    if (!auth.authenticated || !auth.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    const tier = await prisma.tierDefinition.findUnique({
      where: { id },
    });

    if (!tier) {
      return NextResponse.json({ error: "Tier not found" }, { status: 404 });
    }

    return NextResponse.json(tier);
  } catch (error) {
    console.error("Error fetching tier:", error);
    return NextResponse.json(
      { error: "Failed to fetch tier" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/tiers/[id]
 * Update a tier
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const auth = await validateAdminAuth();
    if (!auth.authenticated || !auth.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();

    // Check if tier exists
    const existing = await prisma.tierDefinition.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Tier not found" }, { status: 404 });
    }

    // Store old values for audit
    const oldValues = {
      name: existing.name,
      description: existing.description,
      monthlyPriceEur: existing.monthlyPriceEur,
      sortOrder: existing.sortOrder,
      isActive: existing.isActive,
    };

    // Update tier (code cannot be changed)
    const tier = await prisma.tierDefinition.update({
      where: { id },
      data: {
        name: body.name || existing.name,
        description:
          body.description !== undefined
            ? body.description
            : existing.description,
        monthlyPriceEur:
          body.monthlyPriceEur !== null && body.monthlyPriceEur !== undefined
            ? new Prisma.Decimal(body.monthlyPriceEur)
            : existing.monthlyPriceEur,
        sortOrder:
          body.sortOrder !== undefined ? body.sortOrder : existing.sortOrder,
        isActive:
          body.isActive !== undefined ? body.isActive : existing.isActive,
        chatLimitDaily:
          body.chatLimitDaily !== undefined
            ? body.chatLimitDaily
            : existing.chatLimitDaily,
        voiceMinutesDaily:
          body.voiceMinutesDaily !== undefined
            ? body.voiceMinutesDaily
            : existing.voiceMinutesDaily,
        toolsLimitDaily:
          body.toolsLimitDaily !== undefined
            ? body.toolsLimitDaily
            : existing.toolsLimitDaily,
        docsLimitTotal:
          body.docsLimitTotal !== undefined
            ? body.docsLimitTotal
            : existing.docsLimitTotal,
        chatModel: body.chatModel || existing.chatModel,
        realtimeModel: body.realtimeModel || existing.realtimeModel,
        features:
          body.features !== undefined ? body.features : existing.features,
        availableMaestri:
          body.availableMaestri !== undefined
            ? body.availableMaestri
            : existing.availableMaestri,
        availableCoaches:
          body.availableCoaches !== undefined
            ? body.availableCoaches
            : existing.availableCoaches,
        availableBuddies:
          body.availableBuddies !== undefined
            ? body.availableBuddies
            : existing.availableBuddies,
        availableTools:
          body.availableTools !== undefined
            ? body.availableTools
            : existing.availableTools,
        stripePriceId:
          body.stripePriceId !== undefined
            ? body.stripePriceId
            : existing.stripePriceId,
      },
    });

    // Log the action
    await prisma.tierAuditLog.create({
      data: {
        tierId: tier.id,
        adminId: auth.userId || "unknown",
        action: "TIER_UPDATE",
        changes: {
          old: oldValues,
          new: {
            name: tier.name,
            description: tier.description,
            monthlyPriceEur: tier.monthlyPriceEur,
            sortOrder: tier.sortOrder,
            isActive: tier.isActive,
          },
        },
      },
    });

    // Invalidate cache for this specific tier
    tierService.invalidateTierCache(tier.id);

    return NextResponse.json({ success: true, tier });
  } catch (error) {
    console.error("Error updating tier:", error);
    return NextResponse.json(
      { error: "Failed to update tier" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/tiers/[id]
 * Delete a tier (optional - only if not used by any subscriptions)
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const auth = await validateAdminAuth();
    if (!auth.authenticated || !auth.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    // Check if tier exists
    const existing = await prisma.tierDefinition.findUnique({
      where: { id },
      include: {
        subscriptions: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Tier not found" }, { status: 404 });
    }

    // Prevent deletion if tier has active subscriptions
    if (existing.subscriptions.length > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete tier with active subscriptions. Please reassign users first.",
        },
        { status: 409 },
      );
    }

    // Delete tier
    await prisma.tierDefinition.delete({
      where: { id },
    });

    // Log the action
    await prisma.tierAuditLog.create({
      data: {
        tierId: id,
        adminId: auth.userId || "unknown",
        action: "TIER_DELETE",
        changes: {
          deleted: {
            code: existing.code,
            name: existing.name,
          },
        },
      },
    });

    // Invalidate cache for deleted tier
    tierService.invalidateTierCache(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting tier:", error);
    return NextResponse.json(
      { error: "Failed to delete tier" },
      { status: 500 },
    );
  }
}
