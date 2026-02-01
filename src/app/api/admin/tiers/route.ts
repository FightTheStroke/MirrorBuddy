import { pipe, withSentry, withCSRF, withAdmin } from "@/lib/api/middlewares";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { tierService } from "@/lib/tier/tier-service";

/**
 * GET /api/admin/tiers
 * Get all tiers
 */
export const GET = pipe(
  withSentry("/api/admin/tiers"),
  withAdmin,
)(async (_ctx) => {
  const tiers = await prisma.tierDefinition.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ tiers });
});
/**
 * POST /api/admin/tiers
 * Create a new tier
 */
export const POST = pipe(
  withSentry("/api/admin/tiers"),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const body = await ctx.req.json();

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
      adminId: ctx.userId || "unknown",
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
});
