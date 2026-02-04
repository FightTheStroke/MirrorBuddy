/**
 * StripeService - Singleton for Stripe server/client operations
 *
 * Server-side: Full Stripe SDK with secret key
 * Client-side: Stripe.js for checkout/payment UI
 *
 * Environment variables:
 * - STRIPE_SECRET_KEY (server)
 * - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (client)
 * - STRIPE_WEBHOOK_SECRET (webhook verification)
 */

import Stripe from "stripe";
import { loadStripe, type Stripe as StripeClient } from "@stripe/stripe-js";
import { logger } from "@/lib/logger";

class StripeService {
  private static instance: StripeService;
  private stripeServer: Stripe | null = null;
  private stripeClientPromise: Promise<StripeClient | null> | null = null;

  private constructor() {
    if (typeof window === "undefined") {
      this.initServerStripe();
    } else {
      this.initClientStripe();
    }
  }

  static getInstance(): StripeService {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService();
    }
    return StripeService.instance;
  }

  private initServerStripe(): void {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      logger.warn("STRIPE_SECRET_KEY not set, Stripe server features disabled");
      return;
    }

    this.stripeServer = new Stripe(secretKey, {
      apiVersion: "2026-01-28.clover",
      typescript: true,
    });

    logger.info("Stripe server SDK initialized");
  }

  private initClientStripe(): void {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      logger.warn("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY not set");
      return;
    }

    this.stripeClientPromise = loadStripe(publishableKey);
  }

  getServerClient(): Stripe {
    if (!this.stripeServer) {
      throw new Error(
        "Stripe server client not initialized. Check STRIPE_SECRET_KEY.",
      );
    }
    return this.stripeServer;
  }

  async getClientStripe(): Promise<StripeClient | null> {
    if (!this.stripeClientPromise) {
      throw new Error(
        "Stripe client not initialized. Check NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.",
      );
    }
    return this.stripeClientPromise;
  }

  getWebhookSecret(): string {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      throw new Error("STRIPE_WEBHOOK_SECRET not configured");
    }
    return secret;
  }

  async createCheckoutSession(params: {
    priceId: string;
    email: string;
    userId?: string;
    successUrl: string;
    cancelUrl: string;
    locale?: string;
  }): Promise<Stripe.Checkout.Session> {
    const stripe = this.getServerClient();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: params.priceId,
          quantity: 1,
        },
      ],
      customer_email: params.email,
      client_reference_id: params.userId,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      locale:
        (params.locale as Stripe.Checkout.SessionCreateParams.Locale) || "auto",
      automatic_tax: { enabled: true },
      billing_address_collection: "required",
      metadata: {
        userId: params.userId || "",
      },
    });

    logger.info("Checkout session created", {
      sessionId: session.id,
      email: params.email,
    });
    return session;
  }

  async createCustomerPortalSession(params: {
    customerId: string;
    returnUrl: string;
  }): Promise<Stripe.BillingPortal.Session> {
    const stripe = this.getServerClient();

    const session = await stripe.billingPortal.sessions.create({
      customer: params.customerId,
      return_url: params.returnUrl,
    });

    logger.info("Customer portal session created", {
      customerId: params.customerId,
    });
    return session;
  }

  async constructWebhookEvent(
    payload: string | Buffer,
    signature: string,
  ): Promise<Stripe.Event> {
    const stripe = this.getServerClient();
    const webhookSecret = this.getWebhookSecret();

    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }

  async syncProduct(params: {
    name: string;
    description: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Product> {
    const stripe = this.getServerClient();

    const existingProducts = await stripe.products.list({
      limit: 100,
    });

    const existing = existingProducts.data.find(
      (p) => p.metadata.tierCode === params.metadata?.tierCode,
    );

    if (existing) {
      return stripe.products.update(existing.id, {
        name: params.name,
        description: params.description,
        metadata: params.metadata,
      });
    }

    return stripe.products.create({
      name: params.name,
      description: params.description,
      metadata: params.metadata,
    });
  }

  async syncPrice(params: {
    productId: string;
    amount: number;
    currency: string;
    interval: "month" | "year";
    metadata?: Record<string, string>;
  }): Promise<Stripe.Price> {
    const stripe = this.getServerClient();

    const existingPrices = await stripe.prices.list({
      product: params.productId,
      active: true,
      limit: 100,
    });

    const matchingPrice = existingPrices.data.find(
      (p) =>
        p.unit_amount === params.amount &&
        p.currency === params.currency &&
        p.recurring?.interval === params.interval,
    );

    if (matchingPrice) {
      return matchingPrice;
    }

    return stripe.prices.create({
      product: params.productId,
      unit_amount: params.amount,
      currency: params.currency,
      recurring: { interval: params.interval },
      metadata: params.metadata,
    });
  }
}

export const stripeService = StripeService.getInstance();
