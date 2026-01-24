/**
 * API ROUTE: User tier features
 * GET: Fetch user's tier and available features
 *
 * Returns:
 * - tier: Current user's tier name
 * - features: Record of feature keys to enabled status
 *
 * Example response:
 * {
 *   "tier": "pro",
 *   "features": {
 *     "chat": true,
 *     "voice": true,
 *     "pdf": true,
 *     "quizzes": false
 *   }
 * }
 */

import { NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth/session-auth";
import { tierService } from "@/lib/tier/tier-service";
import { logger } from "@/lib/logger";

interface TierFeaturesResponse {
  tier: string;
  features: Record<string, boolean>;
}

export async function GET(): Promise<
  NextResponse<TierFeaturesResponse | { error: string }>
> {
  try {
    const auth = await validateAuth();
    const userId = auth.authenticated ? auth.userId : null;

    // Get user's effective tier
    const tier = await tierService.getEffectiveTier(userId);

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
