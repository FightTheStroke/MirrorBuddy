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

import { NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth/server";
import { tierService } from "@/lib/tier/server";
import { isAdmin } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { SIMULATED_TIER_COOKIE } from "@/lib/auth/server";
import { pipe, withSentry } from "@/lib/api/middlewares";
import type { MiddlewareContext } from "@/lib/api/middlewares";


export const revalidate = 0;
interface TierFeaturesResponse {
  tier: string;
  features: Record<string, boolean>;
  isSimulated?: boolean;
}

export const GET = pipe(withSentry("/api/user/tier-features"))(async (
  ctx: MiddlewareContext,
): Promise<NextResponse<TierFeaturesResponse | { error: string }>> => {
  const auth = await validateAuth();
  const userId = auth.authenticated ? auth.userId : null;

  let tier;
  let isSimulated = false;

  // Check for admin tier simulation
  const simulatedTierCode = ctx.req.cookies.get(SIMULATED_TIER_COOKIE)?.value;

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
});
