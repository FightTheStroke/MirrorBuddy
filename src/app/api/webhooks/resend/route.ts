/**
 * Resend Webhook Handler
 * POST /api/webhooks/resend
 *
 * Handles email delivery events from Resend:
 * - email.delivered: Email successfully delivered to recipient
 * - email.opened: Recipient opened the email
 * - email.bounced: Email bounced (invalid address, mailbox full, etc.)
 * - email.complained: Recipient marked email as spam
 *
 * Webhook signature verification using Resend SDK (svix).
 * No auth/CSRF middleware (webhooks use signature verification instead).
 *
 * Requirements:
 * - RESEND_WEBHOOK_SECRET environment variable
 * - Rate limited to 100 requests per window
 */

import { NextResponse } from "next/server";
import { Webhook } from "svix";
import {
  pipe,
  withSentry,
  type MiddlewareContext,
} from "@/lib/api/middlewares";
import { withRateLimit } from "@/lib/api/middlewares/with-rate-limit";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { Prisma } from "@prisma/client";


export const revalidate = 0;
const log = logger.child({ module: "webhooks:resend" });

// Resend webhook event types
type ResendWebhookEvent = {
  type:
    | "email.delivered"
    | "email.opened"
    | "email.bounced"
    | "email.complained"
    | string;
  data: {
    email_id: string;
    to: string;
    [key: string]: unknown;
  };
};

export const POST = pipe(
  withSentry("/api/webhooks/resend"),
  withRateLimit({ maxRequests: 100, windowMs: 60 * 1000 }),
)(async (ctx: MiddlewareContext) => {
  // Get webhook secret from environment
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

  if (!webhookSecret) {
    log.error("Webhook secret not configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  // Get raw request body for signature verification
  const body = await ctx.req.text();

  // Get svix headers for signature verification
  const svixId = ctx.req.headers.get("svix-id");
  const svixTimestamp = ctx.req.headers.get("svix-timestamp");
  const svixSignature = ctx.req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    log.warn("Webhook missing required svix headers");
    return NextResponse.json(
      { error: "Missing signature headers" },
      { status: 400 },
    );
  }

  // Verify webhook signature using Resend SDK
  const webhook = new Webhook(webhookSecret);

  let event: ResendWebhookEvent;

  try {
    event = webhook.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ResendWebhookEvent;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error("Webhook signature verification failed", { error: message });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  log.info("Webhook received", {
    type: event.type,
    emailId: event.data.email_id,
  });

  // Find recipient by Resend message ID (not unique, so use findFirst)
  const resendMessageId = event.data.email_id;

  const recipient = await prisma.emailRecipient.findFirst({
    where: { resendMessageId },
  });

  if (!recipient) {
    log.warn("Recipient not found for webhook event", {
      resendMessageId,
      type: event.type,
    });
    // Return 200 for idempotency - webhook may be duplicate or for non-tracked email
    return NextResponse.json({ received: true });
  }

  // Process event based on type
  try {
    switch (event.type) {
      case "email.delivered":
        await handleEmailDelivered(recipient.id, resendMessageId, event);
        break;

      case "email.opened":
        await handleEmailOpened(recipient.id, resendMessageId, event);
        break;

      case "email.bounced":
        await handleEmailBounced(recipient.id, resendMessageId, event);
        break;

      case "email.complained":
        await handleEmailComplained(recipient.id, event);
        break;

      default:
        log.info("Unhandled webhook event type", { type: event.type });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log.error("Webhook handler error", {
      type: event.type,
      resendMessageId,
      error: message,
    });
    // Return 200 to prevent webhook retry storms
    return NextResponse.json({ received: true });
  }
});

/**
 * Handle email.delivered event
 * Update EmailRecipient status and timestamp
 */
async function handleEmailDelivered(
  recipientId: string,
  resendMessageId: string,
  event: ResendWebhookEvent,
): Promise<void> {
  log.info("Processing email.delivered", { recipientId, resendMessageId });

  await prisma.emailRecipient.update({
    where: { id: recipientId },
    data: {
      status: "DELIVERED",
      deliveredAt: new Date(),
    },
  });

  await prisma.emailEvent.create({
    data: {
      recipientId,
      eventType: "DELIVERED",
      payload: event as unknown as Prisma.InputJsonValue,
      receivedAt: new Date(),
    },
  });

  log.info("Email delivered", { recipientId });
}

/**
 * Handle email.opened event
 * Update EmailRecipient status and timestamp
 */
async function handleEmailOpened(
  recipientId: string,
  resendMessageId: string,
  event: ResendWebhookEvent,
): Promise<void> {
  log.info("Processing email.opened", { recipientId, resendMessageId });

  await prisma.emailRecipient.update({
    where: { id: recipientId },
    data: {
      status: "OPENED",
      openedAt: new Date(),
    },
  });

  await prisma.emailEvent.create({
    data: {
      recipientId,
      eventType: "OPENED",
      payload: event as unknown as Prisma.InputJsonValue,
      receivedAt: new Date(),
    },
  });

  log.info("Email opened", { recipientId });
}

/**
 * Handle email.bounced event
 * Update EmailRecipient status and timestamp
 */
async function handleEmailBounced(
  recipientId: string,
  resendMessageId: string,
  event: ResendWebhookEvent,
): Promise<void> {
  log.info("Processing email.bounced", { recipientId, resendMessageId });

  await prisma.emailRecipient.update({
    where: { id: recipientId },
    data: {
      status: "BOUNCED",
      bouncedAt: new Date(),
    },
  });

  await prisma.emailEvent.create({
    data: {
      recipientId,
      eventType: "BOUNCED",
      payload: event as unknown as Prisma.InputJsonValue,
      receivedAt: new Date(),
    },
  });

  log.info("Email bounced", { recipientId });
}

/**
 * Handle email.complained event
 * Create EmailEvent record (no status update - complaint is an event, not a delivery status)
 */
async function handleEmailComplained(
  recipientId: string,
  event: ResendWebhookEvent,
): Promise<void> {
  log.info("Processing email.complained", { recipientId });

  await prisma.emailEvent.create({
    data: {
      recipientId,
      eventType: "COMPLAINED",
      payload: event as unknown as Prisma.InputJsonValue,
      receivedAt: new Date(),
    },
  });

  log.info("Email complaint recorded", { recipientId });
}
