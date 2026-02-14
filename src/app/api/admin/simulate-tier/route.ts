/**
 * API ROUTE: Admin tier simulation
 * POST: Set a simulated tier for admin testing
 * DELETE: Clear simulated tier
 *
 * Uses HTTP-only cookie to store simulation state.
 * Only admins can set/clear simulated tiers.
 */

import { pipe, withSentry, withCSRF, withAdmin } from "@/lib/api/middlewares";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { TierName } from "@/types/tier-types";
import { SIMULATED_TIER_COOKIE } from "@/lib/auth";

export const revalidate = 0;
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

/**
 * POST: Set simulated tier
 * Body: { tier: "trial" | "base" | "pro" }
 */
export const POST = pipe(
  withSentry("/api/admin/simulate-tier"),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  const body = (await ctx.req.json()) as { tier: TierName };
  const { tier } = body;

  if (!tier || !["trial", "base", "pro"].includes(tier)) {
    return NextResponse.json(
      { error: "Invalid tier. Must be: trial, base, or pro" },
      { status: 400 },
    );
  }

  // Verify tier exists in database
  const tierExists = await prisma.tierDefinition.findFirst({
    where: {
      OR: [{ code: tier }, { name: tier }],
      isActive: true,
    },
    select: { id: true, code: true, name: true },
  });

  if (!tierExists) {
    return NextResponse.json(
      { error: `Tier '${tier}' not found in database` },
      { status: 404 },
    );
  }

  logger.info("Admin simulating tier", {
    adminId: ctx.userId,
    simulatedTier: tier,
  });

  const response = NextResponse.json({
    success: true,
    simulatedTier: tier,
    message: `Now simulating ${tier} tier. Refresh page to see changes.`,
  });

  // Set HTTP-only cookie
  response.cookies.set(SIMULATED_TIER_COOKIE, tier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  return response;
});
/**
 * DELETE: Clear simulated tier
 */
export const DELETE = pipe(
  withSentry("/api/admin/simulate-tier"),
  withCSRF,
  withAdmin,
)(async (ctx) => {
  logger.info("Admin cleared simulated tier", { adminId: ctx.userId });

  const response = NextResponse.json({
    success: true,
    message: "Simulated tier cleared. Back to real tier.",
  });

  // Clear the cookie
  response.cookies.set(SIMULATED_TIER_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });

  return response;
});

/**
 * GET: Check current simulation status
 */
export const GET = pipe(
  withSentry("/api/admin/simulate-tier"),
  withAdmin,
)(async (ctx) => {
  const simulatedTier = ctx.req.cookies.get(SIMULATED_TIER_COOKIE)?.value;

  return NextResponse.json({
    isSimulating: !!simulatedTier,
    simulatedTier: simulatedTier || null,
  });
});
