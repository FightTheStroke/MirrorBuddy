/**
 * Dunning Service - Handle failed payments with grace period and email notifications
 *
 * Grace Period: 7 days
 * Notifications: Day 1, Day 3, Day 7
 * After 7 days: Auto-downgrade to Base tier
 */

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { Resend } from "resend";

let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!resendInstance) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

interface DunningNotification {
  userId: string;
  email: string;
  subscriptionId: string;
  daysSinceFailure: number;
  amountDue: number;
}

export class DunningService {
  async handlePaymentFailure(params: {
    userId: string;
    subscriptionId: string;
    amountDue: number;
  }): Promise<void> {
    const { userId, subscriptionId, amountDue } = params;

    const gracePeriodEnd = new Date();
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);

    await prisma.userSubscription.update({
      where: { userId },
      data: {
        status: "PAUSED",
        expiresAt: gracePeriodEnd,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (user?.email) {
      await this.sendDunningEmail({
        userId,
        email: user.email,
        subscriptionId,
        daysSinceFailure: 1,
        amountDue,
      });
    }

    logger.info("Payment failure handled, grace period started", {
      userId,
      gracePeriodEnd,
    });
  }

  async processGracePeriodExpired(): Promise<void> {
    const expiredSubs = await prisma.userSubscription.findMany({
      where: {
        status: "PAUSED",
        expiresAt: {
          lte: new Date(),
        },
      },
      include: {
        user: { select: { email: true } },
      },
    });

    const baseTier = await prisma.tierDefinition.findUnique({
      where: { code: "base" },
    });

    if (!baseTier) {
      logger.error(
        "Base tier not found, cannot downgrade expired subscriptions",
      );
      return;
    }

    for (const sub of expiredSubs) {
      await prisma.userSubscription.update({
        where: { id: sub.id },
        data: {
          tierId: baseTier.id,
          status: "CANCELLED",
          expiresAt: new Date(),
        },
      });

      if (sub.user.email) {
        await this.sendDowngradeEmail(sub.user.email);
      }

      logger.info("Subscription downgraded after grace period", {
        userId: sub.userId,
      });
    }
  }

  async sendDunningReminders(): Promise<void> {
    const now = new Date();
    const pausedSubs = await prisma.userSubscription.findMany({
      where: {
        status: "PAUSED",
        expiresAt: {
          gt: now,
        },
      },
      include: {
        user: { select: { email: true } },
      },
    });

    for (const sub of pausedSubs) {
      if (!sub.expiresAt || !sub.user.email) continue;

      const daysSinceFailure = Math.floor(
        (now.getTime() - sub.updatedAt.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysSinceFailure === 3 || daysSinceFailure === 7) {
        await this.sendDunningEmail({
          userId: sub.userId,
          email: sub.user.email,
          subscriptionId: sub.stripeSubscriptionId || "",
          daysSinceFailure,
          amountDue: 999,
        });
      }
    }
  }

  private async sendDunningEmail(params: DunningNotification): Promise<void> {
    const { email, daysSinceFailure, amountDue } = params;

    const subject =
      daysSinceFailure === 1
        ? "Payment Failed - Action Required"
        : daysSinceFailure === 3
          ? "Reminder: Payment Failed - 4 Days Remaining"
          : "Final Notice: Payment Failed - Grace Period Expiring Today";

    const html = `
      <h1>Payment Failed</h1>
      <p>Your recent payment of €${(amountDue / 100).toFixed(2)} failed.</p>
      <p>Days remaining in grace period: ${7 - daysSinceFailure}</p>
      <p>Please update your payment method to avoid service interruption.</p>
      <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard">Update Payment Method</a>
    `;

    try {
      await getResend().emails.send({
        from: "MirrorBuddy <noreply@mirrorbuddy.app>",
        to: email,
        subject,
        html,
      });

      logger.info("Dunning email sent", { email, daysSinceFailure });
    } catch (error) {
      logger.error("Failed to send dunning email", {
        email,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  private async sendDowngradeEmail(email: string): Promise<void> {
    const html = `
      <h1>Subscription Downgraded</h1>
      <p>Your Pro subscription has been downgraded to Base due to payment failure.</p>
      <p>You can upgrade again anytime from your dashboard.</p>
      <a href="${process.env.NEXT_PUBLIC_BASE_URL}/pricing">View Pricing</a>
    `;

    try {
      await getResend().emails.send({
        from: "MirrorBuddy <noreply@mirrorbuddy.app>",
        to: email,
        subject: "Subscription Downgraded",
        html,
      });
    } catch (error) {
      logger.error("Failed to send downgrade email", {
        email,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}

export const dunningService = new DunningService();
