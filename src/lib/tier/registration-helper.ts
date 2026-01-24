/**
 * Registration Helper - Tier Assignment
 * Plan 073: T4-07 - Update registration flow: default to Base tier
 *
 * Handles automatic Base tier assignment when new users register.
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { TierCode } from "./types";

/**
 * Assign Base tier subscription to a newly registered user
 *
 * @param userId - The ID of the newly created user
 * @returns The created subscription, or null if assignment failed
 */
export async function assignBaseTierToNewUser(
  userId: string,
): Promise<{ id: string; tierId: string } | null> {
  try {
    // Check if user already has a subscription
    const existingSubscription = await prisma.userSubscription.findUnique({
      where: { userId },
    });

    if (existingSubscription) {
      logger.info("User already has subscription, skipping tier assignment", {
        userId,
        existingSubscriptionId: existingSubscription.id,
      });
      return null;
    }

    // Find Base tier
    const baseTier = await prisma.tierDefinition.findUnique({
      where: { code: TierCode.BASE },
    });

    if (!baseTier) {
      logger.warn("Base tier not found in database, cannot assign tier", {
        userId,
        expectedCode: TierCode.BASE,
      });
      return null;
    }

    // Create subscription with Base tier
    const subscription = await prisma.userSubscription.create({
      data: {
        userId,
        tierId: baseTier.id,
        status: "ACTIVE",
        startedAt: new Date(),
        expiresAt: null, // No expiration for Base tier
      },
    });

    logger.info("Base tier assigned to new user", {
      userId,
      subscriptionId: subscription.id,
      tierId: baseTier.id,
    });

    return subscription;
  } catch (error) {
    logger.error("Failed to assign Base tier to new user", {
      userId,
      error: String(error),
    });
    return null;
  }
}
