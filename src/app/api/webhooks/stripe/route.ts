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
import { prisma } from "@/lib/db";
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
  const userId = session.metadata?.userId || session.client_reference_id;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!userId) {
    logger.warn("Checkout completed but no userId in metadata", {
      sessionId: session.id,
    });
    return;
  }

  logger.info("Checkout completed", {
    sessionId: session.id,
    customerId,
    userId,
    subscriptionId,
  });

  const priceId = session.line_items?.data[0]?.price?.id;
  if (!priceId) {
    logger.error("No price ID in checkout session", { sessionId: session.id });
    return;
  }

  const tier = await prisma.tierDefinition.findFirst({
    where: { stripePriceId: priceId },
  });

  if (!tier) {
    logger.error("No tier found for price ID", { priceId });
    return;
  }

  await prisma.userSubscription.upsert({
    where: { userId },
    update: {
      tierId: tier.id,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      status: "ACTIVE",
      startedAt: new Date(),
      expiresAt: null,
    },
    create: {
      userId,
      tierId: tier.id,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      status: "ACTIVE",
      startedAt: new Date(),
    },
  });

  logger.info("User subscription activated", { userId, tierCode: tier.code });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const status = subscription.status;

  logger.info("Subscription updated", {
    subscriptionId: subscription.id,
    customerId,
    status,
  });

  const userSub = await prisma.userSubscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!userSub) {
    logger.warn("Subscription update for unknown user", {
      subscriptionId: subscription.id,
    });
    return;
  }

  let dbStatus: "ACTIVE" | "CANCELLED" | "PAUSED" = "ACTIVE";
  if (status === "canceled" || status === "unpaid") {
    dbStatus = "CANCELLED";
  } else if (status === "paused") {
    dbStatus = "PAUSED";
  }

  await prisma.userSubscription.update({
    where: { id: userSub.id },
    data: { status: dbStatus },
  });

  logger.info("User subscription status updated", {
    userId: userSub.userId,
    status: dbStatus,
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  logger.info("Subscription deleted", {
    subscriptionId: subscription.id,
    customerId,
  });

  const userSub = await prisma.userSubscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!userSub) {
    logger.warn("Subscription delete for unknown user", {
      subscriptionId: subscription.id,
    });
    return;
  }

  const baseTier = await prisma.tierDefinition.findUnique({
    where: { code: "base" },
  });

  if (!baseTier) {
    logger.error("Base tier not found, cannot downgrade");
    return;
  }

  await prisma.userSubscription.update({
    where: { id: userSub.id },
    data: {
      tierId: baseTier.id,
      status: "CANCELLED",
      expiresAt: new Date(),
    },
  });

  logger.info("User downgraded to Base tier", { userId: userSub.userId });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const subscriptionId = (invoice as { subscription?: string }).subscription;

  logger.info("Payment failed", {
    invoiceId: invoice.id,
    customerId,
    subscriptionId,
    amountDue: invoice.amount_due,
  });

  if (!subscriptionId) {
    logger.warn("Payment failed but no subscription ID", {
      invoiceId: invoice.id,
    });
    return;
  }

  const userSub = await prisma.userSubscription.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (!userSub) {
    logger.warn("Payment failed for unknown subscription", { subscriptionId });
    return;
  }

  const gracePeriodEnd = new Date();
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);

  await prisma.userSubscription.update({
    where: { id: userSub.id },
    data: {
      status: "PAUSED",
      expiresAt: gracePeriodEnd,
    },
  });

  logger.info("User subscription paused, 7-day grace period", {
    userId: userSub.userId,
    gracePeriodEnd,
  });
}
