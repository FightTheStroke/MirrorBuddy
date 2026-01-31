/**
 * Stripe Admin Service
 *
 * Service layer for managing Stripe products, subscriptions, and revenue.
 * If Stripe is not configured, returns mock data for demo purposes.
 *
 * ENGINEERING JUSTIFICATION: Mock data intentional for MVP beta phase.
 * Stripe integration deferred to post-beta (ADR 0037 - Deferred Production Items).
 * Mock data allows admin UI development without Stripe dependency.
 * Real SDK implementation planned when payment features are activated.
 */

import { logger } from "@/lib/logger";
import type {
  StripeProduct,
  StripeSubscription,
  StripeRevenue,
  StripeRefund,
  StripeAdminResponse,
} from "./stripe-admin-types";

/**
 * Check if Stripe is configured
 */
function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

/**
 * Get mock products for demo
 */
function getMockProducts(): StripeProduct[] {
  return [
    {
      id: "prod_demo_pro",
      name: "MirrorBuddy Pro",
      description: "Full access to all Maestri, tools, and premium features",
      active: true,
      metadata: { tier: "pro" },
      created: Date.now() / 1000 - 86400 * 30, // 30 days ago
      prices: [
        {
          id: "price_demo_pro_monthly",
          productId: "prod_demo_pro",
          currency: "eur",
          unitAmount: 999, // 9.99 EUR
          recurring: { interval: "month", intervalCount: 1 },
          active: true,
          metadata: {},
        },
        {
          id: "price_demo_pro_yearly",
          productId: "prod_demo_pro",
          currency: "eur",
          unitAmount: 9990, // 99.90 EUR
          recurring: { interval: "year", intervalCount: 1 },
          active: true,
          metadata: {},
        },
      ],
    },
    {
      id: "prod_demo_base",
      name: "MirrorBuddy Base",
      description: "Free tier with limited access",
      active: true,
      metadata: { tier: "base" },
      created: Date.now() / 1000 - 86400 * 60, // 60 days ago
      prices: [
        {
          id: "price_demo_base_free",
          productId: "prod_demo_base",
          currency: "eur",
          unitAmount: 0,
          recurring: null,
          active: true,
          metadata: {},
        },
      ],
    },
  ];
}

/**
 * Get mock subscriptions for demo
 */
function getMockSubscriptions(): StripeSubscription[] {
  const now = Date.now() / 1000;
  return [
    {
      id: "sub_demo_001",
      customerId: "cus_demo_001",
      customerEmail: "user1@example.com",
      status: "active",
      currentPeriodStart: now - 86400 * 15, // 15 days ago
      currentPeriodEnd: now + 86400 * 15, // 15 days from now
      cancelAtPeriodEnd: false,
      items: [{ priceId: "price_demo_pro_monthly", quantity: 1 }],
      metadata: { userId: "user_001" },
      created: now - 86400 * 15,
    },
    {
      id: "sub_demo_002",
      customerId: "cus_demo_002",
      customerEmail: "user2@example.com",
      status: "active",
      currentPeriodStart: now - 86400 * 5, // 5 days ago
      currentPeriodEnd: now + 86400 * 25, // 25 days from now
      cancelAtPeriodEnd: false,
      items: [{ priceId: "price_demo_pro_monthly", quantity: 1 }],
      metadata: { userId: "user_002" },
      created: now - 86400 * 35,
    },
    {
      id: "sub_demo_003",
      customerId: "cus_demo_003",
      customerEmail: "user3@example.com",
      status: "canceled",
      currentPeriodStart: now - 86400 * 20,
      currentPeriodEnd: now - 86400 * 10,
      cancelAtPeriodEnd: true,
      items: [{ priceId: "price_demo_pro_monthly", quantity: 1 }],
      metadata: { userId: "user_003" },
      created: now - 86400 * 50,
    },
  ];
}

/**
 * Get mock revenue metrics for demo
 */
function getMockRevenue(): StripeRevenue {
  return {
    mrr: 1998, // 2 active subscriptions * 9.99 EUR
    arr: 23976, // MRR * 12
    totalRevenue: 5994, // 3 months of revenue
    activeSubscriptions: 2,
    canceledThisMonth: 1,
    newThisMonth: 2,
    currency: "eur",
  };
}

/**
 * Get mock refunds for demo
 */
function getMockRefunds(): StripeRefund[] {
  const now = Date.now() / 1000;
  return [
    {
      id: "re_demo_001",
      amount: 999,
      currency: "eur",
      status: "succeeded",
      reason: "requested_by_customer",
      chargeId: "ch_demo_001",
      created: now - 86400 * 7, // 7 days ago
      metadata: {},
    },
  ];
}

/**
 * Get all Stripe data for admin panel
 */
export async function getStripeAdminData(): Promise<StripeAdminResponse> {
  try {
    if (!isStripeConfigured()) {
      logger.warn("Stripe not configured, returning mock data");
      return {
        configured: false,
        products: getMockProducts(),
        subscriptions: getMockSubscriptions(),
        revenue: getMockRevenue(),
        refunds: getMockRefunds(),
      };
    }

    // ENGINEERING JUSTIFICATION: Stripe SDK integration deferred (ADR 0037).
    // Uncomment when payment features are activated:
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    // const products = await stripe.products.list({ limit: 100, expand: ['data.default_price'] });
    // const subscriptions = await stripe.subscriptions.list({ limit: 100, expand: ['data.customer'] });
    // ... etc

    logger.info(
      "Stripe configured but SDK not implemented yet, using mock data",
    );
    return {
      configured: false, // Set to true when real SDK is implemented
      products: getMockProducts(),
      subscriptions: getMockSubscriptions(),
      revenue: getMockRevenue(),
      refunds: getMockRefunds(),
    };
  } catch (error) {
    logger.error("Error fetching Stripe admin data", {
      error: String(error),
    });
    return {
      configured: false,
      products: [],
      subscriptions: [],
      revenue: {
        mrr: 0,
        arr: 0,
        totalRevenue: 0,
        activeSubscriptions: 0,
        canceledThisMonth: 0,
        newThisMonth: 0,
        currency: "eur",
      },
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
