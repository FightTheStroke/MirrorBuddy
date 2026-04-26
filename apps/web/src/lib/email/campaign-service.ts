/**
 * Email Campaign Service
 * Manages email campaigns with recipient filtering and preview functionality.
 */

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { Prisma } from '@prisma/client';

/** Recipient source for campaign sending */
export type CampaignSource = 'users' | 'waitlist' | 'both';

/** Waitlist-specific filter criteria */
export interface WaitlistFilters {
  locales?: string[];
}

/** Recipient filter criteria for targeting user segments */
export interface RecipientFilters {
  recipientSource?: CampaignSource;
  // User filters
  tiers?: string[];
  roles?: string[];
  languages?: string[];
  schoolLevels?: string[];
  disabled?: boolean;
  isTestData?: boolean;
  // Waitlist filters
  verifiedOnly?: boolean;
  marketingConsentOnly?: boolean;
}

/** Campaign list filter options */
export interface CampaignListFilters {
  status?: 'DRAFT' | 'SENDING' | 'SENT' | 'FAILED';
}

/** Campaign data structure */
export interface EmailCampaign {
  id: string;
  name: string;
  templateId: string;
  filters: RecipientFilters;
  status: string;
  sentCount: number;
  failedCount: number;
  createdAt: Date;
  sentAt: Date | null;
  adminId: string;
  template?: {
    id: string;
    name: string;
    subject: string;
    htmlBody: string;
    textBody: string;
    category: string;
    variables: unknown;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
}

/** Recipient preview result with optional dual-source breakdown */
export interface RecipientPreview {
  totalCount: number;
  /** User count when source includes users (undefined for waitlist-only) */
  userCount?: number;
  /** Waitlist lead count when source includes waitlist */
  waitlistCount?: number;
  sampleUsers: Array<{
    id: string;
    email: string | null;
    name: string | null;
  }>;
  /** Sample waitlist leads when source includes waitlist */
  sampleWaitlistLeads?: Array<{
    id: string;
    email: string;
    name: string | null;
  }>;
}

/** Build Prisma where clause from recipient filters */
export function buildRecipientQuery(filters: RecipientFilters): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {};

  // Filter by subscription tier
  if (filters.tiers && filters.tiers.length > 0) {
    where.subscription = {
      tier: {
        code: {
          in: filters.tiers,
        },
      },
    };
  }

  // Filter by user role
  if (filters.roles && filters.roles.length > 0) {
    where.role = {
      in: filters.roles as Array<'USER' | 'ADMIN'>,
    };
  }

  // Filter by language preference
  if (filters.languages && filters.languages.length > 0) {
    where.settings = {
      language: {
        in: filters.languages,
      },
    };
  }

  // Filter by school level
  if (filters.schoolLevels && filters.schoolLevels.length > 0) {
    where.profile = {
      schoolLevel: {
        in: filters.schoolLevels,
      },
    };
  }

  // Filter by disabled status
  if (filters.disabled !== undefined) {
    where.disabled = filters.disabled;
  }

  // Filter by test data flag
  if (filters.isTestData !== undefined) {
    where.isTestData = filters.isTestData;
  }

  return where;
}

/** Build Prisma where clause for WaitlistEntry recipients (GDPR: verified + not unsubscribed) */
export function buildWaitlistRecipientQuery(filters: WaitlistFilters): Record<string, unknown> {
  const where: Record<string, unknown> = {
    verifiedAt: { not: null },
    unsubscribedAt: null,
  };

  if (filters.locales && filters.locales.length > 0) {
    where.locale = { in: filters.locales };
  }

  return where;
}

/** Get recipient preview with count and samples; supports dual source (users + waitlist) */
export async function getRecipientPreview(
  filters: RecipientFilters,
  source?: CampaignSource,
): Promise<RecipientPreview> {
  try {
    const includesUsers = !source || source === 'users' || source === 'both';
    const includesWaitlist = source === 'waitlist' || source === 'both';

    let userCount = 0;
    let sampleUsers: Array<{ id: string; email: string | null; name: string | null }> = [];

    if (includesUsers) {
      const userWhere = buildRecipientQuery(filters);
      const [count, users] = await Promise.all([
        prisma.user.count({ where: userWhere }),
        prisma.user.findMany({
          where: userWhere,
          take: 10,
          select: { id: true, email: true, profile: { select: { name: true } } },
        }),
      ]);
      userCount = count;
      sampleUsers = users.map((u) => ({ id: u.id, email: u.email, name: u.profile?.name ?? null }));
    }

    if (!includesWaitlist) {
      return { totalCount: userCount, sampleUsers };
    }

    // Dual source: query waitlist leads with GDPR filters
    const wlWhere = buildWaitlistRecipientQuery({});
    const [waitlistCount, waitlistLeads] = await Promise.all([
      prisma.waitlistEntry.count({ where: wlWhere }),
      prisma.waitlistEntry.findMany({
        where: wlWhere,
        take: 10,
        select: { id: true, email: true, name: true },
      }),
    ]);

    const sampleWaitlistLeads = waitlistLeads.map((l) => ({
      id: l.id,
      email: l.email,
      name: l.name ?? null,
    }));

    return {
      totalCount: userCount + waitlistCount,
      userCount,
      waitlistCount,
      sampleUsers,
      sampleWaitlistLeads,
    };
  } catch (error) {
    logger.error('Error getting recipient preview', { filters, error: String(error) });
    throw error;
  }
}

/** Create a new email campaign in DRAFT status */
export async function createCampaign(
  name: string,
  templateId: string,
  filters: RecipientFilters,
  adminId: string,
): Promise<EmailCampaign> {
  try {
    const campaign = await prisma.emailCampaign.create({
      data: {
        name,
        templateId,
        filters: filters as Prisma.InputJsonValue,
        status: 'DRAFT',
        adminId,
      },
    });

    logger.info('Email campaign created', {
      id: campaign.id,
      name: campaign.name,
      adminId,
    });

    return campaign as EmailCampaign;
  } catch (error) {
    logger.error('Error creating email campaign', {
      name,
      templateId,
      adminId,
      error: String(error),
    });
    throw error;
  }
}

/** Get a single campaign by ID with template details */
export async function getCampaign(id: string): Promise<EmailCampaign | null> {
  try {
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id },
      include: {
        template: true,
      },
    });

    if (!campaign) {
      return null;
    }

    return campaign as EmailCampaign;
  } catch (error) {
    logger.error('Error fetching email campaign', {
      id,
      error: String(error),
    });
    throw error;
  }
}

/** List campaigns with optional status filter, ordered by createdAt DESC */
export async function listCampaigns(filters?: CampaignListFilters): Promise<EmailCampaign[]> {
  try {
    const where: Prisma.EmailCampaignWhereInput = {};
    if (filters?.status) {
      where.status = filters.status;
    }

    const campaigns = await prisma.emailCampaign.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: 500,
      include: {
        template: true,
      },
    });

    return campaigns as EmailCampaign[];
  } catch (error) {
    logger.error('Error listing email campaigns', {
      filters,
      error: String(error),
    });
    throw error;
  }
}

/** Send email campaign to recipients with quota checking and preference validation */
export async function sendCampaign(campaignId: string, source?: CampaignSource): Promise<void> {
  try {
    // Load campaign with template
    const campaign = await getCampaign(campaignId);
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    if (!campaign.template) {
      throw new Error(`Campaign template not found for campaign: ${campaignId}`);
    }

    logger.info('Starting campaign send', {
      campaignId,
      campaignName: campaign.name,
      templateId: campaign.template.id,
    });

    // Determine effective source (parameter overrides campaign field)
    const effectiveSource: CampaignSource =
      source ??
      ((campaign as unknown as Record<string, unknown>).source as CampaignSource) ??
      'users';

    // Get user recipients (unless source is waitlist-only)
    const recipients =
      effectiveSource === 'waitlist'
        ? []
        : await prisma.user.findMany({
            where: buildRecipientQuery(campaign.filters as RecipientFilters),
            take: 10000,
            select: {
              id: true,
              email: true,
              username: true,
              profile: { select: { name: true, schoolLevel: true, gradeLevel: true, age: true } },
              settings: { select: { language: true } },
              subscription: { select: { tier: { select: { code: true } } } },
            },
          });

    // Get waitlist recipients when source includes waitlist
    const waitlistRecipients =
      effectiveSource === 'waitlist' || effectiveSource === 'both'
        ? await prisma.waitlistEntry.findMany({
            where: buildWaitlistRecipientQuery({}),
            take: 10000,
            select: {
              id: true,
              email: true,
              name: true,
              locale: true,
              unsubscribeToken: true,
              promoCode: true,
            },
          })
        : [];

    logger.info('Recipients loaded', {
      campaignId,
      recipientCount: recipients.length,
      waitlistCount: waitlistRecipients.length,
    });

    // Check quota
    const { getResendLimits } = await import('@/lib/observability/resend-limits');
    const limits = await getResendLimits();

    const availableQuota = Math.min(
      limits.emailsToday.limit - limits.emailsToday.used,
      limits.emailsMonth.limit - limits.emailsMonth.used,
    );

    const totalNeeded = recipients.length + waitlistRecipients.length;
    if (totalNeeded > availableQuota) {
      throw new Error(`Insufficient email quota: need ${totalNeeded}, available ${availableQuota}`);
    }

    logger.info('Quota check passed', {
      campaignId,
      needed: totalNeeded,
      available: availableQuota,
    });

    // Update campaign status to SENDING
    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'SENDING',
      },
    });

    // Import dependencies
    const { canSendTo, getPreferences } = await import('./preference-service');
    const { renderTemplate } = await import('./template-service');
    const { sendEmail } = await import('./index');

    // Validate template category maps to a known preference key
    const validCategories = ['productUpdates', 'educationalNewsletter', 'announcements'];
    const emailCategory = validCategories.includes(campaign.template.category)
      ? (campaign.template.category as 'productUpdates' | 'educationalNewsletter' | 'announcements')
      : 'announcements'; // Fallback to announcements for unmapped categories

    // Process recipients sequentially
    let sentCount = 0;
    let failedCount = 0;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mirrorbuddy.com';
    const currentDate = new Date().toLocaleDateString('it-IT');
    const currentYear = new Date().getFullYear().toString();

    for (const recipient of recipients) {
      try {
        // Skip if no email
        if (!recipient.email) {
          logger.warn('Recipient has no email, skipping', {
            campaignId,
            userId: recipient.id,
          });

          await prisma.emailRecipient.create({
            data: {
              campaignId,
              userId: recipient.id,
              email: recipient.email || 'no-email@unknown.com',
              status: 'FAILED',
            },
          });

          failedCount++;
          continue;
        }

        // Check if can send to this user (creates default prefs if missing)
        const canSend = await canSendTo(recipient.id, emailCategory);

        if (!canSend) {
          logger.info('User has opted out, skipping', {
            campaignId,
            userId: recipient.id,
            category: emailCategory,
          });

          await prisma.emailRecipient.create({
            data: {
              campaignId,
              userId: recipient.id,
              email: recipient.email,
              status: 'FAILED',
            },
          });

          failedCount++;
          continue;
        }

        // Re-fetch preferences to get valid token (canSendTo may have created defaults)
        const preferences = await getPreferences(recipient.id);
        const unsubscribeToken = preferences?.unsubscribeToken || 'no-token';
        const unsubscribeUrl = `${appUrl}/unsubscribe?token=${unsubscribeToken}&category=${emailCategory}`;

        // Prepare template variables
        const variables: Record<string, string> = {
          name: recipient.profile?.name || recipient.username || 'User',
          email: recipient.email,
          username: recipient.username || '',
          tier: recipient.subscription?.tier?.code || 'trial',
          schoolLevel: recipient.profile?.schoolLevel || '',
          gradeLevel: recipient.profile?.gradeLevel?.toString() || '',
          age: recipient.profile?.age?.toString() || '',
          language: recipient.settings?.language || 'it',
          appUrl,
          unsubscribeUrl,
          currentDate,
          currentYear,
        };

        // Render template
        const rendered = await renderTemplate(campaign.template.id, variables);

        // Add GDPR footer to HTML body
        const gdprFooter = `<hr><p style='font-size:12px;color:#666;'>Legal basis: Legitimate interest. <a href='${unsubscribeUrl}'>Unsubscribe</a>. MirrorBuddy - Educational Platform.</p>`;
        const htmlBodyWithFooter = rendered.htmlBody + gdprFooter;

        // Send email
        const result = await sendEmail({
          to: recipient.email,
          subject: rendered.subject,
          html: htmlBodyWithFooter,
          text: rendered.textBody,
        });

        // Create EmailRecipient record
        const recipientRecord = await prisma.emailRecipient.create({
          data: {
            campaignId,
            userId: recipient.id,
            email: recipient.email,
            status: result.success ? 'SENT' : 'FAILED',
            resendMessageId: result.messageId,
            sentAt: result.success ? new Date() : null,
          },
        });

        if (result.success) {
          sentCount++;
          logger.info('Email sent successfully', {
            campaignId,
            recipientId: recipientRecord.id,
            userId: recipient.id,
            messageId: result.messageId,
          });
        } else {
          failedCount++;
          logger.error('Email send failed', {
            campaignId,
            recipientId: recipientRecord.id,
            userId: recipient.id,
            error: result.error,
          });
        }

        // Rate limiting: 100ms delay between emails
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        failedCount++;
        logger.error('Error sending email to recipient', {
          campaignId,
          userId: recipient.id,
          error: String(error),
        });

        // Create failed recipient record
        await prisma.emailRecipient.create({
          data: {
            campaignId,
            userId: recipient.id,
            email: recipient.email ?? '',
            status: 'FAILED',
          },
        });
      }
    }

    // Process waitlist leads (no preference check required — consent given at signup)
    for (const lead of waitlistRecipients) {
      try {
        // GDPR guard: skip if unsubscribed (defensive check in case query missed it)
        if ((lead as unknown as Record<string, unknown>).unsubscribedAt) {
          failedCount++;
          continue;
        }

        if (!lead.email) {
          failedCount++;
          continue;
        }

        const unsubscribeUrl = `${appUrl}/unsubscribe?token=${lead.unsubscribeToken}&type=waitlist`;
        const variables: Record<string, string> = {
          name: lead.name ?? 'User',
          email: lead.email,
          promoCode: lead.promoCode ?? '',
          language: ((lead as unknown as Record<string, unknown>).locale as string) ?? 'it',
          appUrl,
          unsubscribeUrl,
          currentDate,
          currentYear,
        };

        const rendered = await renderTemplate(campaign.template!.id, variables);
        const gdprFooter = `<hr><p style='font-size:12px;color:#666;'>Legal basis: Consent. <a href='${unsubscribeUrl}'>Unsubscribe</a>. MirrorBuddy - Educational Platform.</p>`;
        const result = await sendEmail({
          to: lead.email,
          subject: rendered.subject,
          html: rendered.htmlBody + gdprFooter,
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
        } else {
          failedCount++;
        }

        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        failedCount++;
        logger.error('Error sending email to waitlist lead', {
          campaignId,
          leadEmail: lead.email,
          error: String(error),
        });
      }
    }

    // Update campaign with final status
    const finalStatus = sentCount > 0 ? 'SENT' : 'FAILED';
    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        status: finalStatus,
        sentCount,
        failedCount,
        sentAt: sentCount > 0 ? new Date() : null,
      },
    });

    logger.info('Campaign send completed', {
      campaignId,
      status: finalStatus,
      sentCount,
      failedCount,
      totalRecipients: recipients.length,
    });
  } catch (error) {
    logger.error('Critical error in campaign send', {
      campaignId,
      error: String(error),
    });

    // Mark campaign as FAILED
    try {
      await prisma.emailCampaign.update({
        where: { id: campaignId },
        data: {
          status: 'FAILED',
        },
      });
    } catch (updateError) {
      logger.error('Failed to update campaign status to FAILED', {
        campaignId,
        error: String(updateError),
      });
    }

    throw error;
  }
}
