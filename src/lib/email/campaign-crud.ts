/**
 * Email Campaign CRUD Operations
 * Create, read, and list email campaigns.
 */

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { Prisma } from '@prisma/client';
import type { EmailCampaign, CampaignListFilters, RecipientFilters } from './campaign-service';

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

    logger.info('Email campaign created', { id: campaign.id, name: campaign.name, adminId });
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
      include: { template: true },
    });

    if (!campaign) return null;
    return campaign as EmailCampaign;
  } catch (error) {
    logger.error('Error fetching email campaign', { id, error: String(error) });
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
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: { template: true },
    });

    return campaigns as EmailCampaign[];
  } catch (error) {
    logger.error('Error listing email campaigns', { filters, error: String(error) });
    throw error;
  }
}
