/**
 * Sentry Tier Context Management
 *
 * Sets Sentry user context with subscription tier and status for:
 * - Error filtering by tier in Sentry dashboard
 * - Understanding tier distribution in error incidents
 * - Tier-specific error correlation analysis
 *
 * Usage:
 * ```typescript
 * // In API routes or middleware after auth
 * import { setSentryTierContext } from '@/lib/observability/sentry-tier-context';
 *
 * const { userId } = await getSession();
 * await setSentryTierContext(userId);
 * ```
 */

import * as Sentry from "@sentry/nextjs";
import { tierService } from "@/lib/tier/tier-service";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

interface SentryTierContext {
  tier: string; // 'trial', 'base', 'pro'
  subscriptionStatus: string; // 'active', 'trial', 'expired', 'cancelled', 'paused', 'none', 'unknown'
  tierId?: string;
  subscriptionId?: string;
}

/**
 * Set Sentry user context with tier and subscription information
 *
 * @param userId - User ID, null for anonymous users
 * @throws Never - errors are caught and logged, not re-thrown
 */
export async function setSentryTierContext(
  userId: string | null,
): Promise<void> {
  try {
    const tierContext = await getTierContext(userId);

    // Set user context in Sentry for error filtering
    Sentry.setUser({
      id: userId || "anonymous",
      tier: tierContext.tier,
      subscriptionStatus: tierContext.subscriptionStatus,
      ...(tierContext.tierId && { tierId: tierContext.tierId }),
      ...(tierContext.subscriptionId && {
        subscriptionId: tierContext.subscriptionId,
      }),
    });

    logger.debug("Sentry tier context set", {
      userId: userId || "anonymous",
      tier: tierContext.tier,
      subscriptionStatus: tierContext.subscriptionStatus,
    });
  } catch (error) {
    // Silently fail - don't block request if Sentry context update fails
    logger.error("Failed to set Sentry tier context", {
      userId: userId || "anonymous",
      error: String(error),
    });
  }
}

/**
 * Get tier context for a user
 *
 * @param userId - User ID, null for anonymous users
 * @returns Tier context with code and subscription status
 */
async function getTierContext(
  userId: string | null,
): Promise<SentryTierContext> {
  try {
    // Anonymous users are on Trial tier
    if (!userId) {
      return {
        tier: "trial",
        subscriptionStatus: "none",
      };
    }

    // Get user's effective tier
    const tier = await tierService.getEffectiveTier(userId);

    // Get user's subscription
    const subscription = await prisma.userSubscription.findUnique({
      where: { userId },
    });

    // Determine subscription status
    const subscriptionStatus = subscription
      ? subscription.status.toLowerCase()
      : "none";

    return {
      tier: tier.code,
      subscriptionStatus,
      tierId: tier.id,
      subscriptionId: subscription?.id,
    };
  } catch (error) {
    // Error fallback - return safe defaults
    logger.error("Error getting tier context, using fallback", {
      userId,
      error: String(error),
    });

    return {
      tier: userId ? "base" : "trial",
      subscriptionStatus: "unknown",
    };
  }
}
