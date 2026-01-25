/**
 * API ROUTE: Admin tier simulation
 * POST: Set a simulated tier for admin testing
 * DELETE: Clear simulated tier
 *
 * Uses HTTP-only cookie to store simulation state.
 * Only admins can set/clear simulated tiers.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth/session-auth";
import { requireAdmin } from "@/lib/auth/require-admin";
import { requireCSRF } from "@/lib/security/csrf";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { TierName } from "@/types/tier-types";
import { SIMULATED_TIER_COOKIE } from "@/lib/auth/cookie-constants";
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

/**
 * POST: Set simulated tier
 * Body: { tier: "trial" | "base" | "pro" }
 */
export async function POST(request: NextRequest) {
  try {
    if (!requireCSRF(request)) {
      return NextResponse.json(
        { error: "Invalid CSRF token" },
        { status: 403 },
      );
    }

    const auth = await validateAuth();

    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminCheck = await requireAdmin(auth.userId);
    if (!adminCheck.authorized) {
      return NextResponse.json({ error: adminCheck.error }, { status: 403 });
    }

    const body = (await request.json()) as { tier: TierName };
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
      adminId: auth.userId,
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
  } catch (error) {
    logger.error("Error setting simulated tier", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to set simulated tier" },
      { status: 500 },
    );
  }
}

/**
 * DELETE: Clear simulated tier
 */
export async function DELETE(request: NextRequest) {
  try {
    if (!requireCSRF(request)) {
      return NextResponse.json(
        { error: "Invalid CSRF token" },
        { status: 403 },
      );
    }

    const auth = await validateAuth();

    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminCheck = await requireAdmin(auth.userId);
    if (!adminCheck.authorized) {
      return NextResponse.json({ error: adminCheck.error }, { status: 403 });
    }

    logger.info("Admin cleared simulated tier", { adminId: auth.userId });

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
  } catch (error) {
    logger.error("Error clearing simulated tier", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to clear simulated tier" },
      { status: 500 },
    );
  }
}

/**
 * GET: Check current simulation status
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await validateAuth();

    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminCheck = await requireAdmin(auth.userId);
    if (!adminCheck.authorized) {
      return NextResponse.json({ error: adminCheck.error }, { status: 403 });
    }

    const simulatedTier = request.cookies.get(SIMULATED_TIER_COOKIE)?.value;

    return NextResponse.json({
      isSimulating: !!simulatedTier,
      simulatedTier: simulatedTier || null,
    });
  } catch (error) {
    logger.error("Error checking simulated tier", { error: String(error) });
    return NextResponse.json(
      { error: "Failed to check simulated tier" },
      { status: 500 },
    );
  }
}
