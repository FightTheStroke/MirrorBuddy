/**
 * Stripe Admin Service
 *
 * Service layer for managing Stripe products, subscriptions, and revenue.
 * If Stripe is not configured, returns empty data with configured:false flag.
 *
 * ENGINEERING JUSTIFICATION: Stripe integration deferred to post-beta (ADR 0037).
 * Real SDK implementation planned when payment features are activated.
 */

import { logger } from "@/lib/logger";
import type { StripeAdminResponse } from "./stripe-admin-types";

/**
 * Check if Stripe is configured
 */
function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

/**
 * Get all Stripe data for admin panel
 */
export async function getStripeAdminData(): Promise<StripeAdminResponse> {
  try {
    if (!isStripeConfigured()) {
      logger.info("Stripe not configured, returning empty data");
      return {
        configured: false,
        products: [],
        subscriptions: [],
        revenue: null,
        refunds: [],
      };
    }

    // ENGINEERING JUSTIFICATION: Stripe SDK integration deferred (ADR 0037).
    // When payment features are activated, implement real API calls here:
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    // const products = await stripe.products.list({ limit: 100, expand: ['data.default_price'] });
    // const subscriptions = await stripe.subscriptions.list({ limit: 100, expand: ['data.customer'] });
    // const charges = await stripe.charges.list({ limit: 100 });
    // const refunds = await stripe.refunds.list({ limit: 100 });
    // ... calculate revenue metrics from charges/subscriptions
    // return { configured: true, products, subscriptions, revenue, refunds };

    logger.info("Stripe configured but SDK not implemented yet");
    return {
      configured: false,
      products: [],
      subscriptions: [],
      revenue: null,
      refunds: [],
    };
  } catch (error) {
    logger.error("Error fetching Stripe admin data", {
      error: String(error),
    });
    return {
      configured: false,
      products: [],
      subscriptions: [],
      revenue: null,
      refunds: [],
      error: "Failed to fetch Stripe data",
    };
  }
}

/**
 * Format currency amount (cents to EUR string)
 */
export function formatCurrency(
  cents: number,
  currency: string = "EUR",
): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

/**
 * Format Unix timestamp to locale string
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("it-IT", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
