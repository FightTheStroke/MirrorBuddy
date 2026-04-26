/**
 * Stripe Settings Service
 *
 * Payment kill switch via GlobalConfig.paymentsEnabled.
 * Read/write via Prisma.
 */

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { PaymentSettings } from './stripe-admin-types';

const log = logger.child({ module: 'stripe-settings' });

export async function getPaymentSettings(): Promise<PaymentSettings> {
  const config = await prisma.globalConfig.findFirst({
    where: { id: 'global' },
  });

  return {
    paymentsEnabled: config?.paymentsEnabled ?? false,
    updatedAt: config?.updatedAt?.toISOString() ?? new Date().toISOString(),
    updatedBy: config?.updatedBy ?? null,
  };
}

export async function updatePaymentSettings(
  enabled: boolean,
  adminId: string,
): Promise<PaymentSettings> {
  const config = await prisma.globalConfig.upsert({
    where: { id: 'global' },
    update: {
      paymentsEnabled: enabled,
      updatedBy: adminId,
    },
    create: {
      id: 'global',
      paymentsEnabled: enabled,
      updatedBy: adminId,
    },
  });

  log.info('Payment settings updated', {
    paymentsEnabled: enabled,
    adminId,
  });

  return {
    paymentsEnabled: config.paymentsEnabled,
    updatedAt: config.updatedAt.toISOString(),
    updatedBy: config.updatedBy,
  };
}
