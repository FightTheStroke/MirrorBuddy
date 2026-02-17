/**
 * Waitlist Campaign Helpers
 * GDPR-compliant waitlist recipient querying and processing for email campaigns.
 */

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { Prisma } from '@prisma/client';

/** Waitlist-specific recipient filter criteria */
export interface WaitlistRecipientFilters {
  locales?: string[];
  isTestData?: boolean;
}

/** Waitlist recipient preview sample */
export interface WaitlistLeadSample {
  id: string;
  email: string;
  name: string | null;
}

/** Build Prisma where clause for waitlist entries with GDPR enforcement */
export function buildWaitlistRecipientQuery(
  filters: WaitlistRecipientFilters,
): Prisma.WaitlistEntryWhereInput {
  const where: Prisma.WaitlistEntryWhereInput = {
    // GDPR: must have marketing consent
    marketingConsent: true,
    // GDPR: must be verified
    verifiedAt: { not: null },
    // GDPR: must not have unsubscribed
    unsubscribedAt: null,
  };

  if (filters.locales && filters.locales.length > 0) {
    where.locale = { in: filters.locales };
  }

  if (filters.isTestData !== undefined) {
    where.isTestData = filters.isTestData;
  }

  return where;
}

/** Process waitlist recipients for a campaign, returning sent/failed counts */
export async function processWaitlistRecipients(params: {
  campaignId: string;
  templateId: string;
  templateCategory: string;
  filters: WaitlistRecipientFilters;
  renderTemplate: (
    id: string,
    vars: Record<string, string>,
  ) => Promise<{ subject: string; htmlBody: string; textBody: string }>;
  sendEmail: (opts: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }) => Promise<{ success: boolean; messageId?: string; error?: string }>;
  appUrl: string;
  currentDate: string;
  currentYear: string;
}): Promise<{ sentCount: number; failedCount: number }> {
  const {
    campaignId,
    templateId,
    filters,
    renderTemplate,
    sendEmail,
    appUrl,
    currentDate,
    currentYear,
  } = params;

  const where = buildWaitlistRecipientQuery(filters);
  const leads = await prisma.waitlistEntry.findMany({
    where,
    take: 10000,
    select: {
      id: true,
      email: true,
      name: true,
      locale: true,
      promoCode: true,
      unsubscribeToken: true,
    },
  });

  logger.info('Waitlist recipients loaded', { campaignId, count: leads.length });

  let sentCount = 0;
  let failedCount = 0;

  for (const lead of leads) {
    try {
      const unsubscribeUrl = `${appUrl}/unsubscribe?token=${lead.unsubscribeToken}&source=waitlist`;

      const variables: Record<string, string> = {
        name: lead.name || lead.email,
        email: lead.email,
        locale: lead.locale,
        promoCode: lead.promoCode || '',
        appUrl,
        unsubscribeUrl,
        currentDate,
        currentYear,
      };

      const rendered = await renderTemplate(templateId, variables);
      const gdprFooter =
        `<hr><p style='font-size:12px;color:#666;'>` +
        `Legal basis: Consent. <a href='${unsubscribeUrl}'>Unsubscribe</a>. ` +
        `MirrorBuddy - Educational Platform.</p>`;
      const htmlWithFooter = rendered.htmlBody + gdprFooter;

      const result = await sendEmail({
        to: lead.email,
        subject: rendered.subject,
        html: htmlWithFooter,
        text: rendered.textBody,
      });

      await prisma.emailRecipient.create({
        data: {
          campaignId,
          userId: null,
          email: lead.email,
          status: result.success ? 'SENT' : 'FAILED',
          resendMessageId: result.messageId,
          sentAt: result.success ? new Date() : null,
        },
      });

      if (result.success) {
        sentCount++;
        logger.info('Waitlist email sent', {
          campaignId,
          leadId: lead.id,
          messageId: result.messageId,
        });
      } else {
        failedCount++;
        logger.error('Waitlist email failed', { campaignId, leadId: lead.id, error: result.error });
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      failedCount++;
      logger.error('Error sending to waitlist lead', {
        campaignId,
        leadId: lead.id,
        error: String(error),
      });
      await prisma.emailRecipient.create({
        data: {
          campaignId,
          userId: null,
          email: lead.email,
          status: 'FAILED',
        },
      });
    }
  }

  return { sentCount, failedCount };
}
