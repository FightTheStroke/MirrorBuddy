// ============================================================================
// TIER SUBSCRIPTION TYPES - User subscription records and usage tracking
// ============================================================================

import type { TierName, SubscriptionStatus, UsageType } from "./tier-types";

/**
 * User subscription record
 */
export interface UserSubscription {
  /** Unique subscription identifier */
  id: string;

  /** User ID this subscription belongs to */
  userId: string;

  /** Current tier */
  tier: TierName;

  /** Subscription status */
  status: SubscriptionStatus;

  /** When subscription started */
  startDate: Date;

  /** When subscription expires (null if active indefinitely) */
  expiryDate: Date | null;

  /** When the subscription was last renewed */
  renewalDate?: Date;

  /** Next renewal/billing date */
  nextBillingDate?: Date;

  /** Billing cycle: 'monthly' or 'annual' */
  billingCycle: "monthly" | "annual";

  /** Payment method ID (external reference) */
  paymentMethodId?: string;

  /** Invoice ID/reference (external reference) */
  invoiceId?: string;

  /** Cancellation reason if cancelled */
  cancellationReason?: string;

  /** When subscription was cancelled */
  cancelledAt?: Date;

  /** Whether auto-renewal is enabled */
  autoRenew: boolean;

  /** Custom metadata JSON (for future extensions) */
  metadata?: Record<string, unknown>;

  /** When subscription was created */
  createdAt: Date;

  /** When subscription was last updated */
  updatedAt: Date;
}

/**
 * Usage tracking record for a subscription
 */
export interface SubscriptionUsage {
  /** Unique usage record ID */
  id: string;

  /** Subscription ID */
  subscriptionId: string;

  /** Usage type being tracked */
  usageType: UsageType;

  /** Current usage amount */
  amount: number;

  /** Limit for this usage type (null if unlimited) */
  limit: number | null;

  /** Billing period start */
  periodStart: Date;

  /** Billing period end */
  periodEnd: Date;

  /** When usage was reset (null if not reset) */
  resetAt?: Date;

  /** When record was created */
  createdAt: Date;

  /** When record was last updated */
  updatedAt: Date;
}

/**
 * Request to change tier
 */
export interface TierChangeRequest {
  /** Current tier */
  fromTier: TierName;

  /** Target tier */
  toTier: TierName;

  /** When to apply the change ('immediately' or ISO date string) */
  effectiveDate: string;

  /** Proration strategy: 'immediate', 'refund', 'credit' */
  prorationStrategy: "immediate" | "refund" | "credit";
}

/**
 * Trial session limits (for anonymous/trial users)
 */
export interface TrialSessionLimits {
  /** Session duration in minutes (null if unlimited) */
  sessionDurationMinutes: number | null;

  /** Time limit per conversation (minutes) */
  conversationDurationMinutes: number;

  /** IP-based tracking for abuse prevention */
  ipBasedTracking: boolean;

  /** Browser fingerprint tracking */
  fingerprintTracking: boolean;
}
