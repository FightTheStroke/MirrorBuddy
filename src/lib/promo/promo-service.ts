/**
 * PromoService - Waitlist early-bird promo code validation and redemption
 *
 * Handles:
 * - validateCode(code): Find WaitlistEntry by promoCode, verify not redeemed, not expired
 * - redeemCode(code, userId): Transactional redeem — mark WaitlistEntry + upsert UserSubscription
 *
 * Promo type: 'waitlist_early_bird' | Duration: 30 days from redemption
 */

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { TierCode } from '@/lib/tier';

const log = logger.child({ module: 'promo-service' });

const PROMO_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PromoValidationResult {
  valid: boolean;
  /** Populated when valid=true */
  entry?: {
    id: string;
    email: string;
    promoCode: string;
  };
  /** Populated when valid=false */
  reason?: 'NOT_FOUND' | 'ALREADY_REDEEMED' | 'EXPIRED';
}

export interface PromoRedemptionResult {
  success: boolean;
  promoExpiresAt?: Date;
  subscriptionId?: string;
}

// ---------------------------------------------------------------------------
// validateCode
// ---------------------------------------------------------------------------

/**
 * Validate a promo code without redeeming it.
 *
 * Returns valid=true when:
 *  - A WaitlistEntry with this promoCode exists
 *  - promoRedeemedAt is null (not yet redeemed)
 *  - verifiedAt is set (email verified)
 *
 * @param code - Uppercase alphanumeric promo code (8 chars)
 */
export async function validateCode(code: string): Promise<PromoValidationResult> {
  if (!code?.trim()) {
    return { valid: false, reason: 'NOT_FOUND' };
  }

  try {
    const entry = await prisma.waitlistEntry.findUnique({
      where: { promoCode: code.trim().toUpperCase() },
      select: {
        id: true,
        email: true,
        promoCode: true,
        promoRedeemedAt: true,
        verifiedAt: true,
      },
    });

    if (!entry || !entry.promoCode) {
      return { valid: false, reason: 'NOT_FOUND' };
    }

    // Email must be verified to have a valid promo code
    if (!entry.verifiedAt) {
      return { valid: false, reason: 'NOT_FOUND' };
    }

    if (entry.promoRedeemedAt !== null) {
      return { valid: false, reason: 'ALREADY_REDEEMED' };
    }

    return {
      valid: true,
      entry: {
        id: entry.id,
        email: entry.email,
        promoCode: entry.promoCode,
      },
    };
  } catch (err) {
    log.error('validateCode error', { code, error: String(err) });
    return { valid: false, reason: 'NOT_FOUND' };
  }
}

// ---------------------------------------------------------------------------
// redeemCode
// ---------------------------------------------------------------------------

/**
 * Redeem a promo code for a registered user.
 *
 * Transactional steps:
 * 1. Find and lock WaitlistEntry by promoCode
 * 2. Verify not redeemed (guard against race conditions)
 * 2.5. Reject if user already has an active Stripe subscription (non-combinable)
 * 3. Find Pro tier in TierDefinition
 * 4. Mark WaitlistEntry: promoRedeemedAt=now, convertedUserId=userId
 * 5. Upsert UserSubscription: promoType='waitlist_early_bird',
 *    stripeSubscriptionId=null, expiresAt=now+30days, status=ACTIVE
 * 6. Log to TierAuditLog
 *
 * @param code   - Promo code to redeem
 * @param userId - The authenticated user redeeming the code
 */
export async function redeemCode(code: string, userId: string): Promise<PromoRedemptionResult> {
  if (!code?.trim() || !userId?.trim()) {
    throw new Error('code and userId are required');
  }

  const normalizedCode = code.trim().toUpperCase();

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Find the entry
      const entry = await tx.waitlistEntry.findUnique({
        where: { promoCode: normalizedCode },
        select: {
          id: true,
          promoCode: true,
          promoRedeemedAt: true,
          verifiedAt: true,
        },
      });

      if (!entry || !entry.promoCode) {
        throw new Error('PROMO_NOT_FOUND');
      }
      if (!entry.verifiedAt) {
        throw new Error('PROMO_NOT_FOUND');
      }
      if (entry.promoRedeemedAt !== null) {
        throw new Error('PROMO_ALREADY_REDEEMED');
      }

      // 2.5. Reject if user has an active Stripe subscription (non-combinable with promo)
      const existingSubscription = await tx.userSubscription.findUnique({
        where: { userId },
        select: { id: true, stripeSubscriptionId: true, status: true },
      });

      if (existingSubscription?.stripeSubscriptionId && existingSubscription.status === 'ACTIVE') {
        throw new Error('PROMO_STRIPE_CONFLICT');
      }

      // 3. Find Pro tier
      const proTier = await tx.tierDefinition.findUnique({
        where: { code: TierCode.PRO },
        select: { id: true },
      });

      if (!proTier) {
        throw new Error('PROMO_TIER_NOT_FOUND');
      }

      const now = new Date();
      const promoExpiresAt = new Date(now.getTime() + PROMO_DURATION_MS);

      // 4. Mark WaitlistEntry as redeemed
      await tx.waitlistEntry.update({
        where: { promoCode: normalizedCode },
        data: {
          promoRedeemedAt: now,
          convertedUserId: userId,
        },
      });

      // 5. Upsert UserSubscription with waitlist_early_bird promo
      const subscription = await tx.userSubscription.upsert({
        where: { userId },
        update: {
          tierId: proTier.id,
          status: 'ACTIVE',
          stripeSubscriptionId: null,
          expiresAt: promoExpiresAt,
          overrideFeatures: { promoType: 'waitlist_early_bird' },
          startedAt: now,
        },
        create: {
          userId,
          tierId: proTier.id,
          status: 'ACTIVE',
          stripeSubscriptionId: null,
          expiresAt: promoExpiresAt,
          overrideFeatures: { promoType: 'waitlist_early_bird' },
          startedAt: now,
        },
      });

      // 6. Log to TierAuditLog
      await tx.tierAuditLog.create({
        data: {
          userId,
          adminId: 'system-promo',
          action: 'PROMO_REDEEM',
          changes: {
            promoCode: normalizedCode,
            promoType: 'waitlist_early_bird',
            newTierId: proTier.id,
            expiresAt: promoExpiresAt.toISOString(),
          },
          notes: `waitlist_early_bird promo code redeemed: ${normalizedCode}`,
        },
      });

      return { promoExpiresAt, subscriptionId: subscription.id };
    });

    log.info('Promo code redeemed', {
      code: normalizedCode,
      userId,
      promoExpiresAt: result.promoExpiresAt,
    });

    return {
      success: true,
      promoExpiresAt: result.promoExpiresAt,
      subscriptionId: result.subscriptionId,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (
      message === 'PROMO_NOT_FOUND' ||
      message === 'PROMO_ALREADY_REDEEMED' ||
      message === 'PROMO_TIER_NOT_FOUND' ||
      message === 'PROMO_STRIPE_CONFLICT'
    ) {
      throw err;
    }

    log.error('redeemCode error', { code: normalizedCode, userId, error: message });
    throw new Error('PROMO_REDEMPTION_FAILED');
  }
}
