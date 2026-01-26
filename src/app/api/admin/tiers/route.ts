import { NextRequest, NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/auth/session-auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { tierService } from "@/lib/tier/tier-service";
import { requireCSRF } from "@/lib/security/csrf";
import { logger } from "@/lib/logger";

/**
 * GET /api/admin/tiers
 * Get all tiers
 */
export async function GET(_request: NextRequest) {
  try {
    const auth = await validateAdminAuth();
    if (!auth.authenticated || !auth.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tiers = await prisma.tierDefinition.findMany({
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ tiers });
  } catch (error) {
    logger.error("Error fetching tiers", {}, error as Error);
    return NextResponse.json(
      { error: "Failed to fetch tiers" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/tiers
 * Create a new tier
 */
export async function POST(request: NextRequest) {
  if (!requireCSRF(request)) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }

  try {
    const auth = await validateAdminAuth();
    if (!auth.authenticated || !auth.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.code || !body.name) {
      return NextResponse.json(
        { error: "Code and name are required" },
        { status: 400 },
      );
    }

    // Check if code already exists
    const existing = await prisma.tierDefinition.findUnique({
      where: { code: body.code },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A tier with this code already exists" },
        { status: 409 },
      );
    }

    // Create tier
    const tier = await prisma.tierDefinition.create({
      data: {
        code: body.code,
        name: body.name,
        description: body.description || null,
        monthlyPriceEur:
          body.monthlyPriceEur !== null && body.monthlyPriceEur !== undefined
            ? new Prisma.Decimal(body.monthlyPriceEur)
            : null,
        sortOrder: body.sortOrder || 0,
        isActive: body.isActive ?? true,
        chatLimitDaily: body.chatLimitDaily || 10,
        voiceMinutesDaily: body.voiceMinutesDaily || 5,
        toolsLimitDaily: body.toolsLimitDaily || 10,
        docsLimitTotal: body.docsLimitTotal || 1,
        chatModel: body.chatModel || "gpt-4o-mini",
        realtimeModel: body.realtimeModel || "gpt-realtime-mini",
        features: body.features || {},
        availableMaestri: body.availableMaestri || [],
        availableCoaches: body.availableCoaches || [],
        availableBuddies: body.availableBuddies || [],
        availableTools: body.availableTools || [],
        stripePriceId: body.stripePriceId || null,
      },
    });

    // Log the action
    await prisma.tierAuditLog.create({
      data: {
        tierId: tier.id,
        adminId: auth.userId || "unknown",
        action: "TIER_CREATE",
        changes: {
          new: {
            code: tier.code,
            name: tier.name,
          },
        },
      },
    });

    // Invalidate tier cache to pick up new tier
    tierService.invalidateCache();

    return NextResponse.json({ success: true, tier }, { status: 201 });
  } catch (error) {
    logger.error("Error creating tier", {}, error as Error);
    return NextResponse.json(
      { error: "Failed to create tier" },
      { status: 500 },
    );
  }
}
