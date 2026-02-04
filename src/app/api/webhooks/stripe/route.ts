/**
 * Stripe Webhook Handler
 * POST /api/webhooks/stripe
 *
 * Handles:
 * - checkout.session.completed
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - invoice.payment_failed
 *
 * Note: Webhooks don't require auth/CSRF, only signature verification
 */

import { NextResponse } from "next/server";
import { pipe, withSentry } from "@/lib/api/middlewares";
import { stripeService } from "@/lib/stripe";
import { logger } from "@/lib/logger";
import Stripe from "stripe";

export const POST = pipe(withSentry("/api/webhooks/stripe"))(async (ctx) => {
  const body = await ctx.req.text();
  const signature = ctx.req.headers.get("stripe-signature");

  if (!signature) {
    logger.warn("Stripe webhook missing signature");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = await stripeService.constructWebhookEvent(body, signature);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Stripe webhook signature verification failed", {
      error: message,
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  logger.info("Stripe webhook received", { type: event.type, id: event.id });

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        logger.info("Unhandled webhook event type", { type: event.type });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("Webhook handler error", { type: event.type, error: message });
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
});

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  logger.info("Checkout completed", {
    sessionId: session.id,
    customerId: session.customer,
    userId: session.metadata?.userId,
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  logger.info("Subscription updated", {
    subscriptionId: subscription.id,
    customerId: subscription.customer,
    status: subscription.status,
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  logger.info("Subscription deleted", {
    subscriptionId: subscription.id,
    customerId: subscription.customer,
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  logger.info("Payment failed", {
    invoiceId: invoice.id,
    customerId: invoice.customer,
    amountDue: invoice.amount_due,
  });
}
