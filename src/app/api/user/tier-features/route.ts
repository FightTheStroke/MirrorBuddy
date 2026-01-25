/**
 * API ROUTE: User tier features
 * GET: Fetch user's tier and available features
 *
 * Supports admin tier simulation via cookie.
 *
 * Returns:
 * - tier: Current user's tier name
 * - features: Record of feature keys to enabled status
 * - isSimulated: Whether tier is being simulated (admin only)
 *
 * Example response:
 * {
 *   "tier": "pro",
 *   "features": {
 *     "chat": true,
 *     "voice": true,
 *     "pdf": true,
 *     "quizzes": false
 *   },
 *   "isSimulated": false
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth/session-auth";
import { tierService } from "@/lib/tier/tier-service";
import { isAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const SIMULATED_TIER_COOKIE = "mirrorbuddy-simulated-tier";

interface TierFeaturesResponse {
  tier: string;
  features: Record<string, boolean>;
  isSimulated?: boolean;
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<TierFeaturesResponse | { error: string }>> {
  try {
    const auth = await validateAuth();
    const userId = auth.authenticated ? auth.userId : null;

    let tier;
    let isSimulated = false;

    // Check for admin tier simulation
    const simulatedTierCode = request.cookies.get(SIMULATED_TIER_COOKIE)?.value;

    if (simulatedTierCode && userId) {
      // Verify user is admin before using simulated tier
      const userIsAdmin = await isAdmin(userId);

      if (userIsAdmin) {
        // Get the simulated tier from database
        const simulatedTier = await prisma.tierDefinition.findFirst({
          where: {
            OR: [{ code: simulatedTierCode }, { name: simulatedTierCode }],
            isActive: true,
          },
        });

        if (simulatedTier) {
          tier = simulatedTier;
          isSimulated = true;
          logger.debug("Admin using simulated tier", {
            adminId: userId,
            simulatedTier: simulatedTierCode,
          });
        }
      }
    }

    // If no simulated tier, get real tier
    if (!tier) {
      tier = await tierService.getEffectiveTier(userId);
    }

    // Extract features from tier
    const features = (tier.features || {}) as Record<string, unknown>;
    const featureFlags: Record<string, boolean> = {};

    // Convert all feature values to booleans
    for (const [key, value] of Object.entries(features)) {
      if (typeof value === "boolean") {
        featureFlags[key] = value;
      } else {
        // Treat truthy/falsy values as boolean
        featureFlags[key] = Boolean(value);
      }
    }

    return NextResponse.json({
      tier: tier.name || tier.code,
      features: featureFlags,
      isSimulated,
    });
  } catch (error) {
    logger.error("Error fetching user tier features", {
      error: String(error),
    });

    return NextResponse.json(
      { error: "Failed to fetch tier features" },
      { status: 500 },
    );
  }
}
