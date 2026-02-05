/**
 * Stripe Admin Types
 *
 * Type definitions for Stripe admin panel.
 * Used for viewing products, subscriptions, and revenue metrics.
 */

/**
 * Stripe product with associated prices
 */
export interface StripeProduct {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  prices: StripePrice[];
  metadata: Record<string, string>;
  created: number; // Unix timestamp
}

/**
 * Stripe price (one-time or recurring)
 */
export interface StripePrice {
  id: string;
  productId: string;
  currency: string;
  unitAmount: number; // Amount in cents
  recurring: {
    interval: "day" | "week" | "month" | "year";
    intervalCount: number;
  } | null;
  active: boolean;
  metadata: Record<string, string>;
}

/**
 * Stripe subscription with customer info
 */
export interface StripeSubscription {
  id: string;
  customerId: string;
  customerEmail: string | null;
  status:
    | "active"
    | "canceled"
    | "incomplete"
    | "incomplete_expired"
    | "past_due"
    | "trialing"
    | "unpaid";
  currentPeriodStart: number; // Unix timestamp
  currentPeriodEnd: number; // Unix timestamp
  cancelAtPeriodEnd: boolean;
  items: {
    priceId: string;
    quantity: number;
  }[];
  metadata: Record<string, string>;
  created: number; // Unix timestamp
}

/**
 * Revenue metrics summary
 */
export interface StripeRevenue {
  mrr: number; // Monthly Recurring Revenue in cents
  arr: number; // Annual Recurring Revenue in cents
  totalRevenue: number; // Total all-time revenue in cents
  activeSubscriptions: number;
  canceledThisMonth: number;
  newThisMonth: number;
  currency: string;
}

/**
 * Stripe refund record
 */
export interface StripeRefund {
  id: string;
  amount: number; // Amount in cents
  currency: string;
  status: "succeeded" | "failed" | "pending" | "canceled";
  reason: string | null;
  chargeId: string;
  created: number; // Unix timestamp
  metadata: Record<string, string>;
}

/**
 * Admin API response for Stripe overview
 */
export interface StripeAdminResponse {
  configured: boolean;
  products: StripeProduct[];
  subscriptions: StripeSubscription[];
  revenue: StripeRevenue | null;
  refunds: StripeRefund[];
  error?: string;
}

/**
 * Status badge variant for subscriptions
 */
export type SubscriptionStatusVariant =
  | "active"
  | "canceled"
  | "past_due"
  | "trialing"
  | "incomplete";
